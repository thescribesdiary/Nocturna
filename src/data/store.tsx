// Archivio condiviso di Nocturna: legge in tempo reale tutte le sezioni da Firestore
// (users/{uid}/{sezione}/{documento}) e offre le operazioni di scrittura a tutta l'app.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, deleteDoc, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ColsConfig, ORDER, Rec, Section, isDone } from './sections';
import { notifyFields, touchesReminders } from './reminders';
import { LetturaCfg, letturaCfg, setLetturaCfg } from './schema';
import { decideSpawn } from '../lib/recurrence';

export type Theme = 'scuro' | 'contrasto' | 'chiaro';
export type Prefs = { theme: Theme; summaryOnOpen: boolean; lessonsOnHome: boolean; autoTrash: boolean };
export type Profile = { name: string; bio: string; avatar: string };
export type SyncState = 'sincronia' | 'attesa' | 'offline';
export type TrashEntry = { section: Section; rec: Rec };

const DEFAULT_PREFS: Prefs = { theme: 'scuro', summaryOnOpen: true, lessonsOnHome: false, autoTrash: false };
const THEME_KEY = 'nocturna-theme';
export const cachedTheme = (): Theme => {
  try { return (localStorage.getItem(THEME_KEY) as Theme) || 'scuro'; } catch { return 'scuro'; }
};

export type Store = {
  uid: string;
  ready: boolean;
  docs: Record<Section, Rec[]>;
  trash: TrashEntry[];
  prefs: Prefs;
  profile: Profile;
  cols: ColsConfig;
  sync: SyncState;
  newId: (s: Section) => string;
  create: (s: Section, data: Omit<Rec, 'id'> & { id?: string }) => string;
  /** Crea l'occorrenza successiva di una ricorrenza una sola volta, anche con più dispositivi (transazione). */
  spawnOnce: (s: Section, sourceId: string, data: Rec) => Promise<'creata' | 'esistente' | 'senza-rete' | 'errore'>;
  update: (s: Section, id: string, patch: Record<string, any>) => void;
  trashIt: (s: Section, id: string) => void;
  /** Come trashIt, ma avvisa se ci sono elementi collegati. Restituisce false se l'utente rinuncia. */
  removeRec: (s: Section, id: string) => boolean;
  restore: (s: Section, id: string) => void;
  destroy: (s: Section, id: string) => void;
  emptyTrash: () => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setProfile: (p: Partial<Profile>) => void;
  setCols: (s: Section, cols: ColsConfig[Section]) => void;
  /** Tipi di attività e canali di Lettura (modificabili da Impostazioni). */
  lcfg: LetturaCfg;
  setLcfg: (c: LetturaCfg) => void;
  toast: string;
  toastUndo: (() => void) | null;
  say: (msg: string, undo?: () => void) => void;
};

export const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuori dal DataProvider');
  return s;
};

const empty = (): Record<Section, Rec[]> => ({ scuola: [], lavoro: [], lettura: [], scrittura: [] });

export function DataProvider({ uid, onDenied, children }: { uid: string; onDenied?: () => void; children: React.ReactNode }) {
  const [raw, setRaw] = useState<Record<Section, Rec[]>>(empty);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState('');
  const [toastUndo, setToastUndo] = useState<(() => void) | null>(null);
  const lastTrashAt = useRef(0);
  const rawRef = useRef(raw);
  rawRef.current = raw;
  const colsRef = useRef<ColsConfig>({});
  const tRef = useRef<number>();

  const say = useCallback((msg: string, undo?: () => void) => {
    // Il messaggio «nel cestino» dei chiamanti non deve coprire quello con «Annulla».
    if (!undo && /cestino/i.test(msg) && Date.now() - lastTrashAt.current < 800) return;
    window.clearTimeout(tRef.current);
    setToast(msg);
    setToastUndo(() => undo || null);
    tRef.current = window.setTimeout(() => { setToast(''); setToastUndo(null); }, undo ? 6000 : 2800);
  }, []);
  const fail = useCallback((e: any) => {
    console.error(e);
    say(e?.code === 'permission-denied' ? 'Accesso negato: questo account non può modificare i dati.' : 'Salvataggio non riuscito. Riprova tra poco.');
  }, [say]);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const onErr = useCallback((e: any) => {
    if (e?.code === 'permission-denied' && onDenied) onDenied();
    else fail(e);
  }, [fail, onDenied]);

  useEffect(() => {
    const unsubs = ORDER.map((s) =>
      onSnapshot(collection(db, 'users', uid, s), { includeMetadataChanges: true }, (snap) => {
        setRaw((r) => ({ ...r, [s]: snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) }));
        setLoaded((l) => (l[s] ? l : { ...l, [s]: true }));
        setPending((p) => ({ ...p, [s]: snap.metadata.hasPendingWrites || snap.metadata.fromCache }));
      }, onErr),
    );
    unsubs.push(
      onSnapshot(collection(db, 'users', uid, 'impostazioni'), { includeMetadataChanges: true }, (snap) => {
        const o: Record<string, any> = {};
        snap.docs.forEach((d) => (o[d.id] = d.data()));
        setSettings(o);
        setLoaded((l) => (l.impostazioni ? l : { ...l, impostazioni: true }));
        setPending((p) => ({ ...p, impostazioni: snap.metadata.hasPendingWrites || snap.metadata.fromCache }));
      }, onErr),
    );
    return () => unsubs.forEach((u) => u());
  }, [uid, onErr]);

  const prefs: Prefs = { ...DEFAULT_PREFS, ...(settings.preferenze || {}) };
  const profile: Profile = { name: '', bio: '', avatar: '', ...(settings.profilo || {}) };
  const cols: ColsConfig = settings.colonne || {};
  colsRef.current = cols;
  // I moduli leggono tipi e canali di Lettura dal registro dello schema: lo aggiorniamo qui.
  setLetturaCfg(settings.lettura);
  const lcfg = letturaCfg();

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, prefs.theme); } catch {}
  }, [prefs.theme]);

  const docs = useMemo(() => {
    const o = empty();
    ORDER.forEach((s) => (o[s] = raw[s].filter((x) => !x.deletedAt)));
    return o;
  }, [raw]);
  const trash = useMemo(() => {
    const t: TrashEntry[] = [];
    ORDER.forEach((s) => raw[s].forEach((rec) => rec.deletedAt && t.push({ section: s, rec })));
    return t.sort((a, b) => (b.rec.deletedAt || 0) - (a.rec.deletedAt || 0));
  }, [raw]);

  const ref = (s: Section, id: string) => doc(db, 'users', uid, s, id);
  const newId = (s: Section) => doc(collection(db, 'users', uid, s)).id;

  const spawnOnce: Store['spawnOnce'] = async (s, sourceId, data) => {
    const rec = { ...data, deletedAt: null } as Rec;
    const { id, ...body } = rec;
    const full = { ...body, ...notifyFields(s, rec, colsRef.current), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    try {
      return await runTransaction(db, async (tx) => {
        const src = await tx.get(ref(s, sourceId));
        const next = await tx.get(ref(s, id));
        const d = decideSpawn({ exists: src.exists(), spawnedNext: src.data()?.spawnedNext }, next.exists());
        if (d.markSource) tx.update(ref(s, sourceId), { spawnedNext: true, updatedAt: serverTimestamp() });
        if (d.createNext) tx.set(ref(s, id), full);
        return d.createNext ? 'creata' : 'esistente';
      });
    } catch (e: any) {
      // Le transazioni richiedono la rete. Senza rete si torna al comportamento precedente (scrittura in coda),
      // che resta esposto alla sovrascrittura solo se un altro dispositivo completa la stessa attività nel frattempo.
      if (e?.code === 'unavailable') {
        setDoc(ref(s, id), full).catch(fail);
        updateDoc(ref(s, sourceId), { spawnedNext: true, updatedAt: serverTimestamp() }).catch(fail);
        return 'senza-rete';
      }
      fail(e);
      return 'errore';
    }
  };

  const create: Store['create'] = (s, data) => {
    const id = data.id || newId(s);
    const rec = { ...data, id, deletedAt: null } as Rec;
    const { id: _omit, ...body } = rec;
    setDoc(ref(s, id), { ...body, ...notifyFields(s, rec, colsRef.current), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(fail);
    return id;
  };

  const update: Store['update'] = (s, id, patch) => {
    const cur = rawRef.current[s].find((x) => x.id === id);
    if (!cur) return;
    const merged = { ...cur, ...patch };
    const extra = touchesReminders(patch) ? notifyFields(s, merged, colsRef.current) : {};
    updateDoc(ref(s, id), { ...patch, ...extra, updatedAt: serverTimestamp() }).catch(fail);
  };

  const trashIt: Store['trashIt'] = (s, id) => {
    update(s, id, { deletedAt: Date.now() });
    lastTrashAt.current = Date.now();
    say('Spostato nel cestino.', () => { update(s, id, { deletedAt: null }); say('Elemento ripristinato.'); });
  };
  /** Quanti elementi dipendono da questo (attività di un progetto, libro o materia). */
  const linksTo = (s: Section, id: string) => {
    const f = s === 'scuola' ? 'subject' : s === 'lettura' ? 'book' : 'project';
    return rawRef.current[s].filter((x) => !x.deletedAt && (x[f] === id || x.linkedTo === id) && x.kind !== 'progetto' && x.kind !== 'libro').length;
  };
  const removeRec: Store['removeRec'] = (s, id) => {
    const r = rawRef.current[s].find((x) => x.id === id);
    const isParent = r && ((s === 'scuola' && r.kind === 'materia') || (s === 'lettura' && r.kind === 'libro') || ((s === 'lavoro' || s === 'scrittura') && r.kind === 'progetto'));
    const n = isParent ? linksTo(s, id) : 0;
    if (n > 0 && !window.confirm('«' + (r!.title || r!.name) + '» ha ' + n + (n === 1 ? ' elemento collegato' : ' elementi collegati') + ' (attività o note) che resteranno senza collegamento. Spostarlo nel cestino?')) return false;
    trashIt(s, id);
    return true;
  };
  const restore: Store['restore'] = (s, id) => update(s, id, { deletedAt: null });
  const destroy: Store['destroy'] = (s, id) => { deleteDoc(ref(s, id)).catch(fail); };
  const emptyTrash = () => {
    // Firestore accetta al massimo 500 operazioni per gruppo.
    for (let i = 0; i < trash.length; i += 450) {
      const b = writeBatch(db);
      trash.slice(i, i + 450).forEach((t) => b.delete(ref(t.section, t.rec.id)));
      b.commit().catch(fail);
    }
  };

  const setSetting = (id: string, patch: Record<string, any>) =>
    setDoc(doc(db, 'users', uid, 'impostazioni', id), { ...patch, updatedAt: serverTimestamp() }, { merge: true }).catch(fail);
  const setPrefs = (p: Partial<Prefs>) => { setSetting('preferenze', p); };
  const setProfile = (p: Partial<Profile>) => { setSetting('profilo', p); };
  const setLcfg: Store['setLcfg'] = (c) => { setSetting('lettura', { types: c.types, channels: c.channels }); };
  const setCols: Store['setCols'] = (s, c) => {
    const before = colsRef.current, after: ColsConfig = { ...before, [s]: c };
    setDoc(doc(db, 'users', uid, 'impostazioni', 'colonne'), { [s]: c, updatedAt: serverTimestamp() }, { merge: true }).catch(fail);
    // Se cambia quali colonne valgono come «completato», ricalcoliamo i promemoria delle attività interessate:
    // altrimenti arriverebbero notifiche per attività ormai completate (o mancherebbero quelle riaperte).
    const changed = raw[s].filter((r) => !r.deletedAt && isDone(before, s, r.status) !== isDone(after, s, r.status));
    for (let i = 0; i < changed.length; i += 450) {
      const b = writeBatch(db);
      changed.slice(i, i + 450).forEach((r) => b.update(ref(s, r.id), { ...notifyFields(s, r, after) }));
      b.commit().catch(fail);
    }
  };

  // Svuotamento automatico del cestino (opzione): elimina ciò che è nel cestino da più di 30 giorni.
  const autoDone = useRef(false);
  useEffect(() => {
    if (!ORDER.every((s) => loaded[s]) || !loaded.impostazioni || autoDone.current || !prefs.autoTrash) return;
    autoDone.current = true;
    const old = trash.filter((t) => (t.rec.deletedAt || 0) < Date.now() - 30 * 86400000);
    for (let i = 0; i < old.length; i += 450) {
      const b = writeBatch(db);
      old.slice(i, i + 450).forEach((t) => b.delete(ref(t.section, t.rec.id)));
      b.commit().catch(fail);
    }
  }); // eslint-disable-line

  const ready = ORDER.every((s) => loaded[s]) && !!loaded.impostazioni;
  const anyPending = Object.values(pending).some(Boolean);
  const sync: SyncState = !online ? 'offline' : anyPending ? 'attesa' : 'sincronia';

  const value: Store = {
    uid, ready, docs, trash, prefs, profile, cols, sync,
    newId, create, spawnOnce, update, trashIt, removeRec, restore, destroy, emptyTrash, setPrefs, setProfile, setCols, lcfg, setLcfg,
    toast, toastUndo, say,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
