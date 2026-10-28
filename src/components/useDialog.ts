// Comportamento da tastiera comune a dialoghi, pannelli e menu a comparsa (nessun effetto grafico):
// - all'apertura il focus entra nel dialogo (se non c'è già) e all'uscita torna dove era;
// - Esc chiude solo il dialogo più in alto (es. un modulo aperto sopra il pannello di dettaglio);
// - Tab e Maiusc+Tab restano dentro il dialogo finché è aperto.
import { useEffect, useRef } from 'react';

const stack: HTMLElement[] = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusables = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.tabIndex >= 0 && (x.offsetParent !== null || x === document.activeElement));

export function useDialog<T extends HTMLElement = HTMLDivElement>(onClose: () => void, deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const before = document.activeElement as HTMLElement | null;
    stack.push(el);
    if (!el.contains(document.activeElement)) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== el) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      } else if (e.key === 'Tab') {
        const list = focusables(el);
        if (!list.length) { e.preventDefault(); el.focus(); return; }
        const first = list[0], last = list[list.length - 1], cur = document.activeElement;
        if (e.shiftKey && (cur === first || cur === el || !el.contains(cur))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (cur === last || !el.contains(cur))) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.lastIndexOf(el);
      if (i >= 0) stack.splice(i, 1);
      if (before && document.contains(before) && typeof before.focus === 'function') before.focus({ preventScroll: true });
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}
