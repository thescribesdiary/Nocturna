// Funzioni comuni sui libri di Lettura: copia con il piano editoriale, scadenze per i calendari.
import { HomeTask, Rec, visibleCols } from './sections';
import { Store } from './store';
import { BST, bookClosed, optLabel } from './schema';

const META = ['id', 'createdAt', 'updatedAt', 'notifyAt', 'notifyQueue', 'notifyKinds', 'notifiedAt', 'deletedAt', 'spawnedNext', 'prevStatus'];
const strip = (x: Rec) => { const o: any = {}; Object.keys(x).forEach((k) => { if (!META.includes(k)) o[k] = x[k]; }); return o; };

export const planOf = (st: Store, bookId: string) => st.docs.lettura.filter((x) => x.kind === 'attivita' && x.book === bookId).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));

/** «Copia»: duplica il libro e il suo piano editoriale; le attività copiate ripartono dalla prima colonna. */
export function copyBook(st: Store, b: Rec) {
  const id = st.create('lettura', { ...strip(b), title: b.title + ' (copia)', kind: 'libro', volDone: false, volCancelled: false } as Rec);
  const first = visibleCols(st.cols, 'lettura')[0]?.id;
  const plan = planOf(st, b.id);
  plan.forEach((x) => st.create('lettura', { ...strip(x), kind: 'attivita', book: id, status: first, title: String(x.title || '').replace(b.title, b.title + ' (copia)') } as Rec));
  st.say('Libro copiato' + (plan.length ? ' con ' + plan.length + (plan.length === 1 ? ' attività' : ' attività') + ' del piano editoriale.' : '.'));
  return id;
}

/** Le scadenze di lettura con data precisa, come voci di calendario. */
export function bookDeadlines(lettura: Rec[]): HomeTask[] {
  return lettura
    .filter((b) => b.kind === 'libro' && !bookClosed(b) && b.status !== 'nonleggere' && b.deadlineMode === 'data' && b.deadline)
    .map((b) => ({
      id: 'libro:' + b.id, src: b.id, cat: 'lettura', title: 'Leggere «' + b.title + '»', date: b.deadline, time: '', status: b.status || '',
      urgent: false, repeat: '', done: b.status === 'completato', label: 'Scadenza di lettura · ' + optLabel(BST, b.status), dot: '#b3a8ab',
    }));
}

/** Libri con scadenza «entro il mese» per il mese indicato (AAAA-MM). */
export const monthBooks = (lettura: Rec[], month: string) =>
  lettura.filter((b) => b.kind === 'libro' && !bookClosed(b) && !['completato', 'nonleggere'].includes(b.status || '') && b.deadlineMode === 'mese' && b.deadlineMonth === month);
