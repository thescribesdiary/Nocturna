// Spazio dati condiviso: tutti gli account autorizzati (secret ALLOWED_EMAIL, anche più indirizzi
// separati da virgola) leggono e scrivono gli stessi dati, in users/condiviso/…
// Al primo accesso di ogni account, i dati che aveva nel suo spazio personale (versioni precedenti)
// vengono copiati qui una volta sola, senza cancellare l'originale.
// La copia non sovrascrive mai: un documento già presente nello spazio condiviso (anche nel cestino)
// resta com'è, così ripetere la copia (es. dopo un'interruzione) non riporta indietro i dati.
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
  for (const s of [...ORDER, 'impostazioni']) {
    const mine = await getDocs(collection(db, 'users', uid, s));
    if (mine.empty) continue;
    const shared = await getDocs(collection(db, 'users', SPACE, s));
    const have = new Set(shared.docs.map((d) => d.id));
    // Impostazioni (tema, colonne, tipi di Lettura…) e dati: solo quelli che lo spazio condiviso non ha ancora.
    mine.docs.forEach((d) => {
      if (s === 'impostazioni' && d.id === 'spazio') return;
      if (!have.has(d.id)) ops.push((b) => b.set(doc(db, 'users', SPACE, s, d.id), d.data()));
      // Nello spazio vecchio togliamo i promemoria, così non arrivano notifiche doppie (come prima).
      if (s !== 'impostazioni') ops.push((b) => b.update(d.ref, { notifyAt: null, notifyQueue: [] }));
    });
  }

  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach((f) => f(b));
    try { await b.commit(); } catch (e: any) {
      // Un rifiuto qui riguarda i dati da copiare, non l'account (già verificato leggendo il segno):
      // non deve far uscire l'utente. Il segno non viene scritto, così la copia riprova al prossimo accesso.
      if (e?.code === 'permission-denied') throw Object.assign(new Error('Copia dei dati personali rifiutata dalle regole.'), { code: 'migration-denied', cause: e });
      throw e;
    }
  }
  await setDoc(mark, { merged: { [uid]: Date.now() } }, { merge: true });
  return ops.length;
}
