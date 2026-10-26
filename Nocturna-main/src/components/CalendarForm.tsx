// Modulo del Calendario generale: è lo stesso modulo di ogni sezione.
// Si sceglie l'area in cima e compaiono i campi di quell'area; in Lettura si sceglie anche
// se aggiungere un libro (con il piano editoriale) o una singola attività.
import React, { useState } from 'react';
import { ACT_KIND, CATS, HomeTask, ORDER, Rec, Section, catVar } from '../data/sections';
import { useStore } from '../data/store';
import { kindDef } from '../data/schema';
import { useToday } from '../data/hooks';
import { RecordForm } from './RecordForm';
import { pill } from './ui';

const LAST = 'nocturna-cal-area';
const readLast = (): Section => { try { const v = localStorage.getItem(LAST) as Section; return ORDER.includes(v) ? v : 'scuola'; } catch { return 'scuola'; } };

/** Il campo data giusto per un'attività nuova di ciascuna area. */
const datePatch = (c: Section, date: string): Record<string, any> => (c === 'lavoro' ? { due: date } : { date });

type Open = { mode: 'new'; date: string; cat?: Section } | { mode: 'edit'; cat: Section; kind: string; rec: Rec };

function NewForm({ date, cat0, mobile, onClose }: { date: string; cat0?: Section; mobile: boolean; onClose: () => void }) {
  const today = useToday();
  const [cat, setCatS] = useState<Section>(cat0 || readLast());
  const [book, setBook] = useState(false);
  const [title, setTitle] = useState('');
  const setCat = (c: Section) => { setCatS(c); try { localStorage.setItem(LAST, c); } catch {} };
  const isBook = cat === 'lettura' && book;
  const def = kindDef(cat, isBook ? 'libro' : ACT_KIND[cat]);
  const rec: Partial<Rec> = isBook ? { title, added: today } : { title, ...datePatch(cat, date) };
  const btn = (on: boolean, onClick: () => void, children: React.ReactNode, color?: string) => (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: mobile ? 'flex-start' : 'center', gap: 8, minHeight: mobile ? 44 : 34, padding: '6px 12px', borderRadius: 8, ...pill(on, color), font: 'inherit', fontSize: mobile ? 16 : 14.5, cursor: 'pointer' }}>{children}</button>
  );
  const top = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--color-divider)' }}>
      <div className="field" style={{ margin: 0 }}>
        <label style={{ fontSize: mobile ? 14.5 : 13.5 }}>Area</label>
        <div style={mobile ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } : { display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ORDER.map((c) => <React.Fragment key={c}>{btn(c === cat, () => setCat(c), <><span style={{ width: 9, height: 9, borderRadius: '50%', background: catVar(c) }} />{CATS[c].short}</>, catVar(c))}</React.Fragment>)}
        </div>
      </div>
      {cat === 'lettura' && (
        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontSize: mobile ? 14.5 : 13.5 }}>Cosa vuoi aggiungere?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {btn(book, () => setBook(true), <><i className="ph ph-book" />Nuovo libro</>)}
            {btn(!book, () => setBook(false), <><i className="ph ph-calendar-plus" />Nuova attività</>)}
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>{book ? 'Il libro con tutti i suoi dati e il piano editoriale (recensione, cover reveal, unboxing…).' : 'Un’attività singola, da collegare a un libro già presente.'}</span>
        </div>
      )}
    </div>
  );
  return <RecordForm key={cat + (isBook ? ':libro' : '')} def={def} rec={rec} mobile={mobile} onClose={onClose} top={top} onDraft={(f) => setTitle(f.title || '')} />;
}

/** Apertura dei moduli dal Calendario generale: nuovo elemento o modifica di uno esistente. */
export function useRecordEditor(mobile: boolean) {
  const st = useStore();
  const [open, setOpen] = useState<Open | null>(null);
  const openNew = (pre: { date: string; cat?: Section }) => setOpen({ mode: 'new', ...pre });
  const openEdit = (t: HomeTask) => {
    const isBook = t.id.startsWith('libro:');
    const rec = st.docs[t.cat].find((x) => x.id === t.src);
    if (rec) setOpen({ mode: 'edit', cat: t.cat, kind: isBook ? 'libro' : ACT_KIND[t.cat], rec });
  };
  const close = () => setOpen(null);
  const dialog = !open ? null : open.mode === 'new'
    ? <NewForm date={open.date} cat0={open.cat} mobile={mobile} onClose={close} />
    : <RecordForm key={open.rec.id} def={kindDef(open.cat, open.kind)} rec={open.rec} mobile={mobile} onClose={close}
        top={<div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: catVar(open.cat) }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: catVar(open.cat) }} />{CATS[open.cat].label}</div>}
        onDelete={() => { if (st.removeRec(open.cat, open.rec.id)) close(); }} />;
  return { openNew, openEdit, dialog };
}
