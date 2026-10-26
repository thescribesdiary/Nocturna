import React, { useEffect, useMemo, useState } from 'react';
import { K, P, add, monday } from '../lib/dates';
import { ACT_KIND, CATS, HomeTask, Rec, Section as Sec, catVar, toHome } from '../data/sections';
import { useStore } from '../data/store';
import { useToday } from '../data/hooks';
import { FILTERS, KindDef, PROVA, kindDef, optLabel, DAYS } from '../data/schema';
import { CalToolbar, CalView, DeskCalendar, MobileCalendar } from '../components/Calendar';
import { Kanban, ColumnsEditor } from '../components/Kanban';
import { RecordForm } from '../components/RecordForm';
import { ActCard, FieldList, Panel, StatusPills, SubTitle, catKicker } from '../components/Detail';
import { H1, pill } from '../components/ui';
import { fab } from './Home';
import { bookDeadlines } from '../data/books';
import { LetturaCalendarExtras, BookDetail, BooksView, InspirationDetail, InspirationView, LavoroOverview, LetturaOverview, NoteDetail, NotesView, ProjectDetail, ProjectsView, SubjectDetail, SubjectsView, TimetableView, WritingHome } from './views';
import { useTaskActions } from '../data/actions';

export type Detail = { kind: string; id: string } | null;
export type UI = {
  c: Sec; mobile: boolean;
  openForm: (kind: string, rec?: Partial<Rec>, onSaved?: (id: string) => void) => void;
  openDetail: (kind: string, id: string) => void;
  goTab: (t: string) => void;
};

const TABS: Record<Sec, [string, string, string][]> = {
  scuola: [['kanban', 'Kanban', 'ph-kanban'], ['calendario', 'Calendario', 'ph-calendar-blank'], ['materie', 'Materie', 'ph-books'], ['orario', 'Orario', 'ph-clock']],
  lavoro: [['panoramica', 'Panoramica', 'ph-squares-four'], ['kanban', 'Kanban', 'ph-kanban'], ['calendario', 'Calendario', 'ph-calendar-blank'], ['progetti', 'Progetti', 'ph-folders'], ['appunti', 'Appunti e verbali', 'ph-notepad']],
  lettura: [['panoramica', 'Panoramica', 'ph-squares-four'], ['libri', 'Libri e collaborazioni', 'ph-books'], ['kanban', 'Attività', 'ph-kanban'], ['calendario', 'Calendario', 'ph-calendar-blank']],
  scrittura: [['panoramica', 'Panoramica', 'ph-squares-four'], ['kanban', 'Attività', 'ph-kanban'], ['progetti', 'Progetti', 'ph-folders'], ['ispirazione', 'Ispirazione', 'ph-images'], ['corte', 'Attività della corte', 'ph-crown-simple'], ['calendario', 'Calendario', 'ph-calendar-blank']],
};

export function SectionPage({ c, mobile }: { c: Sec; mobile: boolean }) {
  const st = useStore();
  const today = useToday();
  // Ultima scheda e filtri di ogni sezione, ritrovati come li avevi lasciati.
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem('nocturna-ui-' + c) || '{}'); } catch { return {}; } }, [c]);
  const [tab, setTabS] = useState<string>(TABS[c].some((t) => t[0] === saved.tab) ? saved.tab : TABS[c][0][0]);
  const [q, setQ] = useState('');
  const [flt, setFltS] = useState<Record<string, string[]>>(saved.flt || {});
  const keep = (p: Record<string, any>) => { try { localStorage.setItem('nocturna-ui-' + c, JSON.stringify({ tab, flt, ...p })); } catch {} };
  const setTab = (t: string) => { setTabS(t); keep({ tab: t }); };
  const setFlt = (f: Record<string, string[]>) => { setFltS(f); keep({ flt: f }); };
  const act = useTaskActions();
  const [showF, setShowF] = useState(false);
  const [form, setForm] = useState<{ def: KindDef; rec: Partial<Rec>; onSaved?: (id: string) => void } | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [colsOpen, setColsOpen] = useState(false);
  const [view, setView] = useState<CalView>('mese');
  const [anchor, setAnchor] = useState(today);
  const [mView, setMView] = useState<CalView>('settimana');
  const [mSel, setMSel] = useState(today);
  const [lessons, setLessons] = useState(true);
  // Apertura di un elemento arrivata dalla ricerca globale
  useEffect(() => {
    try {
      const o = JSON.parse(sessionStorage.getItem('nocturna-open') || 'null');
      sessionStorage.removeItem('nocturna-open');
      if (o && o.c === c) setDetail({ kind: o.kind, id: o.id });
    } catch {}
  }, []); // eslint-disable-line

  const ui: UI = {
    c, mobile,
    openForm: (kind, rec = {}, onSaved) => setForm({ def: kindDef(c, kind), rec, onSaved }),
    openDetail: (kind, id) => setDetail({ kind, id }),
    goTab: (t) => { setTab(t); setDetail(null); },
  };

  const actKind = ACT_KIND[c];
  const acts = st.docs[c].filter((x) => x.kind === actKind);
  const ql = q.trim().toLowerCase();
  const fdefs = FILTERS[c];
  const filtered = useMemo(() => acts.filter((x) => {
    if (tab === 'corte' && x.type !== 'corte') return false;
    for (const f of fdefs) { const sel = flt[f.id]; if (sel?.length && !sel.includes(f.get(x))) return false; }
    if (ql) {
      const hay = [x.title, x.notes, x.desc, x.topics].join(' ').toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  }), [acts, flt, ql, tab, fdefs]);
  const nFilters = Object.values(flt).reduce((n, a) => n + (a?.length || 0), 0);

  const C = CATS[c];
  const activityTabs = ['kanban', 'calendario', 'corte'];
  const showTools = activityTabs.includes(tab);

  // Calendario: attività filtrate + lezioni dell'orario (solo Scuola)
  const calTasks: HomeTask[] = useMemo(() => {
    const t = filtered.map((x) => toHome(c, x, st.cols));
    // Lettura: anche le scadenze di lettura dei libri (data precisa), se non filtrate per tipo o libro.
    if (c === 'lettura' && !Object.values(flt).some((a) => a?.length) && !ql) t.push(...bookDeadlines(st.docs.lettura));
    if (c === 'scuola' && lessons) {
      const base = mobile ? P(mSel) : P(anchor);
      const start = add(monday(new Date(base.getFullYear(), base.getMonth(), 1)), -7);
      const ls = st.docs.scuola.filter((x) => x.kind === 'lezione');
      for (let i = 0; i < 56; i++) {
        const d = add(start, i), dow = String(d.getDay());
        ls.filter((l) => String(l.day) === dow).forEach((l) => {
          const subj = st.docs.scuola.find((s) => s.id === l.subject)?.name || 'Lezione';
          t.push({ id: 'lez:' + K(d) + ':' + l.id, src: l.id, cat: 'scuola', title: 'Lezione · ' + subj, date: K(d), time: l.start, status: '', urgent: false, repeat: '', done: false });
        });
      }
    }
    return t;
  }, [filtered, lessons, anchor, mSel, mobile, st.docs, st.cols, c, flt, ql]);
  const onCalTask = (t: HomeTask) => (t.id.startsWith('libro:') ? ui.openDetail('libro', t.src) : t.id.startsWith('lez:') ? ui.openForm('lezione', st.docs.scuola.find((x) => x.id === t.src)) : ui.openDetail(actKind, t.src));

  const newAct = (pre: Partial<Rec> = {}) => {
    const base: Partial<Rec> = { ...pre };
    if (tab === 'corte') base.type = 'corte';
    if (tab === 'calendario') base.date = base.date || (mobile ? mSel : view === 'giorno' ? anchor : today);
    ui.openForm(actKind, base);
  };

  const tabsBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative', paddingBottom: 6, overflowX: mobile ? 'auto' : undefined, margin: mobile ? '0 -18px' : 0, padding: mobile ? '0 18px 6px' : '0 0 6px' }}>
      {!mobile && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: 'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)' }} />}
      {TABS[c].map(([v, l, ic]) => {
        const a = v === tab;
        return (
          <button key={v} onClick={() => ui.goTab(v)} aria-pressed={a} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: mobile ? 40 : 32, padding: '4px 10px', border: 0, borderRadius: 6, background: a ? 'color-mix(in srgb, var(--color-text) 8%, transparent)' : 'transparent', boxShadow: a && mobile ? 'inset 0 -2px 0 var(--color-accent)' : 'none', color: a ? 'var(--color-text)' : 'var(--color-neutral-400)', font: 'inherit', fontSize: mobile ? 15.5 : 14.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <i className={'ph ' + ic} style={{ fontSize: 15 }} />{l}
          </button>
        );
      })}
      {!mobile && <div style={{ flex: 1 }} />}
      {!mobile && showTools && <button className="btn btn-ghost" onClick={() => setColsOpen(true)} style={{ color: 'var(--color-neutral-300)', padding: '6px 9px', fontSize: 14.5 }}><i className="ph ph-columns" style={{ fontSize: 15 }} />Colonne</button>}
      {!mobile && showTools && <button className="btn btn-primary" onClick={() => newAct()} style={{ flex: 'none', whiteSpace: 'nowrap', minHeight: 32, paddingInline: 12, fontSize: 14.5, marginLeft: 4 }}><i className="ph-bold ph-plus" style={{ fontSize: 13 }} />Nuova</button>}
    </div>
  );

  const tools = showTools && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: mobile ? 1 : '0 1 320px', minWidth: 0 }}>
          <i className="ph ph-magnifying-glass" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-500)' }} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per titolo o note" aria-label="Cerca" style={{ paddingLeft: 34, minHeight: mobile ? 44 : 36, width: '100%' }} />
        </div>
        <button className="btn btn-secondary" onClick={() => setShowF(!showF)} aria-expanded={showF} style={{ minHeight: mobile ? 44 : 36 }}><i className="ph ph-funnel-simple" />Filtra{nFilters ? ' · ' + nFilters : ''}</button>
        {mobile && <button className="btn btn-secondary btn-icon" onClick={() => setColsOpen(true)} aria-label="Colonne" style={{ width: 44, height: 44 }}><i className="ph ph-columns" /></button>}
        {nFilters > 0 && <button className="btn btn-ghost" onClick={() => setFlt({})} style={{ color: 'var(--color-accent-300)' }}>Azzera filtri</button>}
        {c === 'scuola' && tab === 'calendario' && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14.5, color: 'var(--color-neutral-300)', cursor: 'pointer' }}><input type="checkbox" checked={lessons} onChange={(e) => setLessons(e.target.checked)} />Mostra lezioni dell'orario</label>
        )}
      </div>
      {showF && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--color-text) 4%, transparent)' }}>
          {fdefs.filter((f) => !(tab === 'corte' && f.id === 'type')).map((f) => {
            const opts = f.opts(st.docs);
            if (!opts.length) return null;
            const sel = flt[f.id] || [];
            return (
              <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>{f.label}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {opts.map((o) => {
                    const a = sel.includes(o[0]);
                    return <button key={o[0]} onClick={() => setFlt({ ...flt, [f.id]: a ? sel.filter((x) => x !== o[0]) : [...sel, o[0]] })} aria-pressed={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: mobile ? 38 : 30, padding: '3px 10px', borderRadius: 999, ...pill(a), font: 'inherit', fontSize: 14, cursor: 'pointer' }}>{o[2] && !o[2].startsWith('#') && <i className={'ph ' + o[2]} />}{o[1].replace(/ \(.*\)/, '')}</button>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  let body: React.ReactNode = null;
  if (tab === 'kanban' || tab === 'corte') {
    body = (
      <>
        {tab === 'corte' && <p style={{ margin: 0, fontSize: 14.5, color: 'var(--color-neutral-400)', maxWidth: 640 }}>Le attività del gruppo di scambio letture. Si creano qui o scegliendo la tipologia «Attività della corte».</p>}
        <Kanban c={c} items={filtered} mobile={mobile} onOpen={(r) => ui.openDetail(actKind, r.id)} onNew={(status) => newAct({ status })} />
      </>
    );
  } else if (tab === 'calendario') {
    const byType = c === 'lettura';
    body = <>
      {mobile
        ? <MobileCalendar tasks={calTasks} view={mView} setView={setMView} sel={mSel} setSel={setMSel} today={today} cols={st.cols} onTask={onCalTask} byType={byType} />
        : <><CalToolbar view={view} anchor={anchor} today={today} setAnchor={setAnchor} setView={setView} /><div><DeskCalendar tasks={calTasks} view={view} anchor={anchor} today={today} cols={st.cols} onDay={(k) => { setAnchor(k); setView('giorno'); }} onTask={onCalTask} onMove={act.move} byType={byType} /></div></>}
      {c === 'lettura' && <LetturaCalendarExtras month={(mobile ? mSel : anchor).slice(0, 7)} mobile={mobile} onBook={(id) => ui.openDetail('libro', id)} />}
    </>;
  } else if (tab === 'materie') body = <SubjectsView ui={ui} />;
  else if (tab === 'orario') body = <TimetableView ui={ui} />;
  else if (tab === 'panoramica') body = c === 'lavoro' ? <LavoroOverview ui={ui} /> : c === 'lettura' ? <LetturaOverview ui={ui} /> : <WritingHome ui={ui} />;
  else if (tab === 'ispirazione') body = <InspirationView ui={ui} />;
  else if (tab === 'progetti') body = <ProjectsView ui={ui} />;
  else if (tab === 'appunti') body = <NotesView ui={ui} />;
  else if (tab === 'libri') body = <BooksView ui={ui} />;

  // Dettagli
  let panel: React.ReactNode = null;
  if (detail) {
    const rec = st.docs[c].find((x) => x.id === detail.id);
    const close = () => setDetail(null);
    if (!rec) panel = null;
    else if (detail.kind === actKind) panel = <ActDetail ui={ui} rec={rec} onClose={close} />;
    else if (detail.kind === 'libro') panel = <BookDetail ui={ui} rec={rec} onClose={close} />;
    else if (detail.kind === 'progetto') panel = <ProjectDetail ui={ui} rec={rec} onClose={close} />;
    else if (detail.kind === 'nota') panel = <NoteDetail ui={ui} rec={rec} onClose={close} />;
    else if (detail.kind === 'materia') panel = <SubjectDetail ui={ui} rec={rec} onClose={close} />;
    else if (detail.kind === 'ispirazione') panel = <InspirationDetail ui={ui} rec={rec} onClose={close} />;
  }

  const fabKind = tab === 'ispirazione' ? 'ispirazione' : tab === 'materie' ? 'materia' : tab === 'orario' ? 'lezione' : tab === 'progetti' || (tab === 'panoramica' && c === 'scrittura') ? 'progetto' : tab === 'appunti' ? 'nota' : tab === 'libri' ? 'libro' : actKind;

  return (
    <main style={mobile ? { display: 'flex', flexDirection: 'column', gap: 14 } : { position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '24px 26px 28px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, paddingTop: mobile ? 4 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: mobile ? 13 : 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: catVar(c) }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: catVar(c) }} />{C.kicker}</div>
        <H1 size={mobile ? 34 : 44}>{C.label}</H1>
        <div style={{ fontSize: 15, color: 'var(--color-neutral-400)', maxWidth: 680 }}>{C.desc}</div>
      </div>
      {tabsBar}
      {tools}
      {body}
      {mobile && <button onClick={() => (fabKind === actKind ? newAct() : ui.openForm(fabKind))} aria-label="Aggiungi" style={fab}><i className="ph-bold ph-plus" style={{ fontSize: 24 }} /></button>}
      {panel}
      {form && <RecordForm def={form.def} rec={form.rec} mobile={mobile} onClose={() => setForm(null)} onSaved={form.onSaved}
        onDelete={form.rec.id ? () => { if (st.removeRec(c, form.rec.id!)) { setForm(null); setDetail(null); } } : undefined} />}
      {colsOpen && <ColumnsEditor c={c} mobile={mobile} onClose={() => setColsOpen(false)} />}
    </main>
  );
}

/** Dettaglio di un'attività, con i collegamenti propri di ogni sezione. */
function ActDetail({ ui, rec, onClose }: { ui: UI; rec: Rec; onClose: () => void }) {
  const st = useStore();
  const act = useTaskActions();
  const c = ui.c;
  const def = kindDef(c, ACT_KIND[c]);
  const sessions = c === 'scuola' && PROVA.includes(rec.type) ? st.docs.scuola.filter((x) => x.kind === 'attivita' && x.linkedTo === rec.id) : [];
  const parent = c === 'scuola' && rec.linkedTo ? st.docs.scuola.find((x) => x.id === rec.linkedTo) : null;
  const book = c === 'lettura' && rec.book ? st.docs.lettura.find((x) => x.id === rec.book) : null;
  const project = (c === 'lavoro' || c === 'scrittura') && rec.project ? st.docs[c].find((x) => x.id === rec.project) : null;
  return (
    <Panel title={rec.title} kicker={catKicker(c)} mobile={ui.mobile} onClose={onClose}
      actions={<>
        <button className="btn btn-secondary" onClick={() => ui.openForm(def.kind, rec)} style={{ minHeight: 40 }}><i className="ph ph-pencil-simple" />Modifica</button>
        <button className="btn btn-secondary" onClick={() => act.duplicate(c, rec.id)} style={{ minHeight: 40 }}><i className="ph ph-copy" />Duplica</button>
        {rec.repeat && <button className="btn btn-secondary" onClick={() => { act.skip(c, rec.id); onClose(); }} style={{ minHeight: 40 }}><i className="ph ph-skip-forward" />Salta questa volta</button>}
        <button className="btn btn-ghost" onClick={() => { st.trashIt(c, rec.id); onClose(); }} style={{ minHeight: 40, color: 'var(--color-urgent)' }}><i className="ph ph-trash" />Elimina</button>
      </>}>
      <SubTitle>Stato</SubTitle>
      <StatusPills c={c} rec={rec} />
      <FieldList def={def} rec={rec} skip={['title', 'status']} />
      {parent && <><SubTitle>Collegata a</SubTitle><ActCard c={c} rec={parent} onClick={() => ui.openDetail('attivita', parent.id)} /></>}
      {book && <button className="btn btn-secondary" onClick={() => ui.openDetail('libro', book.id)} style={{ alignSelf: 'flex-start' }}><i className="ph ph-book-open-text" />Apri il libro «{book.title}»</button>}
      {project && <button className="btn btn-secondary" onClick={() => ui.openDetail('progetto', project.id)} style={{ alignSelf: 'flex-start' }}><i className="ph ph-folder" />Apri il progetto «{project.name || project.title}»</button>}
      {c === 'scuola' && PROVA.includes(rec.type) && (
        <>
          <SubTitle>Sessioni di studio collegate</SubTitle>
          {sessions.map((s) => <ActCard key={s.id} c={c} rec={s} onClick={() => ui.openDetail('attivita', s.id)} />)}
          {!sessions.length && <p style={{ margin: 0, fontSize: 14.5, color: 'var(--color-neutral-500)' }}>Nessuna sessione: distribuisci la preparazione su più giorni.</p>}
          <button className="btn btn-secondary" onClick={() => ui.openForm('attivita', { type: 'studio', subject: rec.subject, linkedTo: rec.id, title: 'Studio: ' + (rec.title || '').replace(/^(Verifica|Interrogazione) (di )?/i, '') })} style={{ alignSelf: 'flex-start' }}><i className="ph ph-plus" />Aggiungi sessione di studio</button>
        </>
      )}
    </Panel>
  );
}

export const dayName = (d: string) => optLabel(DAYS, String(d));
