import React, { useState } from 'react';
import { ACT_KIND, Rec, isDone, visibleCols } from '../data/sections';
import { useStore } from '../data/store';
import { useTaskActions } from '../data/actions';
import { DAYS, Field, KindDef, Opt, getP, optLabel, setP } from '../data/schema';
import { QuickDates, pill } from './ui';
import { Corners } from './Ornaments';
import { PlanEditor, PlanRow, initPlan, savePlan } from './PlanEditor';

const META = ['id', 'createdAt', 'updatedAt', 'notifyAt', 'notifyQueue', 'notifyKinds', 'notifiedAt', 'deletedAt'];
const QUICK = ['date', 'due', 'start', 'deadline', 'agreed'];
const WD: [string, string][] = [['1', 'Lun'], ['2', 'Mar'], ['3', 'Mer'], ['4', 'Gio'], ['5', 'Ven'], ['6', 'Sab'], ['0', 'Dom']];
const REPEAT: Opt[] = [['', 'Mai'], ['giorno', 'Ogni giorno'], ['settimana', 'Ogni settimana'], ['mese', 'Ogni mese']];

/** Ridimensiona un'immagine a `w` px di larghezza in JPEG (copertine ~240 px, avatar quadrati 160 px). */
export function resizeImage(file: File, w: number, square = false): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const c = document.createElement('canvas');
        if (square) {
          const m = Math.min(img.width, img.height);
          c.width = c.height = w;
          c.getContext('2d')!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, w, w);
        } else {
          c.width = w; c.height = Math.round((img.height * w) / img.width);
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        }
        let q = 0.82, out = c.toDataURL('image/jpeg', q);
        while (out.length > 300000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        res(out);
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  });
}

export function RecordForm({ def, rec, mobile, onClose, onSaved, onDelete, top, onDraft }: {
  def: KindDef; rec: Partial<Rec>; mobile: boolean; onClose: () => void; onSaved?: (id: string) => void; onDelete?: () => void;
  /** Contenuto mostrato sotto il titolo (es. la scelta dell'area nel Calendario generale). */
  top?: React.ReactNode;
  /** Riceve la bozza a ogni modifica, per conservare il titolo se si cambia area. */
  onDraft?: (f: Rec) => void;
}) {
  const st = useStore();
  const act = useTaskActions();
  const isAct = def.kind === ACT_KIND[def.section];
  const isNew = !rec.id;
  const [f, setF] = useState<Rec>(() => {
    const base: any = { ...def.blank, ...rec, kind: def.kind };
    if (isAct && !base.status) base.status = visibleCols(st.cols, def.section)[0].id;
    return base;
  });
  const isBook = def.section === 'lettura' && def.kind === 'libro';
  const [plan, setPlan] = useState<PlanRow[]>(() => (isBook ? initPlan(st, rec.id) : []));
  const [orig] = useState(() => JSON.stringify(f) + JSON.stringify(plan));
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: string, v: any) => {
    setF((x) => {
      let n = setP(x, k, v);
      // «Volume completato» e «Volume annullato» si escludono a vicenda.
      if (k === 'volDone' && v) n = { ...n, volCancelled: false };
      if (k === 'volCancelled' && v) n = { ...n, volDone: false };
      onDraft?.(n);
      return n;
    });
    setConfirmClose(false);
  };

  const close = () => {
    if (JSON.stringify(f) + JSON.stringify(plan) !== orig && !confirmClose) { setConfirmClose(true); return; }
    onClose();
  };
  const save = () => {
    for (const [k, msg] of def.required) if (!String(getP(f, k) ?? '').trim()) { st.say(msg); return; }
    const data: any = {};
    Object.keys(f).forEach((k) => { if (!META.includes(k)) data[k] = typeof f[k] === 'string' && k !== 'cover' ? f[k].trim?.() ?? f[k] : f[k]; });
    if (def.kind === 'lezione') {
      const s = st.docs.scuola.find((x) => x.id === data.subject);
      data.title = (s?.name || 'Lezione') + ' · ' + optLabel(DAYS, data.day) + ' ' + data.start;
    }
    if (def.kind === 'nota') {
      const lines = String(data.actionsText || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
      const prev: { text: string; taskId: string | null }[] = (rec.actions as any) || [];
      data.actions = lines.map((text: string) => ({ text, taskId: prev.find((a) => a.text === text)?.taskId || null }));
    }
    let id = rec.id as string;
    if (isNew) id = st.create(def.section, data);
    else {
      const old = st.docs[def.section].find((x) => x.id === id) || (rec as Rec);
      const becameDone = isAct && isDone(st.cols, def.section, data.status) && !isDone(st.cols, def.section, old.status);
      st.update(def.section, id, { ...data, ...(becameDone ? { prevStatus: old.status } : {}) });
      if (becameDone) act.spawnNext(def.section, { ...old, ...data, id });
    }
    const planN = isBook ? savePlan(st, act.setStatus, id, { ...data, id } as Rec, plan) : 0;
    st.say((isNew ? 'Salvato.' : 'Modifiche salvate.') + (planN ? ' Piano editoriale aggiornato.' : ''));
    onSaved?.(id);
    onClose();
  };

  const optsOf = (fl: Field): Opt[] => (typeof fl.opts === 'function' ? fl.opts(st.docs, f) : fl.opts || []);
  const lab = { fontSize: mobile ? 14.5 : 13.5 };
  const big = mobile ? { minHeight: 46, fontSize: 17 } : {};

  const renderField = (fl: Field) => {
    if (fl.show && !fl.show(f)) return null;
    const v = getP(f, fl.k);
    const wrap = (el: React.ReactNode) => (
      <div key={fl.k} className="field" style={{ gridColumn: fl.half ? undefined : '1 / -1', margin: 0, minWidth: 0 }}>
        <label style={lab}>{fl.labelFn ? fl.labelFn(f) : fl.label}</label>{el}
        {fl.hint && <span style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>{fl.hint}</span>}
      </div>
    );
    const pills = (opts: Opt[], on: (o: Opt) => boolean, click: (o: Opt) => void, icon = true) => (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {opts.map((o) => (
          <button key={o[0]} type="button" onClick={() => click(o)} aria-pressed={on(o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: mobile ? 40 : 32, padding: '4px 11px', borderRadius: 8, ...pill(on(o), o[2]?.startsWith('#') ? o[2] : undefined), font: 'inherit', fontSize: mobile ? 15 : 14, cursor: 'pointer' }}>
            {icon && o[2] && (o[2].startsWith('#') ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: o[2] }} /> : <i className={'ph ' + o[2]} style={{ fontSize: 15 }} />)}{o[1]}
          </button>
        ))}
      </div>
    );
    switch (fl.t) {
      case 'text': case 'number':
        return wrap(<input className="input" inputMode={fl.t === 'number' ? 'numeric' : undefined} value={v ?? ''} placeholder={fl.ph} onChange={(e) => set(fl.k, e.target.value)} style={big} />);
      case 'textarea':
        return wrap(<textarea className="input" value={v ?? ''} placeholder={fl.ph} onChange={(e) => set(fl.k, e.target.value)} style={{ minHeight: 76, resize: 'vertical', fontSize: mobile ? 16 : 15, fontFamily: 'inherit', lineHeight: 1.45 }} />);
      case 'date': case 'time': case 'month':
        return wrap(<><input className="input" type={fl.t} value={v ?? ''} onChange={(e) => set(fl.k, e.target.value)} style={big} />{fl.t === 'date' && QUICK.includes(fl.k) && <QuickDates big={mobile} onPick={(k) => set(fl.k, k)} />}</>);
      case 'choice':
        return wrap(pills(optsOf(fl), (o) => v === o[0], (o) => set(fl.k, o[0])));
      case 'multi': {
        const arr: string[] = Array.isArray(v) ? v : [];
        return wrap(pills(optsOf(fl), (o) => arr.includes(o[0]), (o) => set(fl.k, arr.includes(o[0]) ? arr.filter((x) => x !== o[0]) : [...arr, o[0]])));
      }
      case 'select': {
        const opts = optsOf(fl).slice();
        // Un collegamento a un elemento non più in elenco (es. libro chiuso) resta visibile.
        if (v && !opts.some((o) => o[0] === v)) {
          const hit = Object.values(st.docs).flat().find((x) => x.id === v);
          opts.unshift([v, (hit?.title || hit?.name || 'Elemento collegato') + ' (chiuso)']);
        }
        return wrap(
          <select className="input" value={v ?? ''} onChange={(e) => set(fl.k, e.target.value || null)} style={big}>
            <option value="">— Nessuno —</option>
            {opts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
          </select>,
        );
      }
      case 'status':
        return wrap(pills(visibleCols(st.cols, def.section).map((c) => [c.id, c.label] as Opt), (o) => v === o[0], (o) => set(fl.k, o[0]), false));
      case 'repeat':
        return wrap(<>
          {pills(REPEAT.map((o) => [o[0], o[1], 'ph-repeat'] as Opt), (o) => (v || '') === o[0], (o) => set(fl.k, o[0]))}
          {v === 'settimana' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              <span style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>Nei giorni (facoltativo, es. lunedì e giovedì)</span>
              {pills(WD.map(([a, b]) => [a, b] as Opt), (o) => (f.repeatDays || []).includes(o[0]), (o) => { const a: string[] = f.repeatDays || []; set('repeatDays', a.includes(o[0]) ? a.filter((x) => x !== o[0]) : [...a, o[0]]); }, false)}
            </div>
          )}
          {!!v && (
            <div style={{ marginTop: 6 }}>
              <label style={lab}>Fino al (facoltativo)</label>
              <input className="input" type="date" value={f.repeatUntil ?? ''} onChange={(e) => set('repeatUntil', e.target.value)} style={big} />
            </div>
          )}
          {!!v && <span style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>Quando la completi, la prossima viene creata in automatico.</span>}
        </>);
      case 'bool':
        return (
          <button key={fl.k} type="button" onClick={() => set(fl.k, !v)} aria-pressed={!!v} style={{ gridColumn: '1 / -1', display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: mobile ? 44 : 30, border: 0, background: 'none', padding: 0, color: 'var(--color-text)', font: 'inherit', fontSize: mobile ? 16.5 : 15, cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: 20, height: 20, flex: 'none', borderRadius: 6, border: `1.5px solid ${v ? 'var(--color-accent)' : 'var(--color-neutral-500)'}`, background: v ? 'var(--color-accent)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--color-bg)' }}>{v && <i className="ph-bold ph-check" style={{ fontSize: 12 }} />}</span>
            {fl.label}
          </button>
        );
      case 'rating':
        return wrap(
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => set(fl.k, v === n ? 0 : n)} aria-label={n + ' stelle'} style={{ width: 36, height: 36, border: 0, background: 'none', cursor: 'pointer', color: n <= (v || 0) ? 'var(--color-accent-300)' : 'var(--color-neutral-600)', fontSize: 22, padding: 0 }}>
                <i className={(n <= (v || 0) ? 'ph-fill' : 'ph') + ' ph-star'} />
              </button>
            ))}
          </div>,
        );
      case 'image':
        return wrap(
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: fl.w === 1200 ? 110 : 64, height: fl.w === 1200 ? 82 : 92, flex: 'none', borderRadius: 6, background: v ? `url(${v}) center/cover` : 'color-mix(in srgb, var(--color-text) 6%, transparent)', boxShadow: 'var(--shadow-sm)', display: 'grid', placeItems: 'center', color: 'var(--color-neutral-500)' }}>{!v && <i className={'ph ' + (fl.icon || 'ph-book')} style={{ fontSize: 22 }} />}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="btn btn-secondary" style={{ minHeight: 40, position: 'relative', cursor: 'pointer' }}>
                <i className="ph ph-upload-simple" />{v ? 'Cambia immagine' : 'Scegli immagine'}
                <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { set(fl.k, await resizeImage(file, fl.w || 240)); } catch { st.say('Immagine non valida.'); } } }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
              {v && <button type="button" className="btn btn-ghost" onClick={() => set(fl.k, '')} style={{ color: 'var(--color-neutral-300)', minHeight: 32 }}>Rimuovi</button>}
            </div>
          </div>,
        );
    }
  };

  const groups = def.groups.filter((g) => !g.show || g.show(f));
  const body = groups.map((g, i) => {
    const fields = g.fields.filter((fl) => !fl.show || fl.show(f));
    if (!fields.length) return null;
    const filled = fields.some((fl) => { const v = getP(f, fl.k); return Array.isArray(v) ? v.length : v && v !== 'media' && v !== 'darecensire'; });
    const isOpen = !g.adv || open[i] || (!isNew && filled);
    return (
      <section key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {g.title && (g.adv ? (
          <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))} aria-expanded={isOpen} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 0, background: 'none', padding: 0, color: 'var(--color-accent-300)', font: 'inherit', fontSize: 15, cursor: 'pointer' }}>
            <i className={'ph ' + (isOpen ? 'ph-caret-down' : 'ph-caret-right')} />{g.title}
          </button>
        ) : <div style={{ fontSize: 12.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--color-neutral-400)', paddingTop: 4 }}>{g.title}</div>)}
        {isOpen && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>{fields.map(renderField)}</div>}
      </section>
    );
  });

  const planBox = isBook ? <PlanEditor st={st} rows={plan} setRows={setPlan} mobile={mobile} /> : null;
  const heading = isNew ? def.newLabel : def.editLabel;
  const actions = (
    <>
      {confirmClose && <p role="alert" style={{ margin: 0, fontSize: 14, color: 'var(--color-accent-200)' }}>Hai modifiche non salvate. Premi di nuovo «Annulla» per scartarle.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
        {!isNew && onDelete && (
          <button className="btn btn-ghost" onClick={() => { if (!confirmDel) { setConfirmDel(true); return; } onDelete(); }} style={{ marginRight: 'auto', color: 'var(--color-urgent)', minHeight: mobile ? 46 : 36 }}><i className="ph ph-trash" />{confirmDel ? 'Conferma eliminazione' : 'Elimina'}</button>
        )}
        <button className="btn btn-secondary" onClick={close} style={{ minHeight: mobile ? 46 : 36 }}>Annulla</button>
        <button className="btn btn-primary" onClick={save} style={{ minHeight: mobile ? 46 : 36, paddingInline: 18 }}>{isNew ? 'Aggiungi' : 'Salva'}</button>
      </div>
    </>
  );
  const head = (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div className="dialog-title" style={{ flex: 1 }}>{heading}</div>
      <button onClick={close} aria-label="Chiudi" style={{ width: 44, height: 44, border: 0, background: 'none', color: 'var(--color-neutral-400)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 20 }} /></button>
    </div>
  );

  if (mobile)
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'color-mix(in srgb, var(--color-sidebar) 70%, transparent)' }}>
        <div role="dialog" aria-modal="true" aria-label={heading} style={{ maxHeight: '92%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '22px 22px 0 0', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
          {/* Gli angoli restano fermi sul bordo del pannello: scorre solo il contenuto. */}
          <Corners size={30} inset={8} />
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <span style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, background: 'var(--color-neutral-700)' }} />
            {head}{top}{body}{planBox}{actions}
          </div>
        </div>
      </div>
    );
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-sidebar) 70%, transparent)' }} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div role="dialog" aria-modal="true" aria-label={heading} className="dialog" style={{ width: 'min(560px,100%)', maxHeight: '100%', overflow: 'hidden', padding: 0, gap: 0 }}>
        <Corners size={36} inset={5} />
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 'var(--space-4)' }}>{head}{top}{body}{planBox}{actions}</div>
      </div>
    </div>
  );
}
