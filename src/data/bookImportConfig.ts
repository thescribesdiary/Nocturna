// Colonne del CSV dei libri, ricavate dal modulo «Nuovo libro» dello schema: stessi campi, stesse scelte,
// stessi obbligatori. Se lo schema cambia, l'importazione segue senza doppioni da mantenere.
import { kindDef } from './schema';
import type { ImportConfig, ImportField } from '../lib/bookImport';

/** Intestazioni alternative accettate oltre alla chiave e all'etichetta del modulo. */
const ALIAS: Record<string, string[]> = {
  title: ['Titolo'], author: ['Autrice', 'Autore/autrice'], publisher: ['Casa editrice'], format: ['Formato'],
  genre: ['Genere', 'Categoria'], pages: ['Pagine'], status: ['Stato'], tbr: ['TBR'], notes: ['Note'],
  deadline: ['Scadenza', 'Scadenza di lettura'], deadlineMonth: ['Mese di scadenza'], deadlineMode: ['Scadenza (tipo)'],
  collabType: ['Tipo di collaborazione'], collabName: ['Referente'], reviewStatus: ['Stato recensione'], reviewUrl: ['Link recensione'],
  reader: ['Chi legge'], added: ['Inserito il'], received: ['Ricevuto il'],
};
const TYPES: Record<string, ImportField['t']> = { text: 'text', textarea: 'text', number: 'number', date: 'date', month: 'month', bool: 'bool', rating: 'rating', choice: 'choice' };

export function bookImportConfig(existing: ImportConfig['existing']): ImportConfig {
  const def = kindDef('lettura', 'libro');
  const fields: ImportField[] = [];
  const unsupported: Record<string, string> = {};
  for (const g of def.groups) for (const f of g.fields) {
    const t = TYPES[f.t];
    if (!t || (t === 'choice' && !Array.isArray(f.opts))) { unsupported[f.label] = 'non importabile da CSV (aggiungila dal modulo del libro)'; unsupported[f.k] = unsupported[f.label]; continue; }
    fields.push({ k: f.k, labels: [f.label, ...(ALIAS[f.k] || [])], t, opts: t === 'choice' ? (f.opts as ImportField['opts']) : undefined });
  }
  return { fields, required: def.required, existing, unsupported };
}

/** Riga d'intestazione del modello CSV: le etichette del modulo, nell'ordine del modulo. */
export const bookCsvTemplate = () => bookImportConfig([]).fields.map((f) => (/[",;]/.test(f.labels[0]) ? `"${f.labels[0].replace(/"/g, '""')}"` : f.labels[0])).join(';') + '\n';
