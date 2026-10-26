// Calcola quando inviare i promemoria di un documento.
// Il risultato viene salvato nel documento stesso (notifyAt / notifyQueue):
// lo script su GitHub legge solo i documenti con notifyAt vicino e invia la notifica.
import { Timestamp } from 'firebase/firestore';
import { at, P, add } from '../lib/dates';
import { ACT_KIND, ColsConfig, Rec, Section, dateOf, isDone } from './sections';

/** Minuti di anticipo per le attività con orario. */
export const LEAD_MINUTES = 15;
/** Ora del promemoria "N giorni prima" del piano editoriale. */
export const PLAN_REMINDER_HOUR = 9;

export type NotifyFields = { notifyAt: Timestamp | null; notifyQueue: Timestamp[]; notifyKinds: string[]; notifiedAt: null };

export function notifyFields(c: Section, x: Rec, cols?: ColsConfig): NotifyFields {
  const none: NotifyFields = { notifyAt: null, notifyQueue: [], notifyKinds: [], notifiedAt: null };
  // Libri con scadenza di lettura precisa: avviso 3 giorni prima e il giorno stesso, alle 9:00.
  if (c === 'lettura' && x.kind === 'libro') {
    if (x.deletedAt || x.volDone || x.volCancelled || x.deadlineMode !== 'data' || !x.deadline || ['completato', 'nonleggere'].includes(x.status || '')) return none;
    const cut = Date.now() - 10 * 60000;
    const q = [3, 0].map((n) => { const d = add(P(x.deadline), -n); d.setHours(PLAN_REMINDER_HOUR, 0, 0, 0); return d.getTime(); }).filter((t) => t >= cut).sort((a, b) => a - b);
    return { notifyAt: q[0] ? Timestamp.fromMillis(q[0]) : null, notifyQueue: q.map((t) => Timestamp.fromMillis(t)), notifyKinds: q.map(() => 'libro'), notifiedAt: null };
  }
  if (x.kind !== ACT_KIND[c] || x.deletedAt || isDone(cols, c, x.status)) return none;
  const date = dateOf(c, x);
  if (!date) return none;

  const times: [number, string][] = [];
  // 15 minuti prima delle attività con orario
  if (x.time) times.push([at(date, x.time).getTime() - LEAD_MINUTES * 60000, 'ora']);
  // N giorni prima per le attività del piano editoriale (campo "reminder")
  if (c === 'lettura' && x.reminder !== '' && x.reminder != null && !isNaN(Number(x.reminder))) {
    const d = add(P(date), -Number(x.reminder));
    d.setHours(PLAN_REMINDER_HOUR, 0, 0, 0);
    times.push([d.getTime(), 'piano']);
  }
  // Teniamo solo quelli ancora utili (con un margine di 10 minuti per i ritardi).
  const cutoff = Date.now() - 10 * 60000;
  const q = times.filter(([t]) => t >= cutoff).sort((a, b) => a[0] - b[0]);
  const queue = q.map(([t]) => Timestamp.fromMillis(t));
  return { notifyAt: queue[0] || null, notifyQueue: queue, notifyKinds: q.map(([, k]) => k), notifiedAt: null };
}

/** True se i campi che influenzano i promemoria sono cambiati. */
export const touchesReminders = (patch: Record<string, any>) =>
  ['date', 'due', 'start', 'time', 'type', 'status', 'reminder', 'deletedAt', 'kind', 'deadline', 'deadlineMode', 'volDone', 'volCancelled'].some((k) => k in patch);
