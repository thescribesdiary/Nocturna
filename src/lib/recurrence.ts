// ID dell'occorrenza successiva di un'attività ricorrente. Modulo senza dipendenze: è usato anche dai test.
// L'ID è sempre lo stesso per la stessa serie e la stessa data: se due dispositivi completano insieme
// la stessa attività, scrivono lo stesso documento invece di crearne due.
// La serie è l'ID della prima attività (campo `seriesId`, assente nelle attività create prima di questa versione).

export function seriesOf(x: { id: string; seriesId?: unknown }): string {
  return typeof x.seriesId === 'string' && x.seriesId ? x.seriesId : x.id;
}

export function nextOccurrenceId(x: { id: string; seriesId?: unknown }, dateKey: string): string {
  return `${seriesOf(x)}-r${dateKey.replace(/-/g, '')}`;
}

// --- Ricorrenze mensili --------------------------------------------------------------------------
// Il giorno originale della serie (campo `repeatDay`) evita la deriva: 31 gen → 28/29 feb → 31 mar.
// Le attività create prima di questa versione non hanno `repeatDay`: si usa il giorno della data attuale.

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m = 1…12
const parse = (k: string) => k.split('-').map(Number) as [number, number, number];
const key = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Giorno di riferimento della serie. Se la data è stata spostata a mano, vale il nuovo giorno. */
export function monthlyAnchor(dateKey: string, repeatDay?: unknown): number {
  const [y, m, d] = parse(dateKey);
  const r = Number(repeatDay);
  if (Number.isInteger(r) && r >= 1 && r <= 31 && Math.min(r, daysIn(y, m)) === d) return r;
  return d;
}

/** Data del mese successivo con il giorno di riferimento, limitato all'ultimo giorno del mese. */
export function nextMonthly(dateKey: string, anchor: number): string {
  const [y, m] = parse(dateKey);
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return key(ny, nm, Math.min(anchor, daysIn(ny, nm)));
}

// --- Concorrenza ---------------------------------------------------------------------------------
/** Decisione presa dentro la transazione che crea l'occorrenza successiva. */
export function decideSpawn(source: { exists: boolean; spawnedNext?: unknown }, nextExists: boolean) {
  if (!source.exists || source.spawnedNext) return { markSource: false, createNext: false };
  return { markSource: true, createNext: !nextExists };
}
