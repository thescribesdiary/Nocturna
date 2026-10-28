// Importazione CSV dei libri, con le colonne e le scelte reali dello schema (modulo «Nuovo libro»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/bundle.ts';

const cfgMod = await load('src/data/bookImportConfig.ts');
const imp = await load('src/lib/bookImport.ts');
const existing = [
  { id: 'b1', title: 'La città dei pozzi', author: 'Ilaria Rossi' },
  { id: 'b2', title: 'Ombre di carta', author: 'Marco Neri', deletedAt: 123 },
];
const run = (csv: string) => imp.previewImport(csv, cfgMod.bookImportConfig(existing));

test('importazione valida: intestazioni del modulo, separatore «;», date italiane, scelte per etichetta', () => {
  const p = run('Titolo del libro;Autore;Editore;Formato di ricezione;Numero di pagine;Data di ricezione;Stato di lettura;Nella TBR\n'
    + 'Il lago d\'inverno;Anna Bruni;Neri Pozza;Cartaceo;320;05/11/2026;In lettura;sì\n'
    + '"Titolo; con punto e virgola";"Autrice ""Q""";Indipendente;digitale;;2026-11-07;;no\n');
  assert.equal(p.fatal, null);
  assert.deepEqual(p.unknown, []);
  assert.equal(p.rows.length, 2);
  assert.deepEqual(p.rows[0].errors, []);
  assert.deepEqual(p.rows[0].data, { title: "Il lago d'inverno", author: 'Anna Bruni', publisher: 'Neri Pozza', format: 'cartaceo', pages: '320', received: '2026-11-05', status: 'inlettura', tbr: true });
  assert.equal(p.rows[1].data.title, 'Titolo; con punto e virgola');
  assert.equal(p.rows[1].data.author, 'Autrice "Q"');
  assert.equal(p.rows[1].data.tbr, false);
  assert.deepEqual(imp.summary(p, new Set()), { toAdd: 2, skipped: 0, invalid: 0 });
});

test('righe non valide: stessi obbligatori del modulo e valori non ammessi, con il numero di riga', () => {
  const p = run('title,author,publisher,format,deadline,rating\nSenza editore,X,,cartaceo,,\nY,Z,E,vinile,,\nW,K,E,audio,31/02/2026,9\n');
  assert.equal(p.rows[0].line, 2);
  assert.ok(p.rows[0].errors.includes("L'editore è obbligatorio."));
  assert.ok(p.rows[1].errors.some((e: string) => e.startsWith('Formato di ricezione') && e.includes('vinile')));
  assert.equal(p.rows[2].errors.length, 2); // data inesistente e voto fuori scala
  assert.deepEqual(imp.summary(p, new Set()), { toAdd: 0, skipped: 0, invalid: 3 });
});

test('duplicati: libri esistenti (anche con maiuscole e accenti diversi), nel cestino e ripetuti nel file', () => {
  const p = run('Titolo,Autore,Editore,Formato\nLA CITTÀ DEI POZZI,ilaria rossi,E,cartaceo\nOmbre di carta,Marco Neri,E,cartaceo\nNuovo,Autore,E,audio\nnuovo,AUTORE,E,audio\n');
  assert.deepEqual(p.rows.map((r: any) => r.duplicate?.kind ?? null), ['esistente', 'cestino', null, 'file']);
  assert.equal(p.rows[0].duplicate.ref, 'b1');
  // Di default i duplicati vengono saltati; scegliendoli diventano libri nuovi, mai sovrascritture.
  assert.deepEqual(imp.rowsToImport(p, new Set()).map((r: any) => r.line), [4]);
  const chosen = imp.rowsToImport(p, new Set([2]));
  assert.deepEqual(chosen.map((r: any) => r.line), [2, 4]);
  assert.ok(chosen.every((r: any) => !('id' in r.data)));
  assert.deepEqual(imp.summary(p, new Set([2])), { toAdd: 2, skipped: 2, invalid: 0 });
});

test('colonne sconosciute o non importabili vengono segnalate, non ignorate in silenzio', () => {
  const p = run('Titolo,Autore,Editore,Formato,ISBN,id,Copertina (facoltativa),Titolo\nA,B,C,cartaceo,978,b1,x.jpg,dup\n');
  assert.ok(p.unknown.includes('ISBN'));
  assert.ok(p.unknown.includes('id')); // un ID nel CSV non può mai puntare a un libro esistente
  assert.ok(p.unknown.some((u: string) => u.includes('colonna ripetuta')));
  assert.ok(p.unsupported.some((u: string) => u.startsWith('Copertina')));
  assert.equal(p.rows[0].data.title, 'A');
  assert.equal(p.rows[0].data.id, undefined);
});

test('errori bloccanti: file vuoto, colonne obbligatorie mancanti, troppe righe', () => {
  assert.equal(run('').fatal, 'Il file è vuoto.');
  assert.match(run('Titolo,Autore\nA,B\n').fatal, /Editore.*Formato/);
  const big = 'Titolo,Autore,Editore,Formato\n' + Array.from({ length: 501 }, (_, i) => `T${i},A,E,cartaceo`).join('\n');
  assert.match(run(big).fatal, /al massimo 500/);
});

test('il modello CSV contiene tutte le colonne importabili e viene riletto senza segnalazioni', () => {
  const head = cfgMod.bookCsvTemplate();
  const p = run(head + 'T,A,E,cartaceo'.replace(/,/g, ';') + ';'.repeat(head.split(';').length - 4) + '\n');
  assert.deepEqual(p.unknown, []);
  assert.equal(p.fatal, null);
  for (const k of ['title', 'author', 'publisher', 'format', 'genre', 'pages', 'status', 'deadline', 'reviewStatus']) assert.ok(p.columns.some((c: any) => c.field === k), k);
});

test('una scadenza senza «Tipo di scadenza» viene resa visibile (data precisa o mese)', () => {
  const p = run('Titolo,Autore,Editore,Formato,Scadenza,Mese di scadenza\nA,B,C,cartaceo,20/11/2026,\nD,E,F,audio,,12/2026\nG,H,I,audio,01/12/2026,12/2026\n');
  assert.equal(p.rows[0].data.deadlineMode, 'data');
  assert.equal(p.rows[0].data.deadline, '2026-11-20');
  assert.equal(p.rows[1].data.deadlineMode, 'mese');
  assert.equal(p.rows[1].data.deadlineMonth, '2026-12');
  assert.ok(p.rows[2].errors.some((e: string) => e.includes('Tipo di scadenza')));
});

test('CSV salvati da Excel in Windows-1252: gli accenti restano corretti', async () => {
  const { decodeCsv } = await load('src/lib/csv.ts');
  const cp1252 = new Uint8Array([0x53, 0x6f, 0x63, 0x69, 0x65, 0x74, 0xe0]); // «Società» in Windows-1252
  assert.deepEqual(decodeCsv(cp1252), { text: 'Società', encoding: 'windows-1252' });
  assert.deepEqual(decodeCsv(new TextEncoder().encode('Società')), { text: 'Società', encoding: 'utf-8' });
});
