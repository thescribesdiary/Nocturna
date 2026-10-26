import React, { useState } from 'react';
import { CATS, ORDER } from '../data/sections';
import { SyncState, useStore } from '../data/store';
import { Route } from './ui';

const SYNC: Record<SyncState, [string, string, string, string]> = {
  sincronia: ['In sincronia', 'ph ph-cloud-check', 'var(--color-neutral-300)', 'Tutti i dati sono salvati online e allineati sui tuoi dispositivi.'],
  attesa: ['Modifiche in attesa', 'ph ph-cloud-arrow-up', '#d9a878', 'Alcune modifiche stanno per essere inviate: compariranno sugli altri dispositivi tra poco.'],
  offline: ['Offline', 'ph ph-cloud-slash', 'var(--color-urgent)', 'Sei offline: puoi continuare a lavorare, le modifiche verranno inviate al ritorno della connessione.'],
};

type NavItem = { key: Route; label: string; sub?: string; icon: string; color?: string };
const navHome: NavItem[] = [{ key: '', label: 'Calendario', icon: 'ph-calendar-blank' }];
const navAreas: NavItem[] = ORDER.map((c) => ({ key: c, label: CATS[c].label, sub: CATS[c].sub, icon: CATS[c].icon, color: `var(--cat-${c})` }));

function SyncButton({ compact }: { compact?: boolean }) {
  const { sync, say } = useStore();
  const [label, icon, color, info] = SYNC[sync];
  if (compact)
    return (
      <button onClick={() => say(info)} aria-label={'Stato sincronizzazione: ' + label} style={{ width: 44, height: 44, border: 0, background: 'none', color, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
        <i className={icon} style={{ fontSize: 21 }} />
      </button>
    );
  return (
    <button onClick={() => say(info)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 10px', border: 0, borderRadius: 8, background: 'color-mix(in srgb, var(--color-text) 4%, transparent)', color: 'var(--color-neutral-400)', font: 'inherit', fontSize: 13.5, cursor: 'pointer', textAlign: 'left' }}>
      <i className={icon} style={{ fontSize: 16, color }} />
      <span>{label}</span>
    </button>
  );
}

function NavButton({ it, active, onClick, util, mobile }: { it: NavItem; active: boolean; onClick: () => void; util?: boolean; mobile?: boolean; }) {
  const { trash } = useStore();
  const sub = it.key === 'cestino' ? (trash.length ? trash.length + (trash.length === 1 ? ' elemento' : ' elementi') : '') : it.sub;
  const iconColor = it.color || (active ? 'var(--color-accent-300)' : 'var(--color-neutral-400)');
  if (mobile)
    return (
      <button onClick={onClick} aria-current={active ? 'page' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 50, padding: '8px 12px', border: 0, borderRadius: 10, background: active ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent', color: active ? 'var(--color-text)' : 'var(--color-neutral-300)', font: 'inherit', fontSize: 17, fontWeight: active ? 500 : 400, textAlign: 'left', cursor: 'pointer', lineHeight: 1.25, boxShadow: active ? 'inset 2px 0 0 var(--color-accent)' : 'none' }}>
        <i className={'ph ' + it.icon} style={{ fontSize: 21, color: iconColor, flex: 'none' }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}><span>{it.label}</span>{sub && <span style={{ fontSize: 13.5, fontWeight: 400, color: 'var(--color-neutral-500)' }}>{sub}</span>}</span>
      </button>
    );
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} style={{ position: 'relative', display: 'flex', alignItems: sub ? 'flex-start' : 'center', gap: 10, width: '100%', minHeight: util ? 38 : 40, padding: util ? '7px 10px' : '8px 10px', border: 0, borderRadius: 8, background: active ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent', color: active ? 'var(--color-text)' : 'var(--color-neutral-300)', font: 'inherit', fontSize: 15, fontWeight: active ? 500 : 400, textAlign: 'left', cursor: 'pointer', lineHeight: 1.25 }}>
      <span style={{ position: 'absolute', left: -14, top: 9, bottom: 9, width: 2, borderRadius: 2, background: active ? 'var(--color-accent)' : 'transparent' }} />
      <i className={'ph ' + it.icon} style={{ fontSize: 18, color: iconColor, flex: 'none', marginTop: sub ? -1 : 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span>{it.label}</span>
        {sub && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-neutral-500)' }}>{sub}</span>}
      </span>
    </button>
  );
}

const navUtil: NavItem[] = [
  { key: 'cestino', label: 'Cestino', icon: 'ph-trash' },
  { key: 'profilo', label: 'Profilo', icon: 'ph-user' },
  { key: 'impostazioni', label: 'Impostazioni', icon: 'ph-gear-six' },
];

export function Sidebar({ route, go }: { route: Route; go: (r: Route) => void }) {
  return (
    <aside style={{ width: 236, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2, padding: '24px 14px 16px', position: 'relative', background: 'var(--color-sidebar)', overflowY: 'auto' }}>
      <button onClick={() => go('')} aria-label="Nocturna, vai al calendario" style={{ background: 'none', border: 0, padding: '0 10px 18px', textAlign: 'left', cursor: 'pointer', color: 'var(--color-text)' }}>
        <div className="gothic" style={{ fontSize: 38, lineHeight: 0.95 }}>Nocturna</div>
        <div style={{ width: 28, height: 2, background: 'var(--color-accent)', marginTop: 10 }} />
      </button>
      {navHome.map((it) => <NavButton key={it.key} it={it} active={route === it.key} onClick={() => go(it.key)} />)}
      <div style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-neutral-500)', padding: '18px 10px 6px' }}>Aree</div>
      {navAreas.map((it) => <NavButton key={it.key} it={it} active={route === it.key} onClick={() => go(it.key)} />)}
      <div style={{ flex: 1 }} />
      {navUtil.map((it) => <NavButton key={it.key} it={it} util active={route === it.key} onClick={() => go(it.key)} />)}
      <SyncButton />
    </aside>
  );
}

export function MobileBar({ route, go }: { route: Route; go: (r: Route) => void }) {
  const [open, setOpen] = useState(false);
  const nav = (r: Route) => { setOpen(false); go(r); };
  return (
    <>
      <div style={{ flex: 'none', paddingTop: 'env(safe-area-inset-top, 0px)', background: 'transparent' }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
          <button onClick={() => setOpen(true)} aria-label="Apri menu" style={{ width: 44, height: 44, border: 0, borderRadius: 10, background: 'none', color: 'var(--color-text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-list" style={{ fontSize: 24 }} /></button>
          <button onClick={() => go('')} className="gothic" style={{ fontSize: 27, lineHeight: 1, background: 'none', border: 0, color: 'var(--color-text)', padding: 0, cursor: 'pointer' }}>Nocturna</button>
          <div style={{ flex: 1 }} />
          <SyncButton compact />
        </div>
      </div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex' }}>
          <nav aria-label="Menu principale" style={{ width: 300, maxWidth: '85vw', height: '100%', background: 'var(--color-sidebar)', padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 14px calc(env(safe-area-inset-bottom, 0px) + 20px)', display: 'flex', flexDirection: 'column', gap: 2, boxShadow: 'var(--shadow-md)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 0 18px 10px' }}>
              <span className="gothic" style={{ fontSize: 34, lineHeight: 1, flex: 1 }}>Nocturna</span>
              <button onClick={() => setOpen(false)} aria-label="Chiudi menu" style={{ width: 44, height: 44, border: 0, background: 'none', color: 'var(--color-neutral-300)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 22 }} /></button>
            </div>
            {[...navHome, ...navAreas].map((it) => <NavButton key={it.key} it={it} mobile active={route === it.key} onClick={() => nav(it.key)} />)}
            <div style={{ flex: 1, minHeight: 16 }} />
            {navUtil.map((it) => <NavButton key={it.key} it={it} mobile active={route === it.key} onClick={() => nav(it.key)} />)}
          </nav>
          <button onClick={() => setOpen(false)} aria-label="Chiudi menu" style={{ flex: 1, border: 0, background: 'color-mix(in srgb, var(--color-sidebar) 65%, transparent)', cursor: 'pointer' }} />
        </div>
      )}
    </>
  );
}

export function Toast() {
  const { toast, toastUndo, say } = useStore();
  if (!toast) return null;
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)', transform: 'translateX(-50%)', zIndex: 100, maxWidth: 'min(520px,90vw)', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderRadius: 10, background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)', fontSize: 15, color: 'var(--color-neutral-200)' }}>
      <span>{toast}</span>
      {toastUndo && <button onClick={() => { toastUndo(); }} style={{ border: 0, background: 'none', padding: '6px 4px', color: 'var(--color-accent-300)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>Annulla</button>}
    </div>
  );
}
