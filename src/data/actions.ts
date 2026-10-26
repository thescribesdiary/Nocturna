// Operazioni sulle attività usate da Home e bacheche. Ogni modifica finisce nel documento d'origine.
import { K, P, add, addMonth, dayLong } from '../lib/dates';
import {
  ACT_KIND, HomeTask, NEW_ACT, Rec, Section, dateFieldPatch, dateOf, finalStatus, isDone, reopenStatus, urgentPatch,
} from './sections';
import { useStore } from './store';

export type TaskForm = {
  mode: 'new' | 'edit';
  id: string | null; // id "sezione:doc" in modifica
  src?: string;
  cat: Section;
  title: string;
  date: string;
  time: string;
  status: string;
  urgent: boolean;
  done: boolean;
  repeat: string;
};

export function useTaskActions() {
  const st = useStore();
  const { docs, cols, create, update, say } = st;
  const find = (c: Section, id: string) => docs[c].find((x) => x.id === id);

  /** Quando un'attività ricorrente viene completata, crea la successiva. */
  const spawnNext = (c: Section, x: Rec) => {
    if (!x.repeat || x.spawnedNext) return;
    const date = dateOf(c, x);
    if (!date) return;
    const d = P(date);
    const nd = x.repeat === 'giorno' ? add(d, 1) : x.repeat === 'settimana' ? add(d, 7) : addMonth(d, 1);
    const prev = x.prevStatus && !isDone(cols, c, x.prevStatus) ? x.prevStatus : reopenStatus(cols, c);
    const { id, createdAt, updatedAt, deletedAt, notifyAt, notifyQueue, notifiedAt, spawnedNext, prevStatus, grade, ...rest } = x;
    create(c, { ...rest, ...dateFieldPatch(c, x, K(nd)), status: prev, kind: x.kind } as Rec);
    update(c, x.id, { spawnedNext: true });
    say('Attività ricorrente: la prossima è ' + dayLong(nd).toLowerCase() + '.');
  };

  /** Imposta lo stato di un'attività, gestendo completamento e ricorrenza. */
  const setStatus = (c: Section, id: string, status: string) => {
    const x = find(c, id);
    if (!x || x.status === status) return;
    const wasDone = isDone(cols, c, x.status), nowDone = isDone(cols, c, status);
    update(c, id, { status, ...(nowDone && !wasDone ? { prevStatus: x.status } : {}) });
    if (nowDone && !wasDone) spawnNext(c, { ...x, status });
  };

  const toggle = (t: HomeTask) => {
    const x = find(t.cat, t.src);
    if (!x) return;
    if (t.done) {
      const back = x.prevStatus && !isDone(cols, t.cat, x.prevStatus) ? x.prevStatus : reopenStatus(cols, t.cat);
      update(t.cat, x.id, { status: back });
    } else setStatus(t.cat, x.id, finalStatus(cols, t.cat));
  };

  const save = (f: TaskForm): boolean => {
    const title = f.title.trim();
    if (!title) { say('Inserisci un titolo per l’attività.'); return false; }
    if (f.mode === 'new') {
      const base: Record<string, any> = { ...NEW_ACT[f.cat], kind: ACT_KIND[f.cat], title, status: f.status, time: f.time, repeat: f.repeat || '' };
      Object.assign(base, f.cat === 'lavoro' ? { due: f.date } : { date: f.date });
      if (f.urgent) Object.assign(base, f.cat === 'scuola' || f.cat === 'lavoro' ? { priority: 'alta' } : { urgent: true });
      create(f.cat, base as Rec);
      say('Attività aggiunta e salvata nella sua sezione.');
      return true;
    }
    const [c0, src] = (f.id || '').split(':') as [Section, string];
    const x = find(c0, src);
    if (!x) return false;
    if (c0 !== f.cat) {
      // Spostata in un'altra area: nuovo documento nella sezione di destinazione, l'originale va nel cestino.
      const base: Record<string, any> = { ...NEW_ACT[f.cat], kind: ACT_KIND[f.cat], title, status: f.status, time: f.time, repeat: f.repeat || '' };
      Object.assign(base, f.cat === 'lavoro' ? { due: f.date } : { date: f.date });
      if (f.urgent) Object.assign(base, f.cat === 'scuola' || f.cat === 'lavoro' ? { priority: 'alta' } : { urgent: true });
      create(f.cat, base as Rec);
      st.trashIt(c0, src);
      say('Attività spostata in ' + f.cat + '.');
      return true;
    }
    const patch: Record<string, any> = { title, time: f.time, repeat: f.repeat || '', ...dateFieldPatch(f.cat, x, f.date), ...urgentPatch(f.cat, x, f.urgent) };
    update(f.cat, src, patch);
    if (f.status !== x.status) setStatus(f.cat, src, f.status);
    say('Modifiche applicate.');
    return true;
  };

  return { toggle, setStatus, save, spawnNext };
}
