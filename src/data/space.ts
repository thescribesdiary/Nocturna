// Spazio dati condiviso: tutti gli account autorizzati (secret ALLOWED_EMAIL, anche più indirizzi
// separati da virgola) leggono e scrivono gli stessi dati, in users/condiviso/…
// Al primo accesso di ogni account, i dati che aveva nel suo spazio personale (versioni precedenti)
// vengono copiati qui una volta sola, senza cancellare l'originale.
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { ORDER } from './sections';

export const SPACE = 'condiviso';

export async function joinSpace(uid: string): Promise<number> {
  const mark = doc(db, 'users', SPACE, 'impostazioni', 'spazio');
  const m = await getDoc(mark);
  const merged: Record<string, number> = (m.exists() && m.data().merged) || {};
  if (merged[uid]) return 0;

  const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
  for (const s of ORDER) {
    const snap = await getDocs(collection(db, 'users', uid, s));
    snap.docs.forEach((d) => {
      ops.push((b) => b.set(doc(db, 'users', SPACE, s, d.id), d.data()));
      // Nello spazio vecchio togliamo i promemoria, così non arrivano notifiche doppie.
      ops.push((b) => b.update(d.ref, { notifyAt: null, notifyQueue: [] }));
    });
  }
  // Impostazioni (tema, colonne, tipi di Lettura…): solo quelle che lo spazio condiviso non ha ancora.
  const mine = await getDocs(collection(db, 'users', uid, 'impostazioni'));
  const shared = await getDocs(collection(db, 'users', SPACE, 'impostazioni'));
  const have = new Set(shared.docs.map((d) => d.id));
  mine.docs.forEach((d) => { if (!have.has(d.id)) ops.push((b) => b.set(doc(db, 'users', SPACE, 'impostazioni', d.id), d.data())); });

  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach((f) => f(b));
    await b.commit();
  }
  await setDoc(mark, { merged: { [uid]: Date.now() } }, { merge: true });
  return Math.floor(ops.length / 2);
}
