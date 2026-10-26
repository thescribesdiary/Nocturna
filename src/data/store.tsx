// Archivio condiviso di Nocturna: legge in tempo reale tutte le sezioni da Firestore
// (users/{uid}/{sezione}/{documento}) e offre le operazioni di scrittura a tutta l'app.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ColsConfig, ORDER, Rec, Section } from './sections';
import { notifyFields, touchesReminders } from './reminders';

export type Theme = 'scuro' | 'contrasto' | 'chiaro';
export type Prefs = { theme: Theme; summaryOnOpen: boolean };
export type Profile = { name: string; bio: string; avatar: string };
export type SyncState = 'sincronia' | 'attesa' | 'offline';
export type TrashEntry = { section: Section; rec: Rec };

const DEFAULT_PREFS: Prefs = { theme: 'scuro', summaryOnOpen: true };
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
  update: (s: Section, id: string, patch: Record<string, any>) => void;
  trashIt: (s: Section, id: string) => void;
  restore: (s: Section, id: string) => void;
  destroy: (s: Section, id: string) => void;
  emptyTrash: () => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setProfile: (p: Partial<Profile>) => void;
  setCols: (s: Section, cols: ColsConfig[Section]) => void;
  toast: string;
  say: (msg: string) => void;
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
  const rawRef = useRef(raw);
  rawRef.current = raw;
  const colsRef = useRef<ColsConfig>({});
  const tRef = useRef<number>();

  const say = useCallback((msg: string) => {
    window.clearTimeout(tRef.current);
    setToast(msg);
    tRef.current = window.setTimeout(() => setToast(''), 2800);
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

  const trashIt: Store['trashIt'] = (s, id) => update(s, id, { deletedAt: Date.now() });
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
  const setCols: Store['setCols'] = (s, c) => {
    setDoc(doc(db, 'users', uid, 'impostazioni', 'colonne'), { [s]: c, updatedAt: serverTimestamp() }, { merge: true }).catch(fail);
  };

  const ready = ORDER.every((s) => loaded[s]) && !!loaded.impostazioni;
  const anyPending = Object.values(pending).some(Boolean);
  const sync: SyncState = !online ? 'offline' : anyPending ? 'attesa' : 'sincronia';

  const value: Store = {
    uid, ready, docs, trash, prefs, profile, cols, sync,
    newId, create, update, trashIt, restore, destroy, emptyTrash, setPrefs, setProfile, setCols,
    toast, say,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
