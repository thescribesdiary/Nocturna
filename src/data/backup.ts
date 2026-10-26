// Backup: esporta tutti i dati in un file JSON e li reimporta sostituendo quelli attuali.
import { Timestamp, collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { ColsConfig, ORDER, Rec, Section } from './sections';
import { notifyFields } from './reminders';

const STORES = [...ORDER, 'impostazioni'] as const;
const SKIP = ['notifyAt', 'notifyQueue', 'notifyKinds', 'notifiedAt', 'createdAt', 'updatedAt'];

const plain = (v: any): any => {
  if (v instanceof Timestamp) return v.toMillis();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') { const o: any = {}; Object.entries(v).forEach(([k, x]) => (o[k] = plain(x))); return o; }
  return v;
};

export async function exportBackup(uid: string) {
  const data: Record<string, any[]> = {};
  let n = 0;
  for (const s of STORES) {
    const snap = await getDocs(collection(db, 'users', uid, s));
    data[s] = snap.docs.map((d) => {
      const o: any = { id: d.id };
      Object.entries(d.data()).forEach(([k, v]) => { if (!SKIP.includes(k)) o[k] = plain(v); });
      return o;
    });
    n += data[s].length;
  }
  const json = JSON.stringify({ app: 'Nocturna', version: 1, exportedAt: new Date().toISOString(), data }, null, 1);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nocturna-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  try { localStorage.setItem('nocturna-last-backup', String(Date.now())); } catch {}
  return n;
}

export type ParsedBackup = { data: Record<string, any[]>; count: number; exportedAt: string };
export async function readBackup(file: File): Promise<ParsedBackup> {
  const j = JSON.parse(await file.text());
  if (!j || j.app !== 'Nocturna' || !j.data || typeof j.data !== 'object') throw new Error('not-nocturna');
  let count = 0;
  for (const s of STORES) {
    if (j.data[s] && !Array.isArray(j.data[s])) throw new Error('bad');
    (j.data[s] || []).forEach((x: any) => { if (!x || typeof x.id !== 'string') throw new Error('bad'); count++; });
  }
  return { data: j.data, count, exportedAt: j.exportedAt || '' };
}

/** Sostituisce tutti i dati con quelli del backup (i dispositivi per le notifiche restano). */
export async function restoreBackup(uid: string, b: ParsedBackup) {
  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
  for (const s of STORES) {
    const snap = await getDocs(collection(db, 'users', uid, s));
    snap.docs.forEach((d) => ops.push((bt) => bt.delete(d.ref)));
  }
  const cols: ColsConfig = (b.data.impostazioni || []).find((x: any) => x.id === 'colonne') || {};
  for (const s of STORES) {
    (b.data[s] || []).forEach((x: any) => {
      const { id, ...rest } = x;
      const extra = s === 'impostazioni' ? {} : notifyFields(s as Section, x as Rec, cols);
      ops.push((bt) => bt.set(doc(db, 'users', uid, s, id), { ...rest, ...extra, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    });
  }
  for (let i = 0; i < ops.length; i += 400) {
    const bt = writeBatch(db);
    ops.slice(i, i + 400).forEach((f) => f(bt));
    await bt.commit();
  }
}
