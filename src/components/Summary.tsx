import React, { useEffect, useState } from 'react';
import { GG, MESI, P, add, K } from '../lib/dates';
import { CATS, catVar } from '../data/sections';
import { useStore } from '../data/store';
import { tomorrowOf, useHomeTasks, useToday } from '../data/hooks';
import { sortT } from './Calendar';
import { ArchDivider, Corners } from './Ornaments';
import { useDialog } from './useDialog';
import { HomeTask } from '../data/sections';

const BK_KEY = 'nocturna-backup-snooze';
/** True se l'ultimo backup (fatto da questo dispositivo) ha più di 30 giorni e il promemoria non è stato rimandato. */
export const backupStale = () => {
  try {
    const last = +(localStorage.getItem('nocturna-last-backup') || 0), snooze = +(localStorage.getItem(BK_KEY) || 0);
    return Date.now() - last > 30 * 86400000 && Date.now() > snooze;
  } catch { return false; }
};

const short = (k: string) => { const d = P(k); return GG[d.getDay()].toLowerCase() + ' ' + d.getDate() + ' ' + MESI[d.getMonth()].slice(0, 3); };
const SHOWN_KEY = 'nocturna-summary-shown';

export function useSummaryGroups() {
  const today = useToday();
  const { docs } = useStore();
  const tasks = useHomeTasks().filter((t) => !t.done && t.date);
  // Scadenze di lettura dei libri (entro 3 giorni o già scadute)
  const reads: HomeTask[] = docs.lettura
    .filter((b) => b.kind === 'libro' && !b.volDone && !b.volCancelled && b.deadlineMode === 'data' && b.deadline && b.deadline <= K(add(P(today), 3)) && !['completato', 'nonleggere'].includes(b.status || ''))
    .map((b) => ({ id: 'libro:' + b.id, src: b.id, cat: 'lettura' as const, title: 'Leggere «' + b.title + '»', date: b.deadline, time: '', status: b.status || '', urgent: false, repeat: '', done: false }));
  tasks.push(...reads);
  const limit = K(add(P(today), 3));
  const tomorrow = tomorrowOf(today);
  return [
    { title: 'In ritardo', items: tasks.filter((t) => t.date < today).sort((a, b) => a.date.localeCompare(b.date)).map((t) => ({ t, when: 'scadeva ' + short(t.date) })) },
    { title: 'Oggi', items: tasks.filter((t) => t.date === today).sort(sortT).map((t) => ({ t, when: t.time || 'oggi' })) },
    { title: 'Prossimi giorni', items: tasks.filter((t) => t.date > today && t.date <= limit).sort((a, b) => a.date.localeCompare(b.date) || sortT(a, b)).map((t) => ({ t, when: (t.date === tomorrow ? 'domani' : short(t.date)) + (t.time ? ' · ' + t.time : '') })) },
  ].filter((g) => g.items.length);
}

export function SummaryDialog({ onClose, preview }: { onClose: () => void; preview?: boolean }) {
  const dlg = useDialog(onClose);
  const groups = useSummaryGroups();
  const { prefs } = useStore();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-sidebar) 72%, transparent)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dlg} role="dialog" aria-modal="true" aria-label="Riepilogo all'apertura" className="dialog" style={{ width: 'min(520px,100%)', maxHeight: '100%', overflow: 'hidden', padding: 0, gap: 0 }}>
        <Corners size={34} inset={5} />
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span className="gothic" style={{ fontSize: 30, lineHeight: 1 }}>Il tuo riepilogo</span>
            <span style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>Attività in ritardo, di oggi e dei prossimi tre giorni</span>
          </div>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 44, height: 44, border: 0, borderRadius: 8, background: 'none', color: 'var(--color-neutral-400)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 20 }} /></button>
        </div>
        {groups.map((g, gi) => (
          <section key={g.title} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {gi > 0 && <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 10px' }}><ArchDivider width={200} /></div>}
            <span style={{ fontSize: 12, letterSpacing: '.09em', textTransform: 'uppercase', color: g.title === 'In ritardo' ? 'var(--color-urgent)' : 'var(--color-neutral-400)', paddingBottom: 4 }}>{g.title}</span>
            {g.items.map(({ t, when }) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 50, borderBottom: '1px solid color-mix(in srgb, var(--color-text) 7%, transparent)' }}>
                <span style={{ width: 8, height: 8, flex: 'none', borderRadius: '50%', background: catVar(t.cat) }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15 }}>{t.title}</span>
                  <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>{CATS[t.cat].label}</span>
                </span>
                <span style={{ fontSize: 13.5, color: 'var(--color-neutral-300)', flex: 'none' }}>{when}</span>
              </div>
            ))}
          </section>
        ))}
        {!groups.length && <p style={{ margin: 0, fontSize: 15, color: 'var(--color-neutral-400)' }}>Nessuna attività in ritardo o in arrivo nei prossimi giorni.</p>}
        {backupStale() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', fontSize: 14.5 }}>
            <i className="ph ph-database" style={{ fontSize: 18, color: 'var(--color-accent-300)' }} />
            <span style={{ flex: 1 }}>L'ultimo backup ha più di 30 giorni. Creane uno da Impostazioni.</span>
            <button className="btn btn-ghost" onClick={() => { try { localStorage.setItem(BK_KEY, String(Date.now() + 7 * 86400000)); } catch {} onClose(); }} style={{ minHeight: 34 }}>Più tardi</button>
            <button className="btn btn-secondary" onClick={() => { onClose(); window.location.hash = '#/impostazioni'; }} style={{ minHeight: 34 }}>Apri</button>
          </div>
        )}
        {preview && !prefs.summaryOnOpen && <p style={{ margin: 0, fontSize: 14, color: 'var(--color-accent-200)' }}>Il riepilogo è disattivato: all'apertura non viene mostrato.</p>}
        <button className="btn btn-primary" onClick={onClose} style={{ alignSelf: 'flex-end', minHeight: 44 }}>{preview ? 'Chiudi anteprima' : 'Inizia la giornata'}</button>
        </div>
      </div>
    </div>
  );
}

/** Mostra il riepilogo una volta per ogni apertura dell'app, se attivo e se c'è qualcosa da segnalare. */
export function OpeningSummary() {
  const { ready, prefs } = useStore();
  const groups = useSummaryGroups();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ready || !prefs.summaryOnOpen) return;
    try { if (sessionStorage.getItem(SHOWN_KEY)) return; sessionStorage.setItem(SHOWN_KEY, '1'); } catch {}
    if (groups.length || backupStale()) setOpen(true);
  }, [ready]); // eslint-disable-line
  return open ? <SummaryDialog onClose={() => setOpen(false)} /> : null;
}
