// Piano editoriale di un libro, modificabile direttamente nel modulo del libro:
// ogni riga è un'attività di Lettura collegata al libro (recensione, cover reveal, unboxing…).
import React from 'react';
import { NEW_ACT, Rec, isDone, visibleCols, toneColor } from '../data/sections';
import { Store } from '../data/store';
import { REMIND, Opt, lChannels, lTypeColor, lTypes, optLabel } from '../data/schema';
import { QuickDates, pill } from './ui';

export type PlanRow = { key: string; id?: string; type: string; title: string; date: string; time: string; reminder: string; channels: string[]; status: string; del?: boolean };

const rowOf = (x: Rec): PlanRow => ({ key: x.id, id: x.id, type: x.type || 'altro', title: x.title || '', date: x.date || '', time: x.time || '', reminder: x.reminder ?? '', channels: Array.isArray(x.channels) ? x.channels : [], status: x.status || '' });
export const initPlan = (st: Store, bookId?: string): PlanRow[] =>
  bookId ? st.docs.lettura.filter((x) => x.kind === 'attivita' && x.book === bookId).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).map(rowOf) : [];

/** Salva le righe del piano: crea le nuove, aggiorna le modificate, sposta nel cestino quelle rimosse. */
export function savePlan(st: Store, setStatus: (c: 'lettura', id: string, s: string) => void, bookId: string, book: Rec, rows: PlanRow[]) {
  const collab = book.collabType && book.collabType !== 'nessuna';
  let n = 0;
  rows.forEach((r) => {
    if (r.del) { if (r.id) { st.update('lettura', r.id, { deletedAt: Date.now() }); n++; } return; }
    const label = optLabel(lTypes(), r.type).replace(/ \(.*\)/, '') || 'Attività';
    const t = r.title.trim();
    const title = t && t !== label ? t : label + ' «' + (book.title || '').trim() + '»';
    const data = { type: r.type, title, date: r.date, time: r.time, reminder: r.reminder, channels: r.channels, book: bookId };
    if (!r.id) {
      st.create('lettura', { ...NEW_ACT.lettura, kind: 'attivita', ...data, status: r.status, isCollab: !!collab, collabName: collab ? book.collabName || '' : '', repeat: '' } as unknown as Rec);
      n++;
      return;
    }
    const old = st.docs.lettura.find((x) => x.id === r.id);
    if (!old) return;
    const changed = Object.entries(data).some(([k, v]) => JSON.stringify(old[k] ?? '') !== JSON.stringify(v ?? ''));
    if (changed) { st.update('lettura', r.id, data); n++; }
    if (r.status !== old.status) { setStatus('lettura', r.id, r.status); n++; }
  });
  return n;
}

export function PlanEditor({ st, rows, setRows, mobile }: { st: Store; rows: PlanRow[]; setRows: (f: (r: PlanRow[]) => PlanRow[]) => void; mobile: boolean }) {
  const cols = visibleCols(st.cols, 'lettura');
  const types = lTypes(), chans = lChannels();
  const live = rows.filter((r) => !r.del);
  const done = live.filter((r) => isDone(st.cols, 'lettura', r.status)).length;
  const patch = (key: string, p: Partial<PlanRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const add = () => {
    const t = types[0] || ['altro', 'Altro'];
    setRows((rs) => [...rs, { key: 'new' + Date.now() + Math.random(), type: t[0], title: t[1].replace(/ \(.*\)/, ''), date: '', time: '', reminder: '', channels: chans[0] ? [chans[0][0]] : [], status: cols[0]?.id || '' }]);
  };
  const big = mobile ? { minHeight: 46, fontSize: 17 } : {};
  const chip = (on: boolean, onClick: () => void, label: React.ReactNode, color?: string) => (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: mobile ? 40 : 32, padding: '4px 11px', borderRadius: 8, ...pill(on, color), font: 'inherit', fontSize: mobile ? 15 : 14, cursor: 'pointer' }}>{label}</button>
  );
  const lab: React.CSSProperties = { fontSize: mobile ? 14.5 : 13.5, color: 'var(--color-neutral-300)' };

  return (
    <section aria-label="Piano editoriale" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: mobile ? '14px 12px' : '14px 16px', borderRadius: 12, background: 'color-mix(in srgb, var(--cat-lettura) 7%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--cat-lettura) 22%, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <i className="ph ph-calendar-star" style={{ fontSize: 18, color: 'var(--cat-lettura)' }} />
        <span style={{ fontSize: 16.5, fontWeight: 500, flex: 1 }}>Piano editoriale{live.length ? ' · ' + done + '/' + live.length + ' completate' : ''}</span>
        <button type="button" className="btn btn-secondary" onClick={add} style={{ minHeight: mobile ? 42 : 34 }}><i className="ph ph-plus" />Aggiungi attività</button>
      </div>
      {!live.length && <span style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>Nessuna attività. Aggiungi recensione, tappa del blog tour, cover reveal, segnalazione o unboxing, ognuna con data, promemoria e canali.</span>}
      {live.map((r) => (
        <div key={r.key} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 10, background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', borderLeft: '3px solid ' + lTypeColor(r.type) }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="input" aria-label="Tipo di attività" value={r.type} onChange={(e) => {
              const nl = optLabel(types, e.target.value).replace(/ \(.*\)/, ''), ol = optLabel(types, r.type).replace(/ \(.*\)/, '');
              patch(r.key, { type: e.target.value, ...(r.title.trim() === '' || r.title.trim() === ol ? { title: nl } : {}) });
            }} style={{ flex: 1, minWidth: 0, ...big }}>
              {types.map((o: Opt) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
              {!types.some((o) => o[0] === r.type) && <option value={r.type}>{r.type}</option>}
            </select>
            <button type="button" onClick={() => (r.id ? patch(r.key, { del: true }) : setRows((rs) => rs.filter((x) => x.key !== r.key)))} aria-label="Rimuovi questa attività dal piano" title="Rimuovi" style={{ width: 40, height: 40, flex: 'none', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--color-urgent) 45%, transparent)', background: 'none', color: 'var(--color-urgent)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 17 }} /></button>
          </div>
          <input className="input" aria-label="Titolo dell'attività" value={r.title} onChange={(e) => patch(r.key, { title: e.target.value })} placeholder="Titolo" style={big} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
            <div className="field" style={{ margin: 0, minWidth: 0 }}><label style={lab}>Data</label><input className="input" type="date" value={r.date} onChange={(e) => patch(r.key, { date: e.target.value })} style={big} /></div>
            <div className="field" style={{ margin: 0, minWidth: 0 }}><label style={lab}>Ora (facoltativa)</label><input className="input" type="time" value={r.time} onChange={(e) => patch(r.key, { time: e.target.value })} style={big} /></div>
          </div>
          <QuickDates big={mobile} onPick={(k) => patch(r.key, { date: k })} />
          <div className="field" style={{ margin: 0 }}>
            <label style={lab}><i className="ph ph-bell" /> Promemoria</label>
            <select className="input" value={r.reminder} onChange={(e) => patch(r.key, { reminder: e.target.value })} style={big}>
              {REMIND.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
            </select>
            {!r.reminder && <span style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>Nessun avviso anticipato. Se c'è un orario, l'avviso arriva comunque 15 minuti prima.</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={lab}>Canali</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {chans.map((o) => { const on = r.channels.includes(o[0]); return <React.Fragment key={o[0]}>{chip(on, () => patch(r.key, { channels: on ? r.channels.filter((x) => x !== o[0]) : [...r.channels, o[0]] }), <>{o[2] && <i className={'ph ' + o[2]} style={{ fontSize: 15 }} />}{o[1]}{on && <i className="ph-bold ph-check" style={{ fontSize: 11 }} />}</>)}</React.Fragment>; })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px dashed var(--color-neutral-700)' }}>
            <span style={lab}>Avanzamento</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cols.map((c) => <React.Fragment key={c.id}>{chip(r.status === c.id, () => patch(r.key, { status: c.id }), <><span style={{ width: 7, height: 7, borderRadius: '50%', background: toneColor('lettura', c.tone) }} />{c.label}</>)}</React.Fragment>)}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
