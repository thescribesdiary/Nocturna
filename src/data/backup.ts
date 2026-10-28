// Backup: esporta tutti i dati in un file JSON e li reimporta sostituendo quelli attuali.
import { Timestamp, collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { ColsConfig, Rec, Section } from './sections';
import { notifyFields } from './reminders';
import { BACKUP_STORES as STORES, BACKUP_VERSION, BackupError, MAX_BACKUP_BYTES, isServiceDoc, parseBackupJson, planRestore, chunkBySize } from './backupFormat';
import { safeImage } from '../lib/safe';

const SKIP = ['notifyAt', 'notifyQueue', 'notifyKinds', 'notifiedAt', 'createdAt', 'updatedAt'];

const plain = (v: any): any => {
  if (v instanceof Timestamp) return v.toMillis();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') { const o: any = {}; Object.entries(v).forEach(([k, x]) => (o[k] = plain(x))); return o; }
  return v;
};

export async function exportBackup(uid: string, prefix = 'nocturna-backup-') {
  const data: Record<string, any[]> = {};
  let n = 0;
  for (const s of STORES) {
    const snap = await getDocs(collection(db, 'users', uid, s));
    // Il segno della migrazione (impostazioni/spazio) non va nel backup: ripristinarlo o perderlo rifarebbe la copia.
    data[s] = snap.docs.filter((d) => !isServiceDoc(s, d.id)).map((d) => {
      const o: any = { id: d.id };
      Object.entries(d.data()).forEach(([k, v]) => { if (!SKIP.includes(k)) o[k] = plain(v); });
      return o;
    });
    n += data[s].length;
  }
  const json = JSON.stringify({ app: 'Nocturna', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }, null, 1);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = prefix + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  try { localStorage.setItem('nocturna-last-backup', String(Date.now())); } catch {}
  return n;
}

export type ParsedBackup = { data: Record<string, any[]>; count: number; exportedAt: string };
export async function readBackup(file: File): Promise<ParsedBackup> {
  if (file.size > MAX_BACKUP_BYTES) throw new BackupError('too-big');
  let j: unknown;
  try { j = JSON.parse(await file.text()); } catch { throw new BackupError('not-nocturna'); }
  return parseBackupJson(j);
}

/**
 * Sostituisce tutti i dati con quelli del backup (i dispositivi per le notifiche e il segno della migrazione restano).
 * Ordine sicuro: 1) scarica una copia dei dati attuali, 2) scrive tutti i documenti del backup,
 * 3) solo alla fine elimina quelli che il backup non contiene. Se si interrompe, nessun dato va perso:
 * al massimo restano anche documenti vecchi, e basta ripetere il ripristino.
 */
export async function restoreBackup(uid: string, b: ParsedBackup) {
  await exportBackup(uid, 'nocturna-prima-del-ripristino-');
  const existing: Record<string, string[]> = {};
  for (const s of STORES) existing[s] = (await getDocs(collection(db, 'users', uid, s))).docs.map((d) => d.id);
  const cols: ColsConfig = (b.data.impostazioni || []).find((x: any) => x.id === 'colonne') || {};
  const plan = planRestore(b.data, existing, (s, rest) => {
    const x = { ...rest };
    if ('image' in x) x.image = safeImage(x.image);
    if ('avatar' in x) x.avatar = safeImage(x.avatar);
    return x;
  });
  type Op = { size: number; run: (bt: ReturnType<typeof writeBatch>) => void };
  const writes: Op[] = plan.writes.map((w) => ({
    size: JSON.stringify(w.data).length + 200,
    run: (bt) => {
      const extra = w.store === 'impostazioni' ? {} : notifyFields(w.store as Section, { ...w.data, id: w.id } as Rec, cols);
      bt.set(doc(db, 'users', uid, w.store, w.id), { ...w.data, ...extra, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    },
  }));
  const deletes: Op[] = plan.deletes.map((d) => ({ size: 200, run: (bt) => bt.delete(doc(db, 'users', uid, d.store, d.id)) }));
  for (const ops of [writes, deletes]) {
    for (const part of chunkBySize(ops, (o) => o.size)) {
      const bt = writeBatch(db);
      part.forEach((o) => o.run(bt));
      await bt.commit();
    }
  }
}
