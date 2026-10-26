import React, { useEffect, useState } from 'react';

export const tint = (c: string, p = 16) => `color-mix(in srgb, ${c} ${p}%, transparent)`;

export function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}
export const useIsMobile = () => useMedia('(max-width: 899px)');

export type Route = '' | 'scuola' | 'lavoro' | 'lettura' | 'scrittura' | 'cestino' | 'profilo' | 'impostazioni';
const ROUTES: Route[] = ['', 'scuola', 'lavoro', 'lettura', 'scrittura', 'cestino', 'profilo', 'impostazioni'];
const read = (): Route => {
  const h = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(h) ? h : '';
};
export function useRoute(): [Route, (r: Route) => void] {
  const [r, setR] = useState<Route>(read);
  useEffect(() => {
    const f = () => setR(read());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return [r, (n: Route) => { window.location.hash = n ? '/' + n : '/'; }];
}

/** Controllo segmentato (Mese / Settimana / Giorno…). */
export function Seg<T extends string>({ opts, value, onChange, label, big, grid }: {
  opts: [T, string][]; value: T; onChange: (v: T) => void; label: string; big?: boolean; grid?: boolean;
}) {
  return (
    <div role="group" aria-label={label} style={{
      display: grid ? 'grid' : 'flex', gridTemplateColumns: grid ? `repeat(${opts.length},1fr)` : undefined,
      border: '1px solid var(--color-divider)', borderRadius: big ? 10 : 8, overflow: 'hidden', padding: 2, gap: 2, flex: 'none',
    }}>
      {opts.map(([v, l]) => {
        const a = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} aria-pressed={a} style={{
            border: 0, minHeight: big ? 44 : 34, padding: big ? '6px 10px' : '6px 14px', font: 'inherit', fontSize: big ? 15.5 : 14.5, cursor: 'pointer',
            color: a ? 'var(--color-accent-300)' : 'var(--color-neutral-300)',
            background: a ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
            boxShadow: a ? 'inset 0 0 0 1px var(--color-accent)' : 'none', borderRadius: 6,
          }}>{l}</button>
        );
      })}
    </div>
  );
}

/** Stile "pillola" dei filtri e delle scelte. */
export const pill = (a: boolean, color?: string) => ({
  border: `1px solid ${a ? color || 'var(--color-accent)' : 'var(--color-divider)'}`,
  background: a ? tint(color || 'var(--color-accent)') : 'transparent',
  color: a ? 'var(--color-text)' : 'var(--color-neutral-300)',
});

export function Dot({ c, s = 8 }: { c: string; s?: number }) {
  return <span style={{ width: s, height: s, borderRadius: '50%', background: c, flex: 'none', display: 'inline-block' }} />;
}

export function Check({ on, onClick, label, size = 20 }: { on: boolean; onClick: () => void; label: string; size?: number }) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={on} style={{
      width: size, height: size, flex: 'none', marginTop: 1, borderRadius: size > 20 ? 7 : 6,
      border: `1.5px solid ${on ? 'var(--color-accent)' : 'var(--color-neutral-500)'}`,
      background: on ? 'var(--color-accent)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--color-bg)', cursor: 'pointer', padding: 0,
    }}>
      {on && <i className="ph-bold ph-check" style={{ fontSize: size > 20 ? 13 : 12 }} />}
    </button>
  );
}

/** Rende un contenitore scorrevole in orizzontale anche con la rotella e col trascinamento del mouse. */
export function hScroll(el: HTMLElement | null) {
  if (!el || (el as any)._h) return;
  (el as any)._h = 1;
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth + 2) {
      const max = el.scrollWidth - el.clientWidth, n = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
      if (n !== el.scrollLeft) { el.scrollLeft = n; e.preventDefault(); }
    }
  }, { passive: false });
}

export const H1: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 44 }) => (
  <h1 className="gothic" style={{ fontSize: size, lineHeight: 0.95, margin: 0 }}>{children}</h1>
);
