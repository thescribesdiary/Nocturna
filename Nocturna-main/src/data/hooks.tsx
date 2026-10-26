import React, { useEffect, useMemo, useState } from 'react';
import { K, P, add, monday, todayKey } from '../lib/dates';
import { ACT_KIND, HomeTask, ORDER, Rec, Section, isDone, toHome, visibleCols } from './sections';
import { useStore } from './store';
import { TaskForm, useTaskActions } from './actions';
import { TaskFormDialog } from '../components/TaskFormDialog';

/** La data di oggi, aggiornata anche se l'app resta aperta oltre la mezzanotte. */
export function useToday() {
  const [t, setT] = useState(todayKey);
  useEffect(() => {
    const i = window.setInterval(() => setT(todayKey()), 60000);
    const v = () => setT(todayKey());
    document.addEventListener('visibilitychange', v);
    return () => { window.clearInterval(i); document.removeEventListener('visibilitychange', v); };
  }, []);
  return t;
}
export const tomorrowOf = (today: string) => {
  const [y, m, d] = today.split('-').map(Number);
  return K(add(new Date(y, m - 1, d), 1));
};

/** Tutte le attività di tutte le sezioni, nel formato comune della Home. */
export function useHomeTasks(only?: Section) {
  const { docs, cols } = useStore();
  return useMemo(() => {
    const out: HomeTask[] = [];
    (only ? [only] : ORDER).forEach((c) => docs[c].forEach((x) => x.kind === ACT_KIND[c] && out.push(toHome(c, x, cols))));
    return out;
  }, [docs, cols, only]);
}

/** Le lezioni dell'orario come voci di calendario, per 8 settimane attorno al mese mostrato. */
export function lessonTasks(scuola: Rec[], around: string): HomeTask[] {
  const base = P(around), out: HomeTask[] = [];
  const start = add(monday(new Date(base.getFullYear(), base.getMonth(), 1)), -7);
  const ls = scuola.filter((x) => x.kind === 'lezione');
  for (let i = 0; i < 56; i++) {
    const d = add(start, i), dow = String(d.getDay());
    ls.filter((l) => String(l.day) === dow).forEach((l) => {
      const subj = scuola.find((s) => s.id === l.subject)?.name || 'Lezione';
      out.push({ id: 'lez:' + K(d) + ':' + l.id, src: l.id, cat: 'scuola', title: 'Lezione · ' + subj, date: K(d), time: l.start, status: '', urgent: false, repeat: '', done: false });
    });
  }
  return out;
}

/** Apertura, modifica e salvataggio del modulo rapido delle attività. */
export function useTaskEditor(mobile: boolean) {
  const st = useStore();
  const act = useTaskActions();
  const [form, setFormS] = useState<TaskForm | null>(null);
  const today = useToday();

  const openNew = (pre: Partial<TaskForm> = {}) => {
    const cat = pre.cat || 'scuola';
    setFormS({ mode: 'new', id: null, title: '', cat, date: today, time: '', status: visibleCols(st.cols, cat)[0].id, urgent: false, done: false, repeat: '', ...pre });
  };
  const openEdit = (t: HomeTask) => setFormS({ mode: 'edit', id: t.id, src: t.src, cat: t.cat, title: t.title, date: t.date, time: t.time, status: t.status, urgent: t.urgent, done: isDone(st.cols, t.cat, t.status), repeat: t.repeat });
  const close = () => setFormS(null);
  const submit = () => { if (form && act.save(form)) close(); };
  const remove = () => {
    if (!form?.id) return;
    const [c, src] = form.id.split(':') as [Section, string];
    st.trashIt(c, src);
    st.say('Attività spostata nel cestino.');
    close();
  };
  const dialog = form ? (
    <TaskFormDialog form={form} mobile={mobile} setForm={(p) => setFormS((f) => (f ? { ...f, ...p } : f))} onCancel={close} onSubmit={submit} onRemove={remove} />
  ) : null;
  return { openNew, openEdit, dialog, ...act };
}
