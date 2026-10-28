// Lettura di file CSV (RFC 4180): virgolette, a capo dentro i campi, separatore «,» «;» o tabulazione
// riconosciuto dalla prima riga, BOM iniziale ignorato. Modulo senza dipendenze.

export function detectDelimiter(text: string): string {
  const first = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] || '';
  let best = ',', n = -1;
  for (const d of [',', ';', '\t']) {
    let c = 0, q = false;
    for (const ch of first) { if (ch === '"') q = !q; else if (!q && ch === d) c++; }
    if (c > n) { best = d; n = c; }
  }
  return best;
}

/** Restituisce le righe come array di celle; `line` è il numero di riga (1 = intestazione) nel file. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): { cells: string[]; line: number }[] {
  const s = text.replace(/^﻿/, '');
  const rows: { cells: string[]; line: number }[] = [];
  let row: string[] = [], cell = '', q = false, line = 1, start = 1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else { if (ch === '\n') line++; cell += ch; }
    } else if (ch === '"' && cell === '') q = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push({ cells: row, line: start });
      row = []; line++; start = line;
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push({ cells: row, line: start });
  return rows;
}


/** Testo del file: UTF-8 se valido, altrimenti Windows-1252 (CSV salvati da Excel italiano su Windows). */
export function decodeCsv(bytes: ArrayBuffer | Uint8Array): { text: string; encoding: 'utf-8' | 'windows-1252' } {
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' }; }
  catch { return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' }; }
}
