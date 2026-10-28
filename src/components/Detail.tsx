import React from 'react';
import { GG, P, fmtS } from '../lib/dates';
import { CATS, Rec, Section, catVar, dateOf, isDone, statusLabel, visibleCols, toneColor } from '../data/sections';
import { useStore } from '../data/store';
import { useTaskActions } from '../data/actions';
import { Field, KindDef, Opt, getP, refOf, typeOf, lTypeColor } from '../data/schema';
import { pill } from './ui';
import { Corners } from './Ornaments';
import { useDialog } from './useDialog';

/** Pannello laterale (desktop) o a schermo intero (telefono) con il dettaglio di un elemento. */
export function Panel({ title, kicker, onClose, mobile, children, actions }: { title: string; kicker?: React.ReactNode; onClose: () => void; mobile: boolean; children: React.ReactNode; actions?: React.ReactNode }) {
  const dlg = useDialog<HTMLElement>(onClose);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 45, display: 'flex', justifyContent: 'flex-end', background: 'color-mix(in srgb, var(--color-sidebar) 55%, transparent)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside ref={dlg} role="dialog" aria-modal="true" aria-label={title} style={{ width: mobile ? '100%' : 'min(480px,100%)', height: '100%', overflowY: 'auto', background: 'var(--color-bg)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', padding: mobile ? 'calc(env(safe-area-inset-top, 0px) + 12px) 18px calc(env(safe-area-inset-bottom, 0px) + 28px)' : '22px 24px 28px' }}>
        {!mobile && <Corners size={34} inset={4} />}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            {kicker}
            <h2 style={{ fontSize: mobile ? 24 : 25, fontWeight: 500, margin: 0, lineHeight: 1.2 }}>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 44, height: 44, flex: 'none', border: 0, background: 'none', color: 'var(--color-neutral-400)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 20 }} /></button>
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
        {children}
      </aside>
    </div>
  );
}

export const SubTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 12.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--color-neutral-400)', paddingTop: 6 }}>{children}</div>
);

/** Elenco dei campi compilati di un elemento, secondo lo schema. */
export function FieldList({ def, rec, skip = [] }: { def: KindDef; rec: Rec; skip?: string[] }) {
  const { docs, cols } = useStore();
  const rows: [string, React.ReactNode][] = [];
  const seen = new Set<string>();
  def.groups.forEach((g) => {
    if (g.show && !g.show(rec)) return;
    g.fields.forEach((fl: Field) => {
      if (seen.has(fl.k) || skip.includes(fl.k) || (fl.show && !fl.show(rec))) return;
      seen.add(fl.k);
      const v = getP(rec, fl.k);
      if (v == null || v === '' || v === false || (Array.isArray(v) && !v.length) || (fl.t === 'rating' && !v)) return;
      const opts: Opt[] = typeof fl.opts === 'function' ? fl.opts(docs, rec) : fl.opts || [];
      let out: React.ReactNode = String(v);
      if (fl.t === 'date') out = fmtS(v);
      else if (fl.t === 'month') { const [y, m] = String(v).split('-'); out = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'][+m - 1] + ' ' + y; }
      else if (fl.t === 'choice' || fl.t === 'select') out = opts.find((o) => o[0] === v)?.[1] || (fl.t === 'select' ? '' : String(v));
      else if (fl.t === 'multi') out = (v as string[]).map((x) => opts.find((o) => o[0] === x)?.[1] || x).join(', ');
      else if (fl.t === 'bool') out = 'Sì';
      else if (fl.t === 'status') out = statusLabel(cols, def.section, v);
      else if (fl.t === 'repeat') out = ({ giorno: 'Ogni giorno', settimana: 'Ogni settimana', mese: 'Ogni mese' }[v as string] || '') + (rec.repeatDays?.length ? ' (' + [...rec.repeatDays].sort((a: string, b: string) => ((+a + 6) % 7) - ((+b + 6) % 7)).map((d: string) => GG[+d].toLowerCase()).join(', ') + ')' : '') + (rec.repeatUntil ? ' fino al ' + fmtS(rec.repeatUntil) : '');
      else if (fl.t === 'rating') out = '★'.repeat(v) + '☆'.repeat(5 - v);
      else if (fl.t === 'image') return;
      if (out === '' || out == null) return;
      rows.push([fl.t === 'bool' ? fl.label.replace(/ \(.*\)$/, '') : (fl.labelFn ? fl.labelFn(rec) : fl.label).replace(/ \(facoltativ[ao]\)/, ''), fl.t === 'bool' ? '' : out]);
    });
  });
  if (!rows.length) return null;
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,auto) minmax(0,1fr)', gap: '8px 14px', margin: 0, fontSize: 15 }}>
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt style={{ color: 'var(--color-neutral-400)', fontSize: 14 }}>{k}</dt>
          <dd style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{v === '' ? '✓' : v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** Pulsanti per cambiare stato rapidamente dal dettaglio. */
export function StatusPills({ c, rec }: { c: Section; rec: Rec }) {
  const { cols } = useStore();
  const act = useTaskActions();
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {visibleCols(cols, c).map((col) => {
        const a = col.id === rec.status;
        return (
          <button key={col.id} onClick={() => act.setStatus(c, rec.id, col.id)} aria-pressed={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '4px 11px', borderRadius: 999, ...pill(a), font: 'inherit', fontSize: 14, cursor: 'pointer' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: toneColor(c, col.tone) }} />{col.label}
          </button>
        );
      })}
    </div>
  );
}

export type CardInfo = { title: string; typeLabel: string; icon: string; typeColor?: string; ref: string; dateLabel: string; flag: string; done: boolean; badges: string[] };

export function cardInfo(c: Section, x: Rec, docs: Record<Section, Rec[]>, cols: any, today: string): CardInfo {
  const t = typeOf(c, x.type);
  const date = dateOf(c, x);
  const done = isDone(cols, c, x.status);
  const diff = date ? Math.round((P(date).getTime() - P(today).getTime()) / 864e5) : null;
  const high = c === 'scuola' ? x.priority === 'alta' : c === 'lavoro' ? x.priority === 'alta' || x.priority === 'urgente' : !!x.urgent;
  const flag = done ? '' : diff != null && diff < 0 ? 'Scaduta' : diff === 0 ? 'Oggi' : diff === 1 ? 'Domani' : x.priority === 'urgente' ? 'Urgente' : high ? 'Priorità alta' : '';
  const badges: string[] = [];
  if (c === 'scuola') {
    if (x.grade?.value) badges.push('Voto ' + x.grade.value);
    const n = docs.scuola.filter((s) => s.linkedTo === x.id).length;
    if (n) badges.push(n + (n === 1 ? ' sessione' : ' sessioni'));
  }
  if (c === 'lavoro' && x.blocked) badges.push('Bloccata');
  if (x.repeat) badges.push('Ricorrente');
  const dateLabel = date ? fmtS(date) + (x.time ? ' · ' + x.time : '') : 'Senza data';
  return { title: x.title || '', typeLabel: t[1].replace(/ \(.*\)/, ''), icon: t[2] || 'ph-dots-three-circle', typeColor: c === 'lettura' ? lTypeColor(x.type) : undefined, ref: refOf(c, x, docs), dateLabel: c === 'scuola' && !x.date && x.due ? 'Scadenza ' + fmtS(x.due) : dateLabel, flag, done, badges };
}

/** Scheda di un'attività (bacheche, elenchi, dettagli). */
export function ActCard({ c, rec, onClick, draggable, onDragStart, onDragEnd, big }: { c: Section; rec: Rec; onClick: () => void; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void; big?: boolean }) {
  const { docs, cols } = useStore();
  const today = new Date(); const tk = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const i = cardInfo(c, rec, docs, cols, tk);
  const urgentFlag = i.flag === 'Scaduta' || i.flag === 'Urgente' || i.flag === 'Priorità alta';
  return (
    <button draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick} className="kcard" style={{ opacity: i.done ? 0.6 : 1, cursor: draggable ? 'grab' : 'pointer', padding: big ? '12px 13px' : undefined }}>
      <span style={{ fontSize: big ? 17 : 15.5, lineHeight: 1.3, fontWeight: 500, textDecoration: i.done ? 'line-through' : 'none' }}>{i.title}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: big ? 14 : 13.5, color: 'var(--color-neutral-400)' }}>
        <i className={'ph ' + i.icon} style={{ fontSize: 14, color: i.typeColor || catVar(c) }} />{i.typeLabel}
        {i.ref && <><span>·</span><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{i.ref}</span></>}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: big ? 14 : 13.5, color: 'var(--color-neutral-400)' }}><i className="ph ph-calendar-blank" style={{ fontSize: 13 }} />{i.dateLabel}</span>
      {(i.flag || i.badges.length > 0) && (
        <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {i.flag && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 8px', borderRadius: 999, background: urgentFlag ? 'color-mix(in srgb, var(--color-urgent) 16%, transparent)' : 'color-mix(in srgb, var(--color-accent) 14%, transparent)', fontSize: 13, color: urgentFlag ? 'var(--color-urgent-text)' : 'var(--color-accent-300)' }}>{urgentFlag && <i className="ph-fill ph-warning" />}{i.flag}</span>}
          {i.badges.map((b) => <span key={b} style={{ padding: '1px 8px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-text) 8%, transparent)', fontSize: 13, color: 'var(--color-neutral-300)' }}>{b}</span>)}
        </span>
      )}
    </button>
  );
}

export const catKicker = (c: Section, extra?: string) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: catVar(c) }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: catVar(c) }} />{CATS[c].short}{extra ? ' · ' + extra : ''}
  </div>
);
