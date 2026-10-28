// Ricerca unica su tutte le aree, dalla Home (anche con Ctrl/Cmd + K).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATS, KIND_LABEL, ORDER, Section, catVar, recTitle } from '../data/sections';
import { useStore } from '../data/store';
import { useDialog } from './useDialog';
import { Corners } from './Ornaments';

const FIELDS = ['title', 'name', 'notes', 'desc', 'topics', 'author', 'publisher', 'genre', 'content', 'link', 'linkLabel', 'tag', 'collabName', 'participants', 'decisions', 'projectType'];

export function GlobalSearch({ onClose, mobile }: { onClose: () => void; mobile: boolean }) {
  const dlg = useDialog(onClose);
  const { docs } = useStore();
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const hits = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (ql.length < 2) return [];
    const out: { c: Section; id: string; kind: string; title: string }[] = [];
    ORDER.forEach((c) => docs[c].forEach((x) => {
      if (x.kind === 'lezione') return;
      if (FIELDS.map((f) => (typeof x[f] === 'string' ? x[f] : '')).join(' ').toLowerCase().includes(ql)) out.push({ c, id: x.id, kind: x.kind, title: recTitle(x) });
    }));
    return out.slice(0, 40);
  }, [q, docs]);
  const open = (h: { c: Section; id: string; kind: string }) => {
    try { sessionStorage.setItem('nocturna-open', JSON.stringify({ c: h.c, kind: h.kind, id: h.id })); } catch {}
    onClose();
    window.location.hash = '#/' + h.c;
  };
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', justifyContent: 'center', alignItems: mobile ? 'stretch' : 'flex-start', padding: mobile ? 0 : '12vh 20px 20px', background: 'color-mix(in srgb, var(--color-sidebar) 72%, transparent)' }}>
      <div ref={dlg} role="dialog" aria-modal="true" aria-label="Cerca ovunque" className="dialog" style={{ width: mobile ? '100%' : 'min(600px,100%)', maxHeight: mobile ? '100%' : '70vh', borderRadius: mobile ? 0 : undefined, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        {!mobile && <Corners size={30} inset={4} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <i className="ph ph-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-500)' }} />
            <input ref={ref} className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca in tutte le aree: titoli, note, autori…" aria-label="Cerca ovunque" style={{ paddingLeft: 36, width: '100%', minHeight: 46, fontSize: 16 }} />
          </div>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 44, height: 44, border: 0, background: 'none', color: 'var(--color-neutral-400)', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 20 }} /></button>
        </div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {hits.map((h) => (
            <button key={h.c + h.id} onClick={() => open(h)} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '8px 4px', border: 0, borderBottom: '1px solid color-mix(in srgb, var(--color-text) 7%, transparent)', background: 'none', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, flex: 'none', borderRadius: '50%', background: catVar(h.c) }} />
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 15.5 }}>{h.title}</span>
                <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>{CATS[h.c].label} · {KIND_LABEL[h.kind] || h.kind}</span>
              </span>
            </button>
          ))}
          {q.trim().length >= 2 && !hits.length && <p style={{ margin: '10px 4px', fontSize: 15, color: 'var(--color-neutral-400)' }}>Nessun risultato.</p>}
          {q.trim().length < 2 && <p style={{ margin: '10px 4px', fontSize: 14.5, color: 'var(--color-neutral-500)' }}>Scrivi almeno due lettere. Cerca in attività, libri, progetti, note e ispirazioni.</p>}
        </div>
      </div>
    </div>
  );
}
