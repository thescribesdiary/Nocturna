import React, { useState } from 'react';
import { K, P, add, fmtS } from '../lib/dates';
import { Rec, Section, dateOf, isDone } from '../data/sections';
import { useStore } from '../data/store';
import { useToday } from '../data/hooks';
import { BST, COLLABS, DAYS, NK, PRIO4, PROVA, PSTAT, READER, W_PSTAT, kindDef, optLabel, collabWho } from '../data/schema';
import { ActCard, FieldList, Panel, SubTitle, catKicker } from '../components/Detail';
import { pill } from '../components/ui';
import type { UI } from './Section';

const surface: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', border: 0, borderRadius: 10, background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-text)', font: 'inherit', textAlign: 'left', cursor: 'pointer', minWidth: 0 };
const grid = (mobile: boolean): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 });
const muted = { fontSize: 14, color: 'var(--color-neutral-400)' } as const;
const Empty = ({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '24px 0', maxWidth: 480 }}>
    <i className={'ph ' + icon} style={{ fontSize: 34, color: 'var(--color-neutral-500)' }} />
    <p style={{ fontSize: 16, margin: 0 }}>{title}</p>
    <p style={{ fontSize: 14.5, color: 'var(--color-neutral-400)', margin: 0 }}>{text}</p>
    {action}
  </div>
);
const Tag = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '1px 8px', borderRadius: 999, background: color ? `color-mix(in srgb, ${color} 20%, transparent)` : 'color-mix(in srgb, var(--color-text) 8%, transparent)', fontSize: 13, color: 'var(--color-neutral-200)', whiteSpace: 'nowrap' }}>
    {color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />}{children}
  </span>
);
const AddBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button className="btn btn-primary" onClick={onClick} style={{ alignSelf: 'flex-start', minHeight: 38 }}><i className="ph-bold ph-plus" style={{ fontSize: 13 }} />{label}</button>
);
const editDel = (ui: UI, kind: string, rec: Rec, onClose: () => void, st: ReturnType<typeof useStore>, extra?: React.ReactNode) => (
  <>
    <button className="btn btn-secondary" onClick={() => ui.openForm(kind, rec)} style={{ minHeight: 40 }}><i className="ph ph-pencil-simple" />Modifica</button>
    {extra}
    <button className="btn btn-ghost" onClick={() => { st.trashIt(ui.c, rec.id); st.say('Spostato nel cestino.'); onClose(); }} style={{ minHeight: 40, color: 'var(--color-urgent)' }}><i className="ph ph-trash" />Elimina</button>
  </>
);
const actsOf = (st: ReturnType<typeof useStore>, c: Section) => st.docs[c].filter((x) => x.kind === (c === 'lavoro' ? 'task' : 'attivita'));
const byWhen = (c: Section) => (a: Rec, b: Rec) => (dateOf(c, a) || '9999').localeCompare(dateOf(c, b) || '9999');

// ── SCUOLA: materie ────────────────────────────────────────────────────
export function SubjectsView({ ui }: { ui: UI }) {
  const st = useStore();
  const today = useToday();
  const subs = st.docs.scuola.filter((x) => x.kind === 'materia').sort((a, b) => a.name.localeCompare(b.name));
  const acts = actsOf(st, 'scuola');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!ui.mobile && <AddBtn label="Nuova materia" onClick={() => ui.openForm('materia')} />}
      {subs.length ? (
        <div style={grid(ui.mobile)}>
          {subs.map((s) => {
            const a = acts.filter((x) => x.subject === s.id);
            const open = a.filter((x) => !isDone(st.cols, 'scuola', x.status)).length;
            const next = a.filter((x) => PROVA.includes(x.type) && !isDone(st.cols, 'scuola', x.status) && dateOf('scuola', x) >= today).sort(byWhen('scuola'))[0];
            const grades = a.filter((x) => x.grade?.value);
            return (
              <button key={s.id} onClick={() => ui.openDetail('materia', s.id)} style={surface}>
                <span style={{ fontSize: 18, fontWeight: 500 }}>{s.name}</span>
                <span style={muted}>{open} attività aperte{grades.length ? ' · ' + grades.length + (grades.length === 1 ? ' voto' : ' voti') : ''}</span>
                {next && <span style={{ fontSize: 14, color: 'var(--color-accent-300)' }}>Prossima prova: {fmtS(dateOf('scuola', next))}</span>}
              </button>
            );
          })}
        </div>
      ) : <Empty icon="ph-books" title="Nessuna materia" text="Aggiungi le materie per usarle come filtro nella bacheca, nel calendario e nell'orario." action={<AddBtn label="Aggiungi una materia" onClick={() => ui.openForm('materia')} />} />}
    </div>
  );
}

export function SubjectDetail({ ui, rec, onClose }: { ui: UI; rec: Rec; onClose: () => void }) {
  const st = useStore();
  const acts = actsOf(st, 'scuola').filter((x) => x.subject === rec.id).sort(byWhen('scuola'));
  const prove = acts.filter((x) => PROVA.includes(x.type)), sess = acts.filter((x) => x.type === 'studio'), other = acts.filter((x) => !PROVA.includes(x.type) && x.type !== 'studio');
  const list = (t: string, a: Rec[]) => a.length > 0 && <><SubTitle>{t}</SubTitle>{a.map((x) => <ActCard key={x.id} c="scuola" rec={x} onClick={() => ui.openDetail('attivita', x.id)} />)}</>;
  return (
    <Panel title={rec.name} kicker={catKicker('scuola', 'Materia')} mobile={ui.mobile} onClose={onClose} actions={editDel(ui, 'materia', rec, onClose, st)}>
      {list('Verifiche e interrogazioni', prove)}
      {list('Sessioni di studio', sess)}
      {list('Altre attività', other)}
      {!acts.length && <p style={{ margin: 0, ...muted }}>Nessuna attività per questa materia.</p>}
      <button className="btn btn-secondary" onClick={() => ui.openForm('attivita', { subject: rec.id })} style={{ alignSelf: 'flex-start' }}><i className="ph ph-plus" />Aggiungi attività</button>
    </Panel>
  );
}

// ── SCUOLA: orario settimanale ─────────────────────────────────────────
export function TimetableView({ ui }: { ui: UI }) {
  const st = useStore();
  const ls = st.docs.scuola.filter((x) => x.kind === 'lezione').sort((a, b) => String(a.start).localeCompare(String(b.start)));
  const [day, setDay] = useState(String(((new Date().getDay() + 6) % 7) + 1 > 6 ? 1 : ((new Date().getDay() + 6) % 7) + 1));
  const name = (id: string) => st.docs.scuola.find((s) => s.id === id)?.name || 'Lezione';
  const cell = (l: Rec) => (
    <button key={l.id} onClick={() => ui.openForm('lezione', l)} style={{ ...surface, gap: 3, padding: '9px 11px', borderLeft: '3px solid var(--cat-scuola)' }}>
      <span style={{ fontSize: 13.5, color: 'var(--color-neutral-300)' }}>{l.start}–{l.end}</span>
      <span style={{ fontSize: 15.5, fontWeight: 500 }}>{name(l.subject)}</span>
      {l.room && <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>{l.room}</span>}
    </button>
  );
  const intro = <p style={{ margin: 0, ...muted, maxWidth: 640 }}>Le lezioni ricorrenti della settimana. Compaiono nel calendario della sezione, distinte dalle verifiche e dalle consegne.</p>;
  if (ui.mobile)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {intro}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
          {DAYS.map(([v, l]) => <button key={v} onClick={() => setDay(v)} aria-pressed={day === v} style={{ minHeight: 44, borderRadius: 10, ...pill(day === v), font: 'inherit', fontSize: 15, cursor: 'pointer' }}>{l.slice(0, 3)}</button>)}
        </div>
        {ls.filter((l) => String(l.day) === day).map(cell)}
        {!ls.some((l) => String(l.day) === day) && <p style={{ margin: 0, ...muted }}>Nessuna lezione in questo giorno.</p>}
        <button className="btn btn-secondary" onClick={() => ui.openForm('lezione', { day })} style={{ minHeight: 44 }}><i className="ph ph-plus" />Aggiungi lezione di {optLabel(DAYS, day).toLowerCase()}</button>
      </div>
    );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {intro}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(140px,1fr))', gap: 10, overflowX: 'auto' }}>
        {DAYS.map(([v, l]) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-neutral-400)', padding: '4px 2px 8px', borderBottom: '1px solid var(--color-divider)' }}>{l}</div>
            {ls.filter((x) => String(x.day) === v).map(cell)}
            <button onClick={() => ui.openForm('lezione', { day: v })} className="add-ghost"><i className="ph ph-plus" />Lezione</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Elenco compatto per le panoramiche ─────────────────────────────────
function Block({ title, items, ui, empty, icon }: { title: string; items: Rec[]; ui: UI; empty: string; icon: string }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: 12, background: 'color-mix(in srgb, var(--color-text) 3%, transparent)', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className={'ph ' + icon} style={{ color: 'var(--color-accent-300)', fontSize: 17 }} /><h3 style={{ fontSize: 17, fontWeight: 500, margin: 0, flex: 1 }}>{title}</h3><span style={muted}>{items.length}</span></div>
      {items.slice(0, 6).map((x) => <ActCard key={x.id} c={ui.c} rec={x} onClick={() => ui.openDetail(ui.c === 'lavoro' ? 'task' : 'attivita', x.id)} />)}
      {items.length > 6 && <button className="btn btn-ghost" onClick={() => ui.goTab('kanban')} style={{ alignSelf: 'flex-start' }}>Vedi tutte ({items.length})</button>}
      {!items.length && <span style={{ fontSize: 14.5, color: 'var(--color-neutral-500)' }}>{empty}</span>}
    </section>
  );
}

export function LavoroOverview({ ui }: { ui: UI }) {
  const st = useStore();
  const today = useToday(), week = K(add(P(today), 7));
  const open = actsOf(st, 'lavoro').filter((x) => !isDone(st.cols, 'lavoro', x.status));
  const d = (x: Rec) => dateOf('lavoro', x);
  const prio = (x: Rec) => ({ urgente: 4, alta: 3, media: 2, bassa: 1 } as any)[x.priority] || 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: ui.mobile ? '1fr' : 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
      <Block ui={ui} icon="ph-sun" title="Da completare oggi" empty="Niente in scadenza oggi." items={open.filter((x) => d(x) && d(x) <= today).sort((a, b) => prio(b) - prio(a))} />
      <Block ui={ui} icon="ph-hourglass" title="Scadenze imminenti" empty="Nessuna scadenza nei prossimi 7 giorni." items={open.filter((x) => x.due && x.due > today && x.due <= week).sort(byWhen('lavoro'))} />
      <Block ui={ui} icon="ph-play" title="In corso" empty="Nessuna attività in corso." items={open.filter((x) => x.status === 'corso')} />
      <Block ui={ui} icon="ph-hand-palm" title="Bloccate o in attesa" empty="Nessun blocco." items={open.filter((x) => x.blocked || x.status === 'attesa')} />
      <Block ui={ui} icon="ph-users-three" title="Prossime riunioni" empty="Nessuna riunione in programma." items={open.filter((x) => x.type === 'riunione' && d(x) >= today).sort(byWhen('lavoro'))} />
    </div>
  );
}

export function LetturaOverview({ ui }: { ui: UI }) {
  const st = useStore();
  const today = useToday(), soon = K(add(P(today), 14));
  const books = st.docs.lettura.filter((x) => x.kind === 'libro');
  const open = actsOf(st, 'lettura').filter((x) => !isDone(st.cols, 'lettura', x.status));
  const reading = books.filter((b) => b.status === 'inlettura');
  const next = books.filter((b) => b.status === 'daleggere' && (b.tbr || b.deadlineMode !== 'nessuna')).slice(0, 6);
  const deadlines = books.filter((b) => b.status !== 'completato' && ((b.deadlineMode === 'data' && b.deadline && b.deadline <= soon) || (b.deadlineMode === 'mese' && b.deadlineMonth && b.deadlineMonth <= today.slice(0, 7))));
  const bookRow = (b: Rec, extra?: string) => (
    <button key={b.id} onClick={() => ui.openDetail('libro', b.id)} style={{ ...surface, flexDirection: 'row', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
      <span style={{ width: 34, height: 50, flex: 'none', borderRadius: 4, background: b.cover ? `url(${b.cover}) center/cover` : 'color-mix(in srgb, var(--cat-lettura) 18%, transparent)' }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span style={{ fontSize: 15.5, fontWeight: 500 }}>{b.title}</span><span style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>{b.author}{extra ? ' · ' + extra : ''}</span></span>
    </button>
  );
  const bookBlock = (title: string, icon: string, list: Rec[], empty: string, extra?: (b: Rec) => string) => (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: 12, background: 'color-mix(in srgb, var(--color-text) 3%, transparent)', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className={'ph ' + icon} style={{ color: 'var(--color-accent-300)', fontSize: 17 }} /><h3 style={{ fontSize: 17, fontWeight: 500, margin: 0, flex: 1 }}>{title}</h3><span style={muted}>{list.length}</span></div>
      {list.map((b) => bookRow(b, extra?.(b)))}
      {!list.length && <span style={{ fontSize: 14.5, color: 'var(--color-neutral-500)' }}>{empty}</span>}
    </section>
  );
  const dl = (b: Rec) => (b.deadlineMode === 'data' ? 'entro ' + fmtS(b.deadline) : 'entro ' + b.deadlineMonth);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => ui.openForm('libro', { added: today })}><i className="ph-bold ph-plus" />Aggiungi libro</button>
        <button className="btn btn-secondary" onClick={() => ui.openForm('attivita')}><i className="ph ph-plus" />Nuova attività</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: ui.mobile ? '1fr' : 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
        {bookBlock('In lettura', 'ph-book-open', reading, 'Nessun libro in lettura.')}
        {bookBlock('Prossime letture', 'ph-stack', next, 'La TBR è vuota.', (b) => (b.deadlineMode !== 'nessuna' ? dl(b) : 'TBR'))}
        {bookBlock('Scadenze di lettura vicine', 'ph-hourglass', deadlines, 'Nessuna scadenza nelle prossime due settimane.', dl)}
        <Block ui={ui} icon="ph-pen-nib" title="Recensioni da preparare" empty="Nessuna recensione in sospeso." items={open.filter((x) => x.type === 'recensione').sort(byWhen('lettura'))} />
        <Block ui={ui} icon="ph-calendar-star" title="Collaborazioni e scadenze vicine" empty="Niente nei prossimi 14 giorni." items={open.filter((x) => x.date && x.date <= soon).sort(byWhen('lettura'))} />
        <Block ui={ui} icon="ph-megaphone-simple" title="Prossime pubblicazioni" empty="Nessun contenuto programmato." items={open.filter((x) => x.status === 'programmato').sort(byWhen('lettura'))} />
      </div>
    </div>
  );
}

// ── PROGETTI (Lavoro e Scrittura) ──────────────────────────────────────
export function ProjectsView({ ui }: { ui: UI }) {
  const st = useStore();
  const today = useToday();
  const [arch, setArch] = useState(false);
  const c = ui.c, isL = c === 'lavoro';
  const all = st.docs[c].filter((x) => x.kind === 'progetto');
  const list = all.filter((p) => arch || p.status !== 'archiviato').sort((a, b) => (a.name || a.title).localeCompare(b.name || b.title));
  const acts = actsOf(st, c);
  const stat = isL ? PSTAT : W_PSTAT;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!ui.mobile && <AddBtn label="Nuovo progetto" onClick={() => ui.openForm('progetto')} />}
        {isL && all.some((p) => p.status === 'archiviato') && <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 14.5, color: 'var(--color-neutral-300)', cursor: 'pointer' }}><input type="checkbox" checked={arch} onChange={(e) => setArch(e.target.checked)} />Mostra archiviati</label>}
      </div>
      {list.length ? (
        <div style={grid(ui.mobile)}>
          {list.map((p) => {
            const a = acts.filter((x) => x.project === p.id);
            const done = a.filter((x) => isDone(st.cols, c, x.status)).length;
            const blocked = a.filter((x) => x.blocked && !isDone(st.cols, c, x.status)).length;
            const next = a.filter((x) => !isDone(st.cols, c, x.status) && dateOf(c, x) >= today).sort(byWhen(c))[0];
            const s = stat.find((x) => x[0] === p.status);
            return (
              <button key={p.id} onClick={() => ui.openDetail('progetto', p.id)} style={{ ...surface, opacity: p.status === 'archiviato' ? 0.6 : 1 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}><span style={{ fontSize: 18, fontWeight: 500, flex: 1 }}>{p.name || p.title}</span></span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s && <Tag color={s[2]}>{s[1]}</Tag>}
                  {isL && p.priority && <Tag>{optLabel(PRIO4, p.priority)}</Tag>}
                  {!isL && p.projectType && <Tag>{p.projectType}</Tag>}
                  {blocked > 0 && <Tag color="var(--color-urgent)">{blocked} bloccate</Tag>}
                </span>
                {p.desc && <span style={{ fontSize: 14.5, color: 'var(--color-neutral-300)' }}>{p.desc}</span>}
                <span style={muted}>{a.length - done} aperte · {done} completate{next ? ' · prossima scadenza ' + fmtS(dateOf(c, next)) : ''}</span>
              </button>
            );
          })}
        </div>
      ) : <Empty icon="ph-folders" title="Nessun progetto" text={isL ? 'Crea un progetto per raggruppare attività, scadenze e note.' : 'Aggiungi storie, raccolte e altri progetti narrativi.'} action={<AddBtn label="Crea un progetto" onClick={() => ui.openForm('progetto')} />} />}
    </div>
  );
}

export function ProjectDetail({ ui, rec, onClose }: { ui: UI; rec: Rec; onClose: () => void }) {
  const st = useStore();
  const c = ui.c, isL = c === 'lavoro';
  const acts = actsOf(st, c).filter((x) => x.project === rec.id).sort(byWhen(c));
  const notes = isL ? st.docs.lavoro.filter((x) => x.kind === 'nota' && x.project === rec.id) : [];
  const archived = rec.status === 'archiviato';
  return (
    <Panel title={rec.name || rec.title} kicker={catKicker(c, 'Progetto')} mobile={ui.mobile} onClose={onClose}
      actions={editDel(ui, 'progetto', rec, onClose, st, isL && (
        <button className="btn btn-secondary" onClick={() => { st.update(c, rec.id, archived ? { status: rec.prevStatus || 'attivo' } : { status: 'archiviato', prevStatus: rec.status }); st.say(archived ? 'Progetto ripristinato.' : 'Progetto archiviato. Le sue attività restano nel Kanban.'); }} style={{ minHeight: 40 }}><i className="ph ph-archive" />{archived ? 'Ripristina' : 'Archivia'}</button>
      ))}>
      <FieldList def={kindDef(c, 'progetto')} rec={rec} skip={['name', 'title']} />
      <SubTitle>Attività collegate</SubTitle>
      {acts.map((x) => <ActCard key={x.id} c={c} rec={x} onClick={() => ui.openDetail(isL ? 'task' : 'attivita', x.id)} />)}
      {!acts.length && <p style={{ margin: 0, ...muted }}>Nessuna attività collegata.</p>}
      <button className="btn btn-secondary" onClick={() => ui.openForm(isL ? 'task' : 'attivita', { project: rec.id })} style={{ alignSelf: 'flex-start' }}><i className="ph ph-plus" />Aggiungi attività</button>
      {isL && <>
        <SubTitle>Appunti e verbali</SubTitle>
        {notes.map((n) => <button key={n.id} onClick={() => ui.openDetail('nota', n.id)} style={surface}><span style={{ fontSize: 15.5, fontWeight: 500 }}>{n.title}</span><span style={muted}>{optLabel(NK, n.noteType)}{n.date ? ' · ' + fmtS(n.date) : ''}</span></button>)}
        {!notes.length && <p style={{ margin: 0, ...muted }}>Nessuna nota collegata.</p>}
        <button className="btn btn-secondary" onClick={() => ui.openForm('nota', { project: rec.id, date: K(new Date()) })} style={{ alignSelf: 'flex-start' }}><i className="ph ph-plus" />Aggiungi nota</button>
      </>}
    </Panel>
  );
}

// ── LAVORO: appunti e verbali ──────────────────────────────────────────
export function NotesView({ ui }: { ui: UI }) {
  const st = useStore();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const notes = st.docs.lavoro.filter((x) => x.kind === 'nota')
    .filter((n) => !kind || n.noteType === kind)
    .filter((n) => !q.trim() || [n.title, n.content, n.topics, n.decisions, n.participants].join(' ').toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pname = (id: string) => st.docs.lavoro.find((p) => p.id === id)?.name || '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!ui.mobile && <AddBtn label="Nuova nota" onClick={() => ui.openForm('nota', { date: K(new Date()) })} />}
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca negli appunti" aria-label="Cerca negli appunti" style={{ flex: ui.mobile ? '1 1 100%' : '0 1 300px', minHeight: ui.mobile ? 44 : 36 }} />
        {[['', 'Tutte'], ...NK].map(([v, l]) => <button key={v} onClick={() => setKind(v)} aria-pressed={kind === v} style={{ minHeight: ui.mobile ? 40 : 32, padding: '4px 12px', borderRadius: 999, ...pill(kind === v), font: 'inherit', fontSize: 14, cursor: 'pointer' }}>{l}</button>)}
      </div>
      {notes.map((n) => (
        <button key={n.id} onClick={() => ui.openDetail('nota', n.id)} style={{ ...surface, maxWidth: 820 }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><i className={'ph ' + (NK.find((k) => k[0] === n.noteType)?.[2] || 'ph-note')} style={{ color: 'var(--cat-lavoro)' }} /><span style={{ fontSize: 16.5, fontWeight: 500 }}>{n.title}</span></span>
          <span style={muted}>{optLabel(NK, n.noteType)}{n.date ? ' · ' + fmtS(n.date) : ''}{n.project ? ' · ' + pname(n.project) : ''}{n.actions?.length ? ' · ' + n.actions.length + ' punti d’azione' : ''}</span>
          {n.content && <span style={{ fontSize: 14.5, color: 'var(--color-neutral-300)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{n.content}</span>}
        </button>
      ))}
      {!notes.length && <Empty icon="ph-notepad" title="Nessuna nota" text="Annota verbali di riunione, appunti e note tecniche, e collega ognuno al suo progetto." />}
    </div>
  );
}

export function NoteDetail({ ui, rec, onClose }: { ui: UI; rec: Rec; onClose: () => void }) {
  const st = useStore();
  const actions: { text: string; taskId: string | null }[] = rec.actions || [];
  const linkTask = (i: number, taskId: string) => st.update('lavoro', rec.id, { actions: actions.map((a, j) => (j === i ? { ...a, taskId } : a)) });
  return (
    <Panel title={rec.title} kicker={catKicker('lavoro', optLabel(NK, rec.noteType))} mobile={ui.mobile} onClose={onClose} actions={editDel(ui, 'nota', rec, onClose, st)}>
      <FieldList def={kindDef('lavoro', 'nota')} rec={rec} skip={['title', 'noteType', 'actionsText']} />
      {actions.length > 0 && <SubTitle>Punti d'azione</SubTitle>}
      {actions.map((a, i) => {
        const task = a.taskId ? st.docs.lavoro.find((x) => x.id === a.taskId) : null;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 15 }}>• {a.text}</span>
            {task ? <ActCard c="lavoro" rec={task} onClick={() => ui.openDetail('task', task.id)} />
              : <button className="btn btn-secondary" onClick={() => ui.openForm('task', { title: a.text, project: rec.project || null }, (id) => linkTask(i, id))} style={{ alignSelf: 'flex-start', minHeight: 34 }}><i className="ph ph-plus" />Crea attività</button>}
          </div>
        );
      })}
    </Panel>
  );
}

// ── LETTURA: libri e collaborazioni ────────────────────────────────────
export function BooksView({ ui }: { ui: UI }) {
  const st = useStore();
  const today = useToday();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [only, setOnly] = useState<'' | 'tbr' | 'collab'>('');
  const books = st.docs.lettura.filter((x) => x.kind === 'libro')
    .filter((b) => !status.length || status.includes(b.status as string))
    .filter((b) => only === '' || (only === 'tbr' ? b.tbr : b.collabType && b.collabType !== 'nessuna'))
    .filter((b) => !q.trim() || [b.title, b.author, b.genre, b.publisher, b.collabName].join(' ').toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title));
  const chip = (a: boolean, onClick: () => void, label: string, color?: string) => <button key={label} onClick={onClick} aria-pressed={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: ui.mobile ? 40 : 32, padding: '4px 11px', borderRadius: 999, ...pill(a, color), font: 'inherit', fontSize: 14, cursor: 'pointer' }}>{color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />}{label}</button>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!ui.mobile && <AddBtn label="Aggiungi libro" onClick={() => ui.openForm('libro', { added: today })} />}
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca titolo, autore, genere…" aria-label="Cerca libri" style={{ flex: ui.mobile ? '1 1 100%' : '0 1 300px', minHeight: ui.mobile ? 44 : 36 }} />
        {chip(only === 'tbr', () => setOnly(only === 'tbr' ? '' : 'tbr'), 'TBR')}
        {chip(only === 'collab', () => setOnly(only === 'collab' ? '' : 'collab'), 'Collaborazioni')}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {BST.map(([v, l, c]) => chip(status.includes(v), () => setStatus(status.includes(v) ? status.filter((x) => x !== v) : [...status, v]), l, c))}
        {(status.length > 0 || only || q) && <button className="btn btn-ghost" onClick={() => { setStatus([]); setOnly(''); setQ(''); }} style={{ color: 'var(--color-accent-300)' }}>Azzera filtri</button>}
      </div>
      {books.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: ui.mobile ? '1fr' : 'repeat(auto-fill,minmax(300px,1fr))', gap: 10 }}>
          {books.map((b) => {
            const s = BST.find((x) => x[0] === b.status);
            const n = st.docs.lettura.filter((x) => x.kind === 'attivita' && x.book === b.id).length;
            return (
              <button key={b.id} onClick={() => ui.openDetail('libro', b.id)} style={{ ...surface, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 58, height: 86, flex: 'none', borderRadius: 5, background: b.cover ? `url(${b.cover}) center/cover` : 'color-mix(in srgb, var(--cat-lettura) 16%, transparent)', display: 'grid', placeItems: 'center', color: 'var(--cat-lettura)' }}>{!b.cover && <i className="ph ph-book" style={{ fontSize: 22 }} />}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                  <span style={{ fontSize: 16.5, fontWeight: 500, lineHeight: 1.25 }}>{b.title}</span>
                  <span style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>{b.author}</span>
                  <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {s && <Tag color={s[2]}>{s[1]}</Tag>}
                    {b.tbr && <Tag>TBR</Tag>}
                    {b.collabType && b.collabType !== 'nessuna' && <Tag>{optLabel(COLLABS, b.collabType)}</Tag>}
                    {b.reader === 'delegato' && <Tag>Delegato{b.delegate ? ': ' + b.delegate : ''}</Tag>}
                    {b.deadlineMode === 'data' && b.deadline && <Tag color={b.deadline < today && b.status !== 'completato' ? 'var(--color-urgent)' : undefined}>Entro {fmtS(b.deadline)}</Tag>}
                    {b.deadlineMode === 'mese' && b.deadlineMonth && <Tag>Entro {b.deadlineMonth}</Tag>}
                    {n > 0 && <Tag>{n} attività</Tag>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : <Empty icon="ph-books" title="Nessun libro" text="Aggiungi i libri da leggere, quelli in lettura e le collaborazioni." action={<AddBtn label="Aggiungi un libro" onClick={() => ui.openForm('libro', { added: today })} />} />}
    </div>
  );
}

export function BookDetail({ ui, rec, onClose }: { ui: UI; rec: Rec; onClose: () => void }) {
  const st = useStore();
  const plan = st.docs.lettura.filter((x) => x.kind === 'attivita' && x.book === rec.id).sort(byWhen('lettura'));
  const collab = rec.collabType && rec.collabType !== 'nessuna';
  const dup = () => {
    const { id, createdAt, updatedAt, notifyAt, notifyQueue, notifiedAt, deletedAt, ...rest } = rec;
    st.create('lettura', { ...rest, title: rec.title + ' (copia)', kind: 'libro' } as Rec);
    st.say('Libro duplicato. Il piano editoriale non viene copiato.');
  };
  return (
    <Panel title={rec.title} kicker={catKicker('lettura', 'Libro')} mobile={ui.mobile} onClose={onClose}
      actions={editDel(ui, 'libro', rec, onClose, st, <button className="btn btn-secondary" onClick={dup} style={{ minHeight: 40 }}><i className="ph ph-copy" />Duplica</button>)}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {rec.cover && <img src={rec.cover} alt={'Copertina di ' + rec.title} style={{ width: 110, borderRadius: 6, boxShadow: 'var(--shadow-md)' }} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 17 }}>{rec.author}</span>
          <span style={muted}>{rec.publisher}</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BST.filter((s) => s[0] === rec.status).map((s) => <Tag key={s[0]} color={s[2]}>{s[1]}</Tag>)}
            {rec.reader && rec.reader !== 'me' && <Tag>{optLabel(READER, rec.reader)}</Tag>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {BST.map(([v, l, c]) => <button key={v} onClick={() => st.update('lettura', rec.id, { status: v })} aria-pressed={rec.status === v} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '3px 10px', borderRadius: 999, ...pill(rec.status === v, c), font: 'inherit', fontSize: 14, cursor: 'pointer' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />{l}</button>)}
      </div>
      <FieldList def={kindDef('lettura', 'libro')} rec={rec} skip={['title', 'author', 'publisher', 'status', 'cover']} />
      {collab && rec.collabName && <p style={{ margin: 0, ...muted }}>{collabWho(rec.collabType)}: {rec.collabName}</p>}
      <SubTitle>Piano editoriale</SubTitle>
      {plan.map((x) => <ActCard key={x.id} c="lettura" rec={x} onClick={() => ui.openDetail('attivita', x.id)} />)}
      {!plan.length && <p style={{ margin: 0, ...muted }}>Nessuna attività: aggiungi recensione, cover reveal, segnalazioni e altri contenuti, ognuno con la sua data e il suo promemoria.</p>}
      <button className="btn btn-secondary" onClick={() => ui.openForm('attivita', { book: rec.id, title: 'Recensione «' + rec.title + '»', isCollab: !!collab, collabName: collab ? rec.collabName : '', channels: ['blog'] })} style={{ alignSelf: 'flex-start' }}><i className="ph ph-plus" />Aggiungi al piano</button>
    </Panel>
  );
}
