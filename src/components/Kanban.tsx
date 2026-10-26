import React, { useState } from 'react';
import { Column, Rec, Section, colsOf, dateOf, toneColor, visibleCols } from '../data/sections';
import { useStore } from '../data/store';
import { useTaskActions } from '../data/actions';
import { ActCard } from './Detail';
import { hScroll, pill } from './ui';

const byDate = (c: Section) => (a: Rec, b: Rec) => (dateOf(c, a) || '9999').localeCompare(dateOf(c, b) || '9999') || (a.time || '99').localeCompare(b.time || '99');

export function Kanban({ c, items, mobile, onOpen, onNew }: { c: Section; items: Rec[]; mobile: boolean; onOpen: (r: Rec) => void; onNew: (status: string) => void }) {
  const { cols } = useStore();
  const act = useTaskActions();
  const columns = visibleCols(cols, c);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [mCol, setMCol] = useState<string>(columns[1]?.id || columns[0].id);

  if (mobile) {
    const cur = columns.find((x) => x.id === mCol) || columns[0];
    const cards = items.filter((t) => t.status === cur.id).sort(byDate(c));
    return (
      <>
        <div ref={hScroll} data-hscroll="1" role="tablist" aria-label="Colonne" style={{ display: 'flex', gap: 8, overflowX: 'auto', overscrollBehaviorX: 'contain', margin: '0 -18px', padding: '0 18px 14px' }}>
          {columns.map((col) => {
            const a = col.id === cur.id;
            return (
              <button key={col.id} role="tab" aria-selected={a} onClick={() => setMCol(col.id)} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 40, padding: '6px 14px 6px 12px', borderRadius: 999, ...pill(a), font: 'inherit', fontSize: 15.5, cursor: 'pointer' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: toneColor(c, col.tone) }} />{col.label}
                <span style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>{items.filter((t) => t.status === col.id).length}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, borderRadius: 12, background: `color-mix(in srgb, ${toneColor(c, cur.tone)} 7%, transparent)` }}>
          {cards.map((r) => <ActCard key={r.id} c={c} rec={r} big onClick={() => onOpen(r)} />)}
          {!cards.length && <div style={{ padding: '12px 4px', fontSize: 15.5, color: 'var(--color-neutral-500)' }}>Nessuna attività in questa colonna.</div>}
          <button onClick={() => onNew(cur.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '6px 8px', border: 0, borderRadius: 8, background: 'transparent', color: 'var(--color-neutral-400)', font: 'inherit', fontSize: 15.5, textAlign: 'left', cursor: 'pointer' }}><i className="ph ph-plus" />Aggiungi in «{cur.label}»</button>
        </div>
      </>
    );
  }

  return (
    <div ref={hScroll} data-hscroll="1" style={{ display: 'flex', gap: 10, overflowX: 'auto', alignItems: 'flex-start', padding: '2px 0 12px', flex: 'none' }}>
      {columns.map((col) => {
        const cards = items.filter((t) => t.status === col.id).sort(byDate(c));
        const tone = toneColor(c, col.tone), isOver = over === col.id && !!drag;
        return (
          <section key={col.id} onDragOver={(e) => { e.preventDefault(); if (over !== col.id) setOver(col.id); }}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || drag; setDrag(null); setOver(null); if (id) act.setStatus(c, id, col.id); }}
            style={{ width: 272, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6, padding: 8, borderRadius: 10, background: `color-mix(in srgb, ${tone} ${isOver ? 14 : 6}%, transparent)`, boxShadow: isOver ? `inset 0 0 0 1px ${tone}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 2px 4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px 2px 8px', borderRadius: 999, background: `color-mix(in srgb, ${tone} 22%, transparent)`, fontSize: 14, whiteSpace: 'nowrap' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: tone }} />{col.label}</span>
              <span style={{ fontSize: 13.5, color: 'var(--color-neutral-500)' }}>{cards.length}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => onNew(col.id)} aria-label={'Nuova attività in ' + col.label} className="icon-ghost"><i className="ph ph-plus" style={{ fontSize: 15 }} /></button>
            </div>
            {cards.map((r) => (
              <ActCard key={r.id} c={c} rec={r} draggable onClick={() => onOpen(r)}
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', r.id); e.dataTransfer.effectAllowed = 'move'; setDrag(r.id); }}
                onDragEnd={() => { setDrag(null); setOver(null); }} />
            ))}
            <button onClick={() => onNew(col.id)} className="add-ghost"><i className="ph ph-plus" style={{ fontSize: 14 }} />Nuova</button>
          </section>
        );
      })}
    </div>
  );
}

/** Personalizzazione delle colonne di una sezione: rinomina, riordina, aggiungi, nascondi. */
export function ColumnsEditor({ c, onClose, mobile }: { c: Section; onClose: () => void; mobile: boolean }) {
  const { cols, setCols, docs, say } = useStore();
  const [list, setList] = useState<Column[]>(() => colsOf(cols, c).map((x) => ({ ...x })));
  const count = (id: string) => docs[c].filter((x) => x.status === id && x.kind !== 'materia' && x.kind !== 'lezione' && x.kind !== 'progetto' && x.kind !== 'libro' && x.kind !== 'nota').length;
  const upd = (i: number, p: Partial<Column>) => setList((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setList((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const save = () => {
    if (list.some((x) => !x.label.trim())) { say('Ogni colonna deve avere un nome.'); return; }
    if (!list.some((x) => !x.hidden)) { say('Almeno una colonna deve restare visibile.'); return; }
    if (!list.some((x) => x.done && !x.hidden)) { say('Serve almeno una colonna visibile che conta come «completata».'); return; }
    setCols(c, list.map((x) => ({ ...x, label: x.label.trim() })));
    say('Colonne aggiornate.');
    onClose();
  };
  const hiddenWithItems = list.filter((x) => x.hidden && count(x.id) > 0);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'grid', placeItems: mobile ? 'end stretch' : 'center', padding: mobile ? 0 : 20, background: 'color-mix(in srgb, var(--color-sidebar) 70%, transparent)' }}>
      <div role="dialog" aria-modal="true" aria-label="Colonne della bacheca" className="dialog" style={{ width: mobile ? '100%' : 'min(560px,100%)', maxHeight: mobile ? '90%' : '100%', overflowY: 'auto', gap: 12, borderRadius: mobile ? '22px 22px 0 0' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="dialog-title" style={{ flex: 1 }}>Colonne della bacheca</div>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 44, height: 44, border: 0, background: 'none', color: 'var(--color-neutral-400)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 20 }} /></button>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-neutral-400)' }}>Rinomina, riordina, aggiungi o nascondi le colonne. Le attività restano collegate anche se cambi il nome.</p>
        {list.map((col, i) => (
          <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--color-text) 4%, transparent)', opacity: col.hidden ? 0.65 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: toneColor(c, col.tone) }} />
              <input className="input" value={col.label} onChange={(e) => upd(i, { label: e.target.value })} aria-label="Nome della colonna" style={{ flex: 1, minHeight: 40 }} />
              <button className="btn btn-secondary btn-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Sposta su"><i className="ph ph-arrow-up" /></button>
              <button className="btn btn-secondary btn-icon" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Sposta giù"><i className="ph ph-arrow-down" /></button>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 14.5, alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={!col.hidden} onChange={(e) => upd(i, { hidden: !e.target.checked })} />Visibile</label>
              <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={!!col.done} onChange={(e) => upd(i, { done: e.target.checked, tone: e.target.checked ? 'done' : col.tone === 'done' ? 'todo' : col.tone })} />Conta come completata</label>
              <span style={{ color: 'var(--color-neutral-500)' }}>{count(col.id)} attività</span>
              {col.id.startsWith('c_') && count(col.id) === 0 && <button className="btn btn-ghost" onClick={() => setList((l) => l.filter((_, j) => j !== i))} style={{ color: 'var(--color-urgent)', marginLeft: 'auto' }}><i className="ph ph-trash" />Rimuovi</button>}
            </div>
          </div>
        ))}
        <button className="btn btn-secondary" onClick={() => setList((l) => [...l, { id: 'c_' + Date.now().toString(36), label: 'Nuova colonna', tone: 'todo' }])} style={{ alignSelf: 'flex-start' }}><i className="ph ph-plus" />Aggiungi colonna</button>
        {hiddenWithItems.length > 0 && <p style={{ margin: 0, fontSize: 14, color: 'var(--color-accent-200)' }}>Le attività delle colonne nascoste non compaiono nella bacheca, ma restano nel calendario e nella Home.</p>}
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => setList(colsOf(undefined, c).map((x) => ({ ...x })))} style={{ marginRight: 'auto', color: 'var(--color-neutral-300)' }}>Ripristina predefinite</button>
          <button className="btn btn-secondary" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={save}>Salva</button>
        </div>
      </div>
    </div>
  );
}
