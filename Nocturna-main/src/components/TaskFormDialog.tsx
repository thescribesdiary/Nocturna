import React from 'react';
import { CATS, ORDER, catVar, finalStatus, isDone, reopenStatus, visibleCols } from '../data/sections';
import { TaskForm } from '../data/actions';
import { useStore } from '../data/store';
import { QuickDates, pill } from './ui';

const REPEAT: [string, string][] = [['', 'Mai'], ['giorno', 'Ogni giorno'], ['settimana', 'Ogni settimana'], ['mese', 'Ogni mese']];

function Box({ on, urgent }: { on: boolean; urgent?: boolean }) {
  const c = urgent ? 'var(--color-urgent)' : 'var(--color-accent)';
  return (
    <span style={{ width: 'var(--box)', height: 'var(--box)', borderRadius: 5, border: `1.5px solid ${on ? c : 'var(--color-neutral-500)'}`, background: on ? c : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--color-bg)' }}>
      {on && <i className="ph-bold ph-check" style={{ fontSize: 11 }} />}
    </span>
  );
}

export function TaskFormDialog({ form, setForm, onCancel, onSubmit, onRemove, mobile }: {
  form: TaskForm; setForm: (p: Partial<TaskForm>) => void; onCancel: () => void; onSubmit: () => void; onRemove: () => void; mobile: boolean;
}) {
  const { cols } = useStore();
  const f = form;
  const heading = f.mode === 'new' ? 'Nuova attività' : 'Modifica attività';
  const lab = mobile ? { fontSize: 14.5 } : undefined;
  const inp = mobile ? { minHeight: 46, fontSize: 17 } : {};

  const body = (
    <>
      <div className="field"><label style={lab}>Titolo</label>
        <input className="input" autoFocus={!mobile} value={f.title} onChange={(e) => setForm({ title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && onSubmit()} placeholder="Es. Consegna relazione" style={mobile ? { minHeight: 46, fontSize: 18 } : undefined} />
      </div>
      <div className="field"><label style={lab}>Area</label>
        <div style={mobile ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } : { display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ORDER.map((c) => {
            const a = c === f.cat;
            return (
              <button key={c} onClick={() => setForm({ cat: c, status: visibleCols(cols, c)[0].id, done: false })} aria-pressed={a} style={{ display: mobile ? 'flex' : 'inline-flex', alignItems: 'center', gap: mobile ? 8 : 6, minHeight: mobile ? 44 : 32, padding: mobile ? '6px 12px' : '5px 11px', borderRadius: mobile ? 10 : 999, ...pill(a, catVar(c)), font: 'inherit', fontSize: mobile ? 15.5 : 14, cursor: 'pointer' }}>
                <span style={{ width: mobile ? 9 : 8, height: mobile ? 9 : 8, borderRadius: '50%', background: catVar(c) }} />{CATS[c].short}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field"><label style={lab}>Data</label><input className="input" type="date" value={f.date} onChange={(e) => setForm({ date: e.target.value })} style={inp} /><QuickDates big={mobile} onPick={(k) => setForm({ date: k })} /></div>
        <div className="field"><label style={lab}>{mobile ? 'Ora' : 'Ora (facoltativa)'}</label><input className="input" type="time" value={f.time} onChange={(e) => setForm({ time: e.target.value })} style={inp} /></div>
      </div>
      <div className="field"><label style={lab}>Stato</label>
        <div style={{ display: 'flex', gap: mobile ? 8 : 6, flexWrap: 'wrap' }}>
          {visibleCols(cols, f.cat).map((o) => {
            const a = o.id === f.status;
            return (
              <button key={o.id} onClick={() => setForm({ status: o.id, done: !!o.done })} aria-pressed={a} style={{ minHeight: mobile ? 40 : 30, padding: mobile ? '6px 12px' : '4px 10px', borderRadius: mobile ? 8 : 6, ...pill(a), font: 'inherit', fontSize: mobile ? 15 : 14, cursor: 'pointer' }}>{o.label}</button>
            );
          })}
        </div>
      </div>
      <div className="field"><label>Ripeti</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {REPEAT.map(([v, l]) => {
            const a = (f.repeat || '') === v;
            return (
              <button key={v} onClick={() => setForm({ repeat: v })} aria-pressed={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '5px 12px', borderRadius: 999, ...pill(a), font: 'inherit', fontSize: 13.5, cursor: 'pointer' }}>
                <i className="ph ph-repeat" style={{ fontSize: 14 }} />{l}
              </button>
            );
          })}
        </div>
        {!!f.repeat && <span style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>Quando la completi, la prossima viene creata in automatico.</span>}
      </div>
      <div style={{ display: 'flex', gap: mobile ? 20 : 18, flexWrap: 'wrap', ['--box' as any]: mobile ? '22px' : '18px' }}>
        <button onClick={() => setForm({ urgent: !f.urgent })} aria-pressed={f.urgent} style={{ display: 'inline-flex', alignItems: 'center', gap: mobile ? 10 : 8, minHeight: mobile ? 44 : undefined, border: 0, background: 'none', padding: 0, color: 'var(--color-text)', font: 'inherit', fontSize: mobile ? 17 : 15, cursor: 'pointer' }}><Box on={f.urgent} urgent />Urgente</button>
        {f.mode === 'edit' && (
          <button onClick={() => setForm(f.done ? { done: false, status: reopenStatus(cols, f.cat) } : { done: true, status: finalStatus(cols, f.cat) })} aria-pressed={f.done} style={{ display: 'inline-flex', alignItems: 'center', gap: mobile ? 10 : 8, minHeight: mobile ? 44 : undefined, border: 0, background: 'none', padding: 0, color: 'var(--color-text)', font: 'inherit', fontSize: mobile ? 17 : 15, cursor: 'pointer' }}><Box on={f.done} />Completata</button>
        )}
      </div>
    </>
  );

  if (mobile)
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'color-mix(in srgb, var(--color-sidebar) 70%, transparent)' }} onClick={(e) => e.target === e.currentTarget && onCancel()}>
        <div role="dialog" aria-modal="true" aria-label={heading} style={{ maxHeight: '88%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 30px)', borderRadius: '22px 22px 0 0', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
          <span style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, background: 'var(--color-neutral-700)' }} />
          <div style={{ display: 'flex', alignItems: 'center' }}><div className="dialog-title" style={{ flex: 1 }}>{heading}</div><button onClick={onCancel} aria-label="Chiudi" style={{ width: 44, height: 44, border: 0, background: 'none', color: 'var(--color-neutral-400)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 20 }} /></button></div>
          {body}
          {f.mode === 'edit' && <button className="btn btn-secondary" onClick={onRemove} style={{ minHeight: 46, fontSize: 16, color: 'var(--color-urgent)', borderColor: 'color-mix(in srgb, var(--color-urgent) 45%, transparent)' }}><i className="ph ph-trash" />Elimina attività</button>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onCancel} style={{ minHeight: 46, fontSize: 17 }}>Annulla</button>
            <button className="btn btn-primary" onClick={onSubmit} style={{ minHeight: 46, fontSize: 17 }}>{f.mode === 'new' ? 'Aggiungi' : 'Salva'}</button>
          </div>
        </div>
      </div>
    );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-sidebar) 70%, transparent)' }} onClick={(e) => e.target === e.currentTarget && onCancel()} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div role="dialog" aria-modal="true" aria-label={heading} className="dialog" style={{ width: 'min(480px,100%)', gap: 14, maxHeight: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}><div className="dialog-title" style={{ flex: 1 }}>{heading}</div><button className="btn btn-ghost btn-icon" onClick={onCancel} aria-label="Chiudi" style={{ color: 'var(--color-neutral-400)' }}><i className="ph ph-x" style={{ fontSize: 18 }} /></button></div>
        {body}
        <div className="dialog-actions">
          {f.mode === 'edit' && <button className="btn btn-ghost" onClick={onRemove} style={{ marginRight: 'auto', color: 'var(--color-urgent)' }}><i className="ph ph-trash" />Elimina</button>}
          <button className="btn btn-secondary" onClick={onCancel}>Annulla</button>
          <button className="btn btn-primary" onClick={onSubmit}>{f.mode === 'new' ? 'Aggiungi' : 'Salva'}</button>
        </div>
      </div>
    </div>
  );
}
