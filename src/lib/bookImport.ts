// Importazione multipla dei libri da CSV: analisi e revisione, senza scrivere nulla.
// Modulo senza dipendenze dall'app: riceve dall'esterno le colonne ammesse, le opzioni delle scelte
// e i libri già presenti, così i test usano le stesse definizioni dello schema reale.
import { parseCsv } from './csv';

export type Opt = [string, string, string?];
/** Colonna importabile: chiave del campo del libro, etichette accettate nell'intestazione, tipo del valore. */
export type ImportField = { k: string; labels: string[]; t: 'text' | 'number' | 'date' | 'month' | 'bool' | 'rating' | 'choice'; opts?: Opt[] };
export type ImportConfig = {
  fields: ImportField[];
  required: [string, string][];          // stessi controlli del modulo: [campo, messaggio]
  existing: { id: string; title?: string; author?: string; deletedAt?: unknown }[];
  /** Colonne riconosciute ma non importabili (es. copertina): vengono segnalate, non ignorate in silenzio. */
  unsupported?: Record<string, string>;
  maxRows?: number;
};
export type ImportRow = {
  line: number;
  data: Record<string, any>;
  errors: string[];
  duplicate: null | { kind: 'esistente' | 'cestino' | 'file'; ref: string };
};
export type ImportPreview = {
  rows: ImportRow[];
  columns: { header: string; field: string | null }[];
  unknown: string[];                     // intestazioni non riconosciute
  unsupported: string[];                 // riconosciute ma non importabili
  fatal: string | null;                  // errore che impedisce l'importazione (es. file vuoto)
};

export const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const key = (title: unknown, author: unknown) => norm(title) + '|' + norm(author);

function toDate(v: string): string | null {
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [d, mo, y] = [+m[1], +m[2], +m[3]];
  else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function toMonth(v: string): string | null {
  let m = v.match(/^(\d{4})-(\d{1,2})$/) || null;
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${String(+m[2]).padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${String(+m[1]).padStart(2, '0')}`;
  return null;
}
const YES = ['si', 'sì', 'yes', 'true', 'vero', 'x', '1'], NO = ['no', 'false', 'falso', '0'];

function convert(f: ImportField, raw: string): { v?: any; err?: string } {
  const v = raw.trim();
  if (!v) return {};
  switch (f.t) {
    case 'text': return v.length > 5000 ? { err: 'testo troppo lungo' } : { v };
    case 'number': return /^\d{1,6}$/.test(v) ? { v } : { err: `«${v}» non è un numero intero` };
    case 'rating': return /^[0-5]$/.test(v) ? { v: Number(v) } : { err: `«${v}» non è un voto da 0 a 5` };
    case 'date': { const d = toDate(v); return d ? { v: d } : { err: `«${v}» non è una data (usa AAAA-MM-GG o GG/MM/AAAA)` }; }
    case 'month': { const d = toMonth(v); return d ? { v: d } : { err: `«${v}» non è un mese (usa AAAA-MM o MM/AAAA)` }; }
    case 'bool': {
      const n = norm(v);
      if (YES.includes(n)) return { v: true };
      if (NO.includes(n)) return { v: false };
      return { err: `«${v}» non è sì/no` };
    }
    case 'choice': {
      const o = (f.opts || []).find((x) => norm(x[0]) === norm(v) || norm(x[1]) === norm(v));
      return o ? { v: o[0] } : { err: `«${v}» non è tra i valori ammessi (${(f.opts || []).map((x) => x[1]).join(', ')})` };
    }
  }
}

export function previewImport(text: string, cfg: ImportConfig): ImportPreview {
  const out: ImportPreview = { rows: [], columns: [], unknown: [], unsupported: [], fatal: null };
  const table = parseCsv(text);
  if (!table.length) { out.fatal = 'Il file è vuoto.'; return out; }
  const [head, ...body] = table;
  const byLabel = new Map<string, ImportField>();
  cfg.fields.forEach((f) => [f.k, ...f.labels].forEach((l) => byLabel.set(norm(l), f)));
  const unsupported = new Map(Object.entries(cfg.unsupported || {}).map(([k, v]) => [norm(k), v]));
  const used = new Set<string>();
  const map: (ImportField | null)[] = head.cells.map((h) => {
    const f = byLabel.get(norm(h)) || null;
    if (f && used.has(f.k)) { out.unknown.push(`${h.trim()} (colonna ripetuta)`); out.columns.push({ header: h, field: null }); return null; }
    if (f) used.add(f.k);
    else if (unsupported.has(norm(h))) out.unsupported.push(`${h.trim()}: ${unsupported.get(norm(h))}`);
    else if (h.trim()) out.unknown.push(h.trim());
    out.columns.push({ header: h, field: f?.k || null });
    return f;
  });
  const missing = cfg.required.filter(([k]) => !used.has(k)).map(([k]) => cfg.fields.find((f) => f.k === k)?.labels[0] || k);
  if (missing.length) { out.fatal = `Mancano le colonne obbligatorie: ${missing.join(', ')}.`; return out; }
  if (!body.length) { out.fatal = 'Il file contiene solo l\'intestazione.'; return out; }
  const max = cfg.maxRows ?? 500;
  if (body.length > max) { out.fatal = `Il file ha ${body.length} righe: al massimo ${max} per volta.`; return out; }

  const known = new Map<string, { id: string; trashed: boolean }>();
  cfg.existing.forEach((b) => {
    const k = key(b.title, b.author);
    if (k === '|') return;
    if (!known.has(k) || (known.get(k)!.trashed && !b.deletedAt)) known.set(k, { id: b.id, trashed: !!b.deletedAt });
  });
  const inFile = new Map<string, number>();

  for (const r of body) {
    const row: ImportRow = { line: r.line, data: {}, errors: [], duplicate: null };
    if (r.cells.length > head.cells.length && r.cells.slice(head.cells.length).some((c) => c.trim()))
      row.errors.push('ha più valori delle colonne dell\'intestazione');
    map.forEach((f, i) => {
      if (!f) return;
      const res = convert(f, r.cells[i] ?? '');
      if (res.err) row.errors.push(`${f.labels[0]}: ${res.err}`);
      else if (res.v !== undefined) row.data[f.k] = res.v;
    });
    // Una scadenza indicata senza «Tipo di scadenza» verrebbe salvata ma resterebbe nascosta: il tipo si deduce.
    if (!row.data.deadlineMode && row.data.deadline && row.data.deadlineMonth) row.errors.push('indica il Tipo di scadenza: ci sono sia una data sia un mese');
    else if (!row.data.deadlineMode && row.data.deadline) row.data.deadlineMode = 'data';
    else if (!row.data.deadlineMode && row.data.deadlineMonth) row.data.deadlineMode = 'mese';
    for (const [k, msg] of cfg.required) if (!String(row.data[k] ?? '').trim()) row.errors.push(msg);
    if (!row.errors.length) {
      const k = key(row.data.title, row.data.author);
      const ex = known.get(k);
      if (ex) row.duplicate = { kind: ex.trashed ? 'cestino' : 'esistente', ref: ex.id };
      else if (inFile.has(k)) row.duplicate = { kind: 'file', ref: 'riga ' + inFile.get(k) };
      else inFile.set(k, r.line);
    }
    out.rows.push(row);
  }
  return out;
}

/** Righe da importare: valide, e i duplicati solo se scelti esplicitamente (diventano libri nuovi, mai sovrascritture). */
export function rowsToImport(p: ImportPreview, includeDuplicates: Set<number>): ImportRow[] {
  return p.rows.filter((r) => !r.errors.length && (!r.duplicate || includeDuplicates.has(r.line)));
}

export function summary(p: ImportPreview, includeDuplicates: Set<number>) {
  const valid = p.rows.filter((r) => !r.errors.length);
  const toAdd = rowsToImport(p, includeDuplicates).length;
  return { toAdd, skipped: valid.length - toAdd, invalid: p.rows.length - valid.length };
}
