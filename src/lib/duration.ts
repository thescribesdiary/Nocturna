// Tempi stimati scritti a mano («2 h», «1h30», «45 min», «1,5 ore»): lettura in minuti e somma.
// Modulo senza dipendenze: è usato anche dai test. I valori non riconosciuti vengono ignorati (null),
// così un testo libero già presente nei dati non produce totali sbagliati.

export function parseDuration(v: unknown): number | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).trim().toLowerCase().replace(',', '.').replace(/\s+/g, ' ');
  if (!s) return null;
  let m = s.match(/^(\d+(?:\.\d+)?) ?(?:h|ore|ora|hr|hrs)(?: ?e?(?: ?(\d{1,2}) ?(?:m|min|minuti|')?))?$/);
  if (m) {
    const h = parseFloat(m[1]), extra = m[2] ? parseInt(m[2], 10) : 0;
    if (m[2] && (!Number.isInteger(h) || extra >= 60)) return null;
    return Math.round(h * 60) + extra;
  }
  m = s.match(/^(\d+) ?(?:m|min|mins|minuti|minuto|')$/);
  if (m) return parseInt(m[1], 10);
  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m && parseInt(m[2], 10) < 60) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return null;
}

export function formatDuration(min: number): string {
  if (!min || min < 0) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? (m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`) : `${m} min`;
}

/** Somma dei tempi riconosciuti; `counted` dice quante voci avevano un valore leggibile. */
export function sumDurations(values: unknown[]): { minutes: number; counted: number } {
  let minutes = 0, counted = 0;
  for (const v of values) { const n = parseDuration(v); if (n != null) { minutes += n; counted++; } }
  return { minutes, counted };
}
