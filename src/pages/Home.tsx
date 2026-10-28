import React, { useEffect, useRef, useState } from 'react';
import { GG, MESI, P, dayLong } from '../lib/dates';
import { CATS, HomeTask, ORDER, Section, catVar } from '../data/sections';
import { useStore } from '../data/store';
import { lessonTasks, tomorrowOf, useHomeTasks, useToday } from '../data/hooks';
import { useTaskActions } from '../data/actions';
import { useRecordEditor } from '../components/CalendarForm';
import { bookDeadlines, monthBooks } from '../data/books';
import { formatDuration, sumDurations } from '../lib/duration';
import { LetturaCalendarExtras } from './views';
import { CalToolbar, CalView, DeskCalendar, MobileCalendar, decorate, sortT } from '../components/Calendar';
import { Check, Dot, H1, Seg, hScroll, pill, tint } from '../components/ui';
import { GlobalSearch } from '../components/GlobalSearch';

const shortDay = (k: string) => { const d = P(k); return GG[d.getDay()].toLowerCase() + ' ' + d.getDate() + ' ' + MESI[d.getMonth()].slice(0, 3); };

function FilterChips({ filters, setFilters, mobile }: { filters: Section[]; setFilters: (f: Section[]) => void; mobile?: boolean }) {
  const toggle = (c: Section) => {
    let f = filters.includes(c) ? filters.filter((x) => x !== c) : [...filters, c];
    if (f.length === ORDER.length) f = [];
    setFilters(f);
  };
  const chip = (label: string, a: boolean, onClick: () => void, color?: string, dot?: string, check?: boolean) => (
    <button key={label} onClick={onClick} aria-pressed={a} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: mobile ? 40 : 32, padding: mobile ? '6px 14px' : '5px 12px', borderRadius: 999, ...pill(a, color), font: 'inherit', fontSize: mobile ? 15.5 : 14, cursor: 'pointer' }}>
      {dot && <Dot c={dot} />}<span>{label}</span>{check && <i className="ph-bold ph-check" style={{ fontSize: mobile ? 12 : 11 }} />}
    </button>
  );
  return (
    <>
      {chip('Tutte', filters.length === 0, () => setFilters([]))}
      {ORDER.map((c) => chip(CATS[c].short, filters.includes(c), () => toggle(c), catVar(c), catVar(c), filters.includes(c)))}
    </>
  );
}

/** Riga del pannello Oggi / Domani. */
function DayItem({ t, today, onToggle, onOpen, mobile }: { t: HomeTask; today: string; onToggle: () => void; onOpen: () => void; mobile?: boolean }) {
  const { cols } = useStore();
  const it = decorate(t, today, cols);
  const meta = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: mobile ? 14 : 13.5, color: 'var(--color-neutral-400)' }}>
      <Dot c={it.color} s={7} /><span>{it.catShort}</span>
      {it.time && <span>· {it.time}</span>}
      {it.flag && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--color-urgent)' }}><i className="ph-fill ph-warning" />{it.flagLabel}</span>}
      {it.done && !mobile && <span>· Completata</span>}
    </span>
  );
  const title = <span style={{ fontSize: mobile ? 17 : 15, lineHeight: 1.3, textDecoration: it.deco, color: it.done ? 'var(--color-neutral-500)' : 'var(--color-text)' }}>{it.title}</span>;
  const label = it.done ? 'Segna come da fare' : 'Segna come completata';
  if (mobile)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 56, borderBottom: '1px solid color-mix(in srgb, var(--color-text) 7%, transparent)' }}>
        <button onClick={onToggle} aria-label={label} aria-pressed={it.done} style={{ width: 44, height: 44, flex: 'none', marginLeft: -12, border: 0, background: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${it.done ? 'var(--color-accent)' : 'var(--color-neutral-500)'}`, background: it.done ? 'var(--color-accent)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--color-bg)' }}>{it.done && <i className="ph-bold ph-check" style={{ fontSize: 13 }} />}</span>
        </button>
        <button onClick={onOpen} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1, padding: '8px 0', border: 0, background: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>{title}{meta}</button>
      </div>
    );
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 6px', borderRadius: 8 }}>
      <Check on={it.done} onClick={onToggle} label={label} />
      <button onClick={onOpen} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1, border: 0, background: 'none', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>{title}{meta}</button>
    </div>
  );
}

export function Home({ mobile }: { mobile: boolean }) {
  const { cols, docs, prefs } = useStore();
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching(true); } };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);
  const today = useToday(), tomorrow = tomorrowOf(today);
  const all = useHomeTasks();
  const rec = useRecordEditor(mobile, true);
  const act = useTaskActions();
  const ed = { ...act, openEdit: rec.openEdit, dialog: rec.dialog, openNew: (p: { date: string }) => rec.openNew({ ...p, cat: filters.length === 1 ? filters[0] : undefined }) };
  const [filters, setFilters] = useState<Section[]>([]);
  const [view, setView] = useState<CalView>('mese');
  const [anchor, setAnchor] = useState(today);
  const [sel, setSel] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 1200);
  const [mTab, setMTab] = useState<'cal' | 'today'>('cal');
  const [mView, setMView] = useState<CalView>('settimana');
  const [mSel, setMSel] = useState(today);
  const sw = useRef<{ x: number; y: number } | null>(null);

  const on = (c: Section) => filters.length === 0 || filters.includes(c);
  // Opzione (Impostazioni): le lezioni dell'orario compaiono anche nel calendario della Home.
  const lessons = prefs.lessonsOnHome && on('scuola') ? lessonTasks(docs.scuola, mobile ? mSel : anchor) : [];
  // Le scadenze di lettura dei libri (data precisa) compaiono nella griglia insieme alle attività.
  const visible = [...all.filter((t) => on(t.cat)), ...lessons, ...(on('lettura') ? bookDeadlines(docs.lettura) : [])];
  const month = (mobile ? mSel : anchor).slice(0, 7);
  const extras = on('lettura') && monthBooks(docs.lettura, month).length > 0
    ? <LetturaCalendarExtras month={month} mobile={mobile} legend={false} onBook={(id) => rec.openEdit({ id: 'libro:' + id, src: id, cat: 'lettura' } as HomeTask)} />
    : null;
  const openTask = (t: HomeTask) => {
    if (t.id.startsWith('lez:')) { try { const prev = JSON.parse(localStorage.getItem('nocturna-ui-scuola') || '{}'); localStorage.setItem('nocturna-ui-scuola', JSON.stringify({ ...(prev && typeof prev === 'object' ? prev : {}), tab: 'orario' })); } catch {} window.location.hash = '#/scuola'; } else ed.openEdit(t);
  };
  const todayT = all.filter((t) => t.date === today).sort(sortT);
  const tomT = all.filter((t) => t.date === tomorrow).sort(sortT);
  const doneN = todayT.filter((t) => t.done).length;
  const overN = all.filter((t) => !t.done && t.date && t.date < today).length;
  const overdueLabel = overN + (overN === 1 ? ' attività scaduta' : ' attività scadute') + ' da recuperare';
  const todayLabel = dayLong(P(today)) + ' ' + P(today).getFullYear();

  if (mobile) {
    return (
      <div onPointerDown={(e) => { sw.current = (e.target as HTMLElement).closest('[data-hscroll]') ? null : { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => { const s = sw.current; sw.current = null; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) setMTab(dx < 0 ? 'today' : 'cal'); }}
        style={{ touchAction: 'pan-y', minHeight: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ flex: 1 }}><H1 size={36}>Calendario</H1></div><button onClick={() => setSearching(true)} aria-label="Cerca in tutte le aree" className="btn btn-secondary btn-icon" style={{ width: 44, height: 44 }}><i className="ph ph-magnifying-glass" style={{ fontSize: 20 }} /></button></div>
          <div style={{ fontSize: 15, color: 'var(--color-neutral-400)' }}>{dayLong(P(today))} {P(today).getFullYear()} · {todayT.length} attività oggi, {doneN} completate</div>
        </div>
        <div style={{ marginBottom: 14 }}><Seg big grid label="Sezione" value={mTab} onChange={setMTab} opts={[['cal', 'Calendario'], ['today', 'To-Do']]} /></div>
        {mTab === 'cal' ? (
          <>
            <div ref={hScroll} data-hscroll="1" role="group" aria-label="Filtra per area" style={{ display: 'flex', gap: 8, overflowX: 'auto', overscrollBehaviorX: 'contain', margin: '0 -18px', padding: '0 18px 12px' }}>
              <FilterChips filters={filters} setFilters={setFilters} mobile />
            </div>
            <MobileCalendar tasks={visible} view={mView} setView={setMView} sel={mSel} setSel={setMSel} today={today} cols={cols} onTask={openTask} />
            <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'var(--color-neutral-500)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-neutral-300)' }} />completata
              <span style={{ width: 8, height: 8, boxSizing: 'border-box', borderRadius: '50%', border: '1.5px solid var(--color-neutral-300)', marginLeft: 8 }} />da fare · il colore è quello dell'area
            </p>
            {extras}
          </>
        ) : (
          <>
            {overN > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, color: 'var(--color-urgent)', marginBottom: 12 }}><i className="ph-fill ph-warning" />{overdueLabel}</div>}
            {[{ label: 'Oggi', sub: shortDay(today), items: todayT }, { label: 'Domani', sub: shortDay(tomorrow), items: tomT }].map((g) => (
              <section key={g.label} style={{ display: 'flex', flexDirection: 'column', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 4 }}>
                  <h3 style={{ fontSize: 19, fontWeight: 500, margin: 0 }}>{g.label}</h3>
                  <span style={{ fontSize: 14.5, color: 'var(--color-neutral-500)' }}>{g.sub}</span>
                </div>
                {g.items.map((t) => <DayItem key={t.id} t={t} today={today} mobile onToggle={() => ed.toggle(t)} onOpen={() => ed.openEdit(t)} />)}
                {!g.items.length && <div style={{ padding: '10px 0', fontSize: 15.5, color: 'var(--color-neutral-500)' }}>Nessuna attività.</div>}
              </section>
            ))}
          </>
        )}
        <button onClick={() => ed.openNew({ date: mTab === 'cal' ? mSel : today })} aria-label="Aggiungi attività" style={fab}><i className="ph-bold ph-plus" style={{ fontSize: 24 }} /></button>
        {ed.dialog}
        {searching && <GlobalSearch mobile onClose={() => setSearching(false)} />}
      </div>
    );
  }

  const other = !!sel && sel !== today && sel !== tomorrow;
  const selT = other ? all.filter((t) => t.date === sel).sort(sortT) : [];
  const selDone = selT.filter((t) => t.done).length;
  // Tempo stimato delle attività ancora da fare (solo i valori leggibili, es. «2 h», «45 min»).
  const est = (items: HomeTask[]) => { const m = sumDurations(items.filter((t) => !t.done).map((t) => t.estimate)).minutes; return m ? ' · circa ' + formatDuration(m) + ' stimate' : ''; };
  const groups = other
    ? [{ label: 'Giorno selezionato', sub: shortDay(sel!), count: selT.length - selDone + ' da fare' + est(selT), items: selT }]
    : [{ label: 'Oggi', sub: shortDay(today), count: todayT.length - doneN + ' da fare' + est(todayT), items: todayT }, { label: 'Domani', sub: shortDay(tomorrow), count: tomT.length + ' attività' + est(tomT), items: tomT }];
  const divider = 'linear-gradient(to bottom, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)';

  return (
    <>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '24px 26px 18px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <H1>Calendario</H1>
            <div style={{ fontSize: 14.5, color: 'var(--color-neutral-400)' }}>{todayLabel} · scadenze di tutte le aree</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={() => setSearching(true)} style={{ flex: 'none', whiteSpace: 'nowrap', minHeight: 38, paddingInline: 14 }}><i className="ph ph-magnifying-glass" style={{ fontSize: 15 }} />Cerca ovunque</button>
          <button className="btn btn-primary" onClick={() => ed.openNew({ date: view === 'giorno' ? anchor : today })} style={{ flex: 'none', whiteSpace: 'nowrap', minHeight: 38, paddingInline: 14 }}><i className="ph-bold ph-plus" style={{ fontSize: 14 }} />Aggiungi attività</button>
        </div>
        <CalToolbar view={view} anchor={anchor} today={today} setAnchor={setAnchor} setView={(v) => { if (v === 'giorno' && sel) setAnchor(sel); setView(v); }} />
        <div role="group" aria-label="Filtra per area" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <FilterChips filters={filters} setFilters={setFilters} />
          <div style={{ flex: 1 }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--color-neutral-400)' }}><i className="ph-fill ph-warning" style={{ color: 'var(--color-urgent)', fontSize: 13 }} />Urgente o scaduta</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <DeskCalendar tasks={visible} view={view} anchor={anchor} sel={sel} today={today} cols={cols} onDay={(k) => { setSel(k); setPanelOpen(true); }} onTask={openTask} onMove={ed.move} />
          {extras}
        </div>
      </main>
      {panelOpen ? (
        <aside aria-label="Oggi e domani" style={{ width: 320, flex: 'none', position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, padding: '26px 18px 18px 20px', overflow: 'auto' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: divider }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <div style={{ fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent-300)' }}>La giornata</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{other ? dayLong(P(sel!)) + ' ' + P(sel!).getFullYear() : todayLabel}</div>
              <div style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>{other ? (selT.length ? selT.length + ' attività, ' + selDone + ' completate' : 'Nessuna attività') : todayT.length + ' attività oggi, ' + doneN + ' completate'}</div>
              {other && <button onClick={() => setSel(null)} style={{ alignSelf: 'flex-start', border: 0, background: 'none', padding: '2px 0', color: 'var(--color-accent-300)', font: 'inherit', fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><i className="ph ph-arrow-u-up-left" />Torna a Oggi e Domani</button>}
              {overN > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: 'var(--color-urgent)' }}><i className="ph-fill ph-warning" />{overdueLabel}</div>}
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setPanelOpen(false)} aria-label="Comprimi pannello" style={{ color: 'var(--color-neutral-400)' }}><i className="ph ph-sidebar-simple" style={{ fontSize: 18, transform: 'scaleX(-1)' }} /></button>
          </div>
          {groups.map((g) => (
            <section key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 6px 6px' }}>
                <h3 style={{ fontSize: 17, fontWeight: 500, margin: 0 }}>{g.label}</h3>
                <span style={{ fontSize: 13.5, color: 'var(--color-neutral-500)' }}>{g.sub}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>{g.count}</span>
              </div>
              {g.items.map((t) => <DayItem key={t.id} t={t} today={today} onToggle={() => ed.toggle(t)} onOpen={() => ed.openEdit(t)} />)}
              {!g.items.length && <div style={{ padding: '4px 6px', fontSize: 14.5, color: 'var(--color-neutral-500)' }}>Niente in programma.</div>}
            </section>
          ))}
          <button className="btn btn-secondary" onClick={() => ed.openNew({ date: other ? sel! : today })} style={{ minHeight: 38, justifyContent: 'flex-start', paddingInline: 12 }}><i className="ph ph-plus" style={{ fontSize: 15 }} />{other ? 'Aggiungi per questo giorno' : 'Aggiungi per oggi'}</button>
        </aside>
      ) : (
        <aside style={{ width: 52, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 24, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: divider }} />
          <button className="btn btn-ghost btn-icon" onClick={() => setPanelOpen(true)} aria-label="Apri Oggi e domani" style={{ color: 'var(--color-neutral-300)' }}><i className="ph ph-list-checks" style={{ fontSize: 20 }} /></button>
          <span style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>{todayT.length - doneN}</span>
        </aside>
      )}
      {ed.dialog}
      {searching && <GlobalSearch mobile={false} onClose={() => setSearching(false)} />}
    </>
  );
}

export const fab: React.CSSProperties = {
  position: 'fixed', right: 20, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', zIndex: 30, width: 58, height: 58, borderRadius: '50%',
  border: '1px solid var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent-900) 85%, var(--color-bg))', color: 'var(--color-accent-300)',
  display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 10px 24px rgba(0,0,0,.5), 0 0 24px color-mix(in srgb, var(--color-accent) 25%, transparent)',
};
