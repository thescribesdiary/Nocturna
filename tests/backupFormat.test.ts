import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BackupError, chunkBySize, parseBackupJson, planRestore, validDocId } from '../src/data/backupFormat.ts';

const ok = (data: any, extra: any = {}) => ({ app: 'Nocturna', version: 2, exportedAt: '2026-10-01T10:00:00Z', data, ...extra });
const reason = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as BackupError).reason; } return 'nessun errore'; };

test('accetta un backup valido (versioni 1 e 2) e conta gli elementi', () => {
  const b = parseBackupJson(ok({ scuola: [{ id: 'a', kind: 'attivita' }], impostazioni: [{ id: 'colonne' }] }));
  assert.equal(b.count, 2);
  assert.equal(parseBackupJson(ok({ lavoro: [{ id: 'x' }] }, { version: 1 })).count, 1);
});

test('il segno della migrazione (impostazioni/spazio) viene scartato', () => {
  const b = parseBackupJson(ok({ impostazioni: [{ id: 'spazio', merged: {} }, { id: 'preferenze' }] }));
  assert.deepEqual(b.data.impostazioni.map((x) => x.id), ['preferenze']);
  assert.equal(b.count, 1);
});

test('rifiuta file non di Nocturna, versioni future e strutture errate', () => {
  assert.equal(reason(() => parseBackupJson(null)), 'not-nocturna');
  assert.equal(reason(() => parseBackupJson({ app: 'Altro', data: {} })), 'not-nocturna');
  assert.equal(reason(() => parseBackupJson(ok({}, { version: 3 }))), 'too-new');
  assert.equal(reason(() => parseBackupJson(ok({ scuola: {} }))), 'bad');
  assert.equal(reason(() => parseBackupJson(ok({ scuola: ['x'] }))), 'bad');
  assert.equal(reason(() => parseBackupJson(ok({ scuola: [[]] }))), 'bad');
});

test('rifiuta ID non validi o duplicati', () => {
  for (const id of ['', 'a/b', '.', '..', '__x__', 5, undefined, 'x'.repeat(701)])
    assert.equal(reason(() => parseBackupJson(ok({ scuola: [{ id }] }))), 'bad', String(id));
  assert.equal(reason(() => parseBackupJson(ok({ scuola: [{ id: 'a' }, { id: 'a' }] }))), 'bad');
  assert.ok(validDocId('abc-123_X'));
});

test('ignora sezioni sconosciute', () => {
  const b = parseBackupJson(ok({ scuola: [{ id: 'a' }], dispositivi: [{ id: 'token' }] }));
  assert.equal(b.count, 1);
  assert.equal(b.data.dispositivi, undefined);
});

test('ripristino: scrive tutto il backup, poi elimina solo i documenti che mancano', () => {
  const plan = planRestore(
    { scuola: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], impostazioni: [{ id: 'colonne' }] },
    { scuola: ['a', 'vecchio'], lavoro: ['l1'], impostazioni: ['colonne', 'spazio', 'profilo'] },
  );
  assert.deepEqual(plan.writes.map((w) => `${w.store}/${w.id}`), ['scuola/a', 'scuola/b', 'impostazioni/colonne']);
  assert.deepEqual(plan.deletes.map((d) => `${d.store}/${d.id}`), ['scuola/vecchio', 'lavoro/l1', 'impostazioni/profilo']);
  assert.equal(plan.writes[0].data.id, undefined);
});

test('ripristino: non tocca mai il segno della migrazione e non crea duplicati', () => {
  const plan = planRestore(
    { scuola: [{ id: 'a', v: 1 }, { id: 'a', v: 2 }], impostazioni: [{ id: 'spazio', merged: {} }] },
    { impostazioni: ['spazio'] },
  );
  assert.deepEqual(plan.writes.map((w) => `${w.store}/${w.id}`), ['scuola/a']);
  assert.equal(plan.deletes.length, 0);
});

test('ripristino: il filtro dei campi viene applicato a ogni documento', () => {
  const plan = planRestore({ scrittura: [{ id: 'i', image: 'javascript:alert(1)' }] }, {}, (_s, x) => ({ ...x, image: '' }));
  assert.equal(plan.writes[0].data.image, '');
});

test('lotti del ripristino: al massimo 400 operazioni e circa 8 MB ciascuno (limite Firestore 10 MiB)', () => {
  const small = Array.from({ length: 1000 }, (_, i) => ({ i, size: 100 }));
  assert.deepEqual(chunkBySize(small, (x) => x.size).map((c) => c.length), [400, 400, 200]);
  const covers = Array.from({ length: 100 }, (_, i) => ({ i, size: 300_000 })); // 100 libri con copertina da ~300 KB
  const parts = chunkBySize(covers, (x) => x.size);
  assert.ok(parts.every((p) => p.reduce((n, x) => n + x.size, 0) <= 8 * 1024 * 1024));
  assert.equal(parts.flat().length, 100);
  assert.deepEqual(parts.flat().map((x) => x.i), covers.map((x) => x.i)); // ordine conservato: prima le scritture
  assert.deepEqual(chunkBySize([{ size: 9e6 }], (x) => x.size).length, 1); // un documento grande resta da solo
});
