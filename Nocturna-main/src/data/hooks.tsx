import React, { useEffect, useMemo, useState } from 'react';
import { K, P, add, monday, todayKey } from '../lib/dates';
import { ACT_KIND, HomeTask, ORDER, Rec, Section, isDone, toHome, visibleCols } from './sections';
import { useStore } from './store';

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
