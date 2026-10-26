import React from 'react';
import { GG, K, MESI, P, add, cap, dayLong, monday } from '../lib/dates';
import { CATS, ColsConfig, HomeTask, catVar, statusLabel } from '../data/sections';
import { Dot, Seg, tint } from './ui';

export type CalView = 'mese' | 'settimana' | 'giorno';
export const sortT = (a: HomeTask, b: HomeTask) => (a.time || '99').localeCompare(b.time || '99');
export const byDate = (a: HomeTask, b: HomeTask) => (a.date || '9999').localeCompare(b.date || '9999') || sortT(a, b);

export type Deco = HomeTask & {
  color: string; catShort: string; catLabel: string; bg: string; flag: boolean; flagLabel: string;
  deco: string; opacity: number; timeOr: string; timeShort: string; statusText: string; dateLabel: string;
};
export const decorate = (t: HomeTask, today: string, cols?: ColsConfig, byType?: boolean): Deco => {
  const c = CATS[t.cat];
  const overdue = !t.done && !!t.date && t.date < today;
  const d = t.date ? P(t.date) : null;
  return {
    ...t, color: byType && t.dot ? t.dot : catVar(t.cat), catShort: c.short, catLabel: c.label, bg: tint(catVar(t.cat)),
    flag: !t.done && (t.urgent || overdue), flagLabel: overdue ? 'Scaduta' : 'Urgente',
    deco: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1,
    timeOr: t.time || 'In giornata', timeShort: t.time || '—', statusText: t.label || statusLabel(cols, t.cat, t.status),
    dateLabel: d ? GG[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()].slice(0, 3) + (t.time ? ' · ' + t.time : '') : 'Senza data',
  };
};

const Warn = ({ label, size = 11 }: { label?: string; size?: number }) => (
  <i className="ph-fill ph-warning" aria-label={label} style={{ color: 'var(--color-urgent)', fontSize: size, flex: 'none' }} />
);

export const periodLabel = (view: CalView, anchor: string) => {
  const a = P(anchor), wk = monday(a), we = add(wk, 6);
  if (view === 'mese') return cap(MESI[a.getMonth()]) + ' ' + a.getFullYear();
  if (view === 'settimana') return wk.getDate() + (wk.getMonth() !== we.getMonth() ? ' ' + MESI[wk.getMonth()] : '') + ' – ' + we.getDate() + ' ' + MESI[we.getMonth()] + ' ' + we.getFullYear();
  return dayLong(a) + ' ' + a.getFullYear();
};
export const shiftAnchor = (view: CalView, anchor: string, dir: number) => {
  const a = P(anchor);
  return K(view === 'mese' ? new Date(a.getFullYear(), a.getMonth() + dir, 1) : add(a, view === 'settimana' ? 7 * dir : dir));
};

/** Barra di navigazione del calendario desktop (frecce, Oggi, periodo, vista). */
export function CalToolbar({ view, anchor, setView, setAnchor, today }: { view: CalView; anchor: string; setView: (v: CalView) => void; setAnchor: (k: string) => void; today: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button className="btn btn-secondary btn-icon" onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} aria-label="Periodo precedente"><i className="ph ph-caret-left" style={{ fontSize: 16 }} /></button>
      <button className="btn btn-secondary" onClick={() => setAnchor(today)} style={{ minHeight: 36 }}>Oggi</button>
      <button className="btn btn-secondary btn-icon" onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} aria-label="Periodo successivo"><i className="ph ph-caret-right" style={{ fontSize: 16 }} /></button>
      <h2 style={{ fontSize: 21.5, fontWeight: 500, margin: '0 0 0 8px', letterSpacing: '-.01em' }}>{periodLabel(view, anchor)}</h2>
      <div style={{ flex: 1 }} />
      <Seg label="Vista calendario" value={view} onChange={setView} opts={[['mese', 'Mese'], ['settimana', 'Settimana'], ['giorno', 'Giorno']]} />
    </div>
  );
}

const line = 'color-mix(in srgb, var(--color-text) 8%, transparent)';

/** Calendario desktop: mese, settimana o giorno. */
export function DeskCalendar({ tasks, view, anchor, sel, today, cols, onDay, onTask, onMove, byType }: {
  tasks: HomeTask[]; view: CalView; anchor: string; sel?: string | null; today: string; cols?: ColsConfig; byType?: boolean;
  onDay: (k: string) => void; onTask: (t: HomeTask) => void; onMove?: (t: HomeTask, date: string) => void;
}) {
  // Trascinamento di un'attività su un altro giorno (solo computer)
  const drag = (ev: { id: string }) => (onMove && !ev.id.startsWith('lez:') && !ev.id.startsWith('libro:') ? { draggable: true, onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', ev.id); e.dataTransfer.effectAllowed = 'move'; } } : {});
  const drop = (k: string) => (onMove ? { onDragOver: (e: React.DragEvent) => e.preventDefault(), onDrop: (e: React.DragEvent) => { e.preventDefault(); const t = tasks.find((x) => x.id === e.dataTransfer.getData('text/plain')); if (t) onMove(t, k); } } : {});
  const byDay: Record<string, HomeTask[]> = {};
  tasks.forEach((t) => { if (t.date) (byDay[t.date] = byDay[t.date] || []).push(t); });
  Object.values(byDay).forEach((a) => a.sort(sortT));
  const items = (k: string) => (byDay[k] || []).map((t) => decorate(t, today, cols, byType));
  const a = P(anchor), y = a.getFullYear(), m = a.getMonth();

  if (view === 'mese') {
    const first = new Date(y, m, 1), start = monday(first), dim = new Date(y, m + 1, 0).getDate();
    const weeks = Math.ceil((((first.getDay() + 6) % 7) + dim) / 7);
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', fontSize: 12.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-neutral-500)', paddingBottom: 6 }}>
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => <span key={d} style={{ paddingLeft: 8 }}>{d}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gridAutoRows: 'minmax(112px,1fr)', borderTop: `1px solid ${line}`, borderLeft: `1px solid ${line}` }}>
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = add(start, i), k = K(d), all = items(k), vis = all.length > 3 ? all.slice(0, 2) : all, isT = k === today, inM = d.getMonth() === m;
            return (
              <div key={k} onClick={() => onDay(k)} {...drop(k)} style={{ cursor: 'pointer', boxShadow: k === sel ? 'inset 0 0 0 1px var(--color-accent)' : 'none', display: 'flex', flexDirection: 'column', gap: 3, padding: 6, minWidth: 0, borderRight: `1px solid ${line}`, borderBottom: `1px solid ${line}`, background: inM ? 'transparent' : 'color-mix(in srgb, var(--color-sidebar) 55%, transparent)' }}>
                <button onClick={(e) => { e.stopPropagation(); onDay(k); }} aria-label={d.getDate() + ' ' + MESI[d.getMonth()] + ', ' + all.length + ' attività: mostra nel pannello'} style={{ alignSelf: 'flex-start', width: 26, height: 26, borderRadius: '50%', border: 0, display: 'grid', placeItems: 'center', background: isT ? 'var(--color-accent)' : 'transparent', color: isT ? 'var(--color-bg)' : inM ? 'var(--color-text)' : 'var(--color-neutral-600)', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{d.getDate()}</button>
                {vis.map((ev) => (
                  <button key={ev.id} {...drag(ev)} onClick={(e) => { e.stopPropagation(); onTask(ev); }} title={ev.title} style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', minHeight: 22, padding: '2px 6px', border: 0, borderRadius: 4, background: ev.bg, color: 'var(--color-text)', font: 'inherit', fontSize: 13.5, textAlign: 'left', cursor: 'pointer', opacity: ev.opacity }}>
                    <Dot c={ev.color} s={6} />
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: ev.deco }}>{ev.title}</span>
                    {ev.flag && <Warn label={ev.flagLabel} />}
                  </button>
                ))}
                {all.length > vis.length && (
                  <button onClick={(e) => { e.stopPropagation(); onDay(k); }} style={{ alignSelf: 'flex-start', border: 0, background: 'none', padding: '1px 6px', color: 'var(--color-accent-300)', font: 'inherit', fontSize: 13, cursor: 'pointer' }}>+{all.length - vis.length} altre</button>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  }
  if (view === 'settimana') {
    const wk = monday(a);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 10, minHeight: '100%' }}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = add(wk, i), k = K(d), it = items(k);
          return (
            <div key={k} {...drop(k)} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <button onClick={() => onDay(k)} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '4px 2px 8px', border: 0, borderBottom: `1px solid ${k === sel ? 'var(--color-accent-300)' : k === today ? 'var(--color-accent)' : 'var(--color-divider)'}`, background: 'none', color: k === today ? 'var(--color-accent-300)' : 'var(--color-neutral-400)', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 12.5, letterSpacing: '.08em', textTransform: 'uppercase' }}>{GG[d.getDay()]}</span>
                <span style={{ fontSize: 22.5, fontWeight: 500, color: 'var(--color-text)' }}>{d.getDate()}</span>
              </button>
              {it.map((ev) => (
                <button key={ev.id} {...drag(ev)} onClick={() => onTask(ev)} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 9px', border: 0, borderRadius: 8, background: ev.bg, color: 'var(--color-text)', font: 'inherit', textAlign: 'left', cursor: 'pointer', opacity: ev.opacity }}>
                  <span style={{ fontSize: 13, color: 'var(--color-neutral-300)' }}>{ev.timeOr}</span>
                  <span style={{ fontSize: 14.5, lineHeight: 1.3, textDecoration: ev.deco }}>{ev.title}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-neutral-300)' }}><Dot c={ev.color} s={6} />{ev.catShort}</span>
                  {ev.flag && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-urgent)' }}><i className="ph-fill ph-warning" />{ev.flagLabel}</span>}
                </button>
              ))}
              {!it.length && <span style={{ fontSize: 13.5, color: 'var(--color-neutral-600)', padding: '4px 2px' }}>Libero</span>}
            </div>
          );
        })}
      </div>
    );
  }
  const list = items(anchor);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 760 }}>
      {list.map((ev) => (
        <button key={ev.id} onClick={() => onTask(ev)} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) auto', alignItems: 'center', gap: 14, padding: '12px 14px', border: 0, borderRadius: 10, background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-text)', font: 'inherit', textAlign: 'left', cursor: 'pointer', opacity: ev.opacity }}>
          <span style={{ fontSize: 14.5, color: 'var(--color-neutral-300)' }}>{ev.timeOr}</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 17, textDecoration: ev.deco }}>{ev.title}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--color-neutral-400)' }}><Dot c={ev.color} s={7} />{ev.catLabel}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ev.flag && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, color: 'var(--color-urgent)' }}><i className="ph-fill ph-warning" />{ev.flagLabel}</span>}
            <span className="tag tag-neutral">{ev.statusText}</span>
          </span>
        </button>
      ))}
      {!list.length && <div style={{ padding: '28px 4px', color: 'var(--color-neutral-500)', fontSize: 15.5 }}>Nessuna attività in questa giornata per le aree selezionate.</div>}
    </div>
  );
}

/** Calendario mobile: settimana o mese a puntini, più l'elenco del giorno scelto. */
export function MobileCalendar({ tasks, view, setView, sel, setSel, today, cols, onTask, byType }: {
  tasks: HomeTask[]; view: CalView; setView: (v: CalView) => void; sel: string; setSel: (k: string) => void; today: string; cols?: ColsConfig; onTask: (t: HomeTask) => void; byType?: boolean;
}) {
  const byDay: Record<string, HomeTask[]> = {};
  tasks.forEach((t) => { if (t.date) (byDay[t.date] = byDay[t.date] || []).push(t); });
  const items = (k: string) => (byDay[k] || []).slice().sort(sortT).map((t) => decorate(t, today, cols, byType));
  const a = P(sel);
  const day = (d: Date, inM?: boolean, month?: boolean) => {
    const k = K(d), it = items(k), on = k === sel, isT = k === today;
    // Un pallino per attività, fino a 3: pieno se completata, vuoto se ancora da fare. Oltre, «+N».
    const dots = it.slice(0, 3), more = it.length - dots.length, ds = month ? 6 : 7;
    return (
      <button key={k} onClick={() => setSel(k)} aria-label={dayLong(d) + ', ' + it.length + ' attività'} aria-pressed={on} style={month
        ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, height: 52, borderRadius: 10, border: `1px solid ${on ? 'var(--color-accent)' : 'transparent'}`, background: on ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : isT ? 'color-mix(in srgb, var(--color-text) 6%, transparent)' : 'transparent', color: isT ? 'var(--color-accent-300)' : inM === false ? 'var(--color-neutral-600)' : 'var(--color-text)', font: 'inherit', fontSize: 15.5, cursor: 'pointer', padding: 0 }
        : { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 66, padding: '7px 0', borderRadius: 12, border: `1px solid ${on ? 'var(--color-accent)' : 'transparent'}`, background: on ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : isT ? 'color-mix(in srgb, var(--color-text) 6%, transparent)' : 'transparent', color: 'var(--color-text)', font: 'inherit', cursor: 'pointer' }}>
        {month ? <span>{d.getDate()}</span> : <>
          <span style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{GG[d.getDay()]}</span>
          <span style={{ fontSize: 19, fontWeight: 500, color: isT ? 'var(--color-accent-300)' : 'var(--color-text)' }}>{d.getDate()}</span>
        </>}
        <span style={{ display: 'flex', alignItems: 'center', gap: 2, height: ds }}>
          {dots.map((x) => <span key={x.id} style={{ width: ds, height: ds, boxSizing: 'border-box', borderRadius: '50%', background: x.done ? x.color : 'transparent', border: '1.5px solid ' + x.color }} />)}
          {more > 0 && <span style={{ fontSize: 10.5, lineHeight: 1, color: 'var(--color-neutral-400)', marginLeft: 1 }}>+{more}</span>}
        </span>
      </button>
    );
  };
  const wk = monday(a), we = add(wk, 6);
  const mf = new Date(a.getFullYear(), a.getMonth(), 1), ms = monday(mf), mdim = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate(), mweeks = Math.ceil((((mf.getDay() + 6) % 7) + mdim) / 7);
  const period = view === 'mese' ? cap(MESI[a.getMonth()]) + ' ' + a.getFullYear() : view === 'settimana' ? wk.getDate() + ' ' + MESI[wk.getMonth()].slice(0, 3) + ' – ' + we.getDate() + ' ' + MESI[we.getMonth()].slice(0, 3) : dayLong(a);
  const shift = (dir: number) => setSel(view === 'mese' ? K(new Date(a.getFullYear(), a.getMonth() + dir, 1)) : K(add(a, view === 'settimana' ? 7 * dir : dir)));
  const list = items(sel);
  const navBtn = { width: 44, height: 44, border: 0, borderRadius: 10, background: 'none', color: 'var(--color-text)', display: 'grid', placeItems: 'center', cursor: 'pointer' } as const;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        <button onClick={() => shift(-1)} aria-label="Precedente" style={navBtn}><i className="ph ph-caret-left" style={{ fontSize: 18 }} /></button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 500 }}>{period}</span>
        <button onClick={() => shift(1)} aria-label="Successivo" style={navBtn}><i className="ph ph-caret-right" style={{ fontSize: 18 }} /></button>
      </div>
      <div style={{ marginBottom: 14 }}><Seg big grid label="Vista" value={view} onChange={setView} opts={[['giorno', 'Giorno'], ['settimana', 'Settimana'], ['mese', 'Mese']]} /></div>
      {view === 'settimana' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 16 }}>{Array.from({ length: 7 }, (_, i) => day(add(wk, i)))}</div>}
      {view === 'mese' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', fontSize: 12.5, color: 'var(--color-neutral-500)', textAlign: 'center', marginBottom: 4 }}>{['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((x, i) => <span key={i}>{x}</span>)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 16 }}>{Array.from({ length: mweeks * 7 }, (_, i) => { const d = add(ms, i); return day(d, d.getMonth() === a.getMonth(), true); })}</div>
      </>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{sel === today ? 'Oggi · ' + dayLong(a) : dayLong(a)}</h2>
        <span style={{ fontSize: 14.5, color: 'var(--color-neutral-500)' }}>{list.length} attività</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((ev) => (
          <button key={ev.id} onClick={() => onTask(ev)} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr)', gap: 12, alignItems: 'start', minHeight: 56, padding: 12, border: 0, borderRadius: 12, background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-text)', font: 'inherit', textAlign: 'left', cursor: 'pointer', opacity: ev.opacity }}>
            <span style={{ fontSize: 14.5, color: 'var(--color-neutral-300)', paddingTop: 1 }}>{ev.timeShort}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 17, lineHeight: 1.3, textDecoration: ev.deco }}>{ev.title}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 14, color: 'var(--color-neutral-400)' }}>
                <Dot c={ev.color} s={7} />{ev.catShort} · {ev.statusText}
                {ev.flag && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--color-urgent)' }}><i className="ph-fill ph-warning" />{ev.flagLabel}</span>}
              </span>
            </span>
          </button>
        ))}
        {!list.length && <div style={{ padding: '18px 2px', fontSize: 15.5, color: 'var(--color-neutral-500)' }}>Nessuna attività per le aree selezionate.</div>}
      </div>
    </>
  );
}
