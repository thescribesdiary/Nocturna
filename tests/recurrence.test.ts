import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideSpawn, monthlyAnchor, nextMonthly, nextOccurrenceId, seriesOf } from '../src/lib/recurrence.ts';

test('stessa serie e stessa data danno sempre lo stesso ID (due dispositivi, un solo documento)', () => {
  const x = { id: 'abc123' };
  assert.equal(nextOccurrenceId(x, '2026-11-05'), 'abc123-r20261105');
  assert.equal(nextOccurrenceId({ ...x }, '2026-11-05'), nextOccurrenceId(x, '2026-11-05'));
});

test('le occorrenze successive restano nella serie originale e l\'ID non si allunga', () => {
  const second = { id: nextOccurrenceId({ id: 'abc123' }, '2026-11-05'), seriesId: 'abc123' };
  const third = nextOccurrenceId(second, '2026-11-12');
  assert.equal(third, 'abc123-r20261112');
  assert.equal(seriesOf(second), 'abc123');
});

test('attività create prima di questa versione (senza seriesId) usano il proprio ID come serie', () => {
  assert.equal(seriesOf({ id: 'vecchia' }), 'vecchia');
  assert.equal(seriesOf({ id: 'vecchia', seriesId: '' }), 'vecchia');
});

/** Segue una serie mensile come fa spawnNext: ogni occorrenza passa il proprio repeatDay alla successiva. */
function serie(start: string, n: number, repeatDay?: number) {
  const out = [start];
  let date = start, day = repeatDay;
  for (let i = 0; i < n; i++) { const a = monthlyAnchor(date, day); date = nextMonthly(date, a); day = a; out.push(date); }
  return out;
}

test('mensile dal 31: febbraio non bisestile e ritorno al 31', () => {
  assert.deepEqual(serie('2027-01-31', 4), ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
});

test('mensile dal 31 in anno bisestile: 29 febbraio', () => {
  assert.deepEqual(serie('2028-01-31', 2), ['2028-01-31', '2028-02-29', '2028-03-31']);
});

test('mensile dal 30 e dal 29: febbraio e mesi di 30/31 giorni', () => {
  assert.deepEqual(serie('2027-01-30', 3), ['2027-01-30', '2027-02-28', '2027-03-30', '2027-04-30']);
  assert.deepEqual(serie('2027-01-29', 2), ['2027-01-29', '2027-02-28', '2027-03-29']);
  assert.deepEqual(serie('2028-01-29', 2), ['2028-01-29', '2028-02-29', '2028-03-29']);
});

test('mensile a cavallo dell\'anno e da un mese di 30 giorni', () => {
  assert.deepEqual(serie('2026-12-31', 2), ['2026-12-31', '2027-01-31', '2027-02-28']);
  assert.deepEqual(serie('2027-04-30', 2, 31), ['2027-04-30', '2027-05-31', '2027-06-30']);
});

test('attività esistenti senza repeatDay: si usa il giorno della data attuale', () => {
  assert.equal(monthlyAnchor('2027-02-28'), 28);
  assert.equal(nextMonthly('2027-02-28', monthlyAnchor('2027-02-28')), '2027-03-28');
  assert.equal(monthlyAnchor('2027-02-28', 'x'), 28);
});

test('data spostata a mano: il nuovo giorno diventa il riferimento', () => {
  assert.equal(monthlyAnchor('2027-03-15', 31), 15);
  assert.equal(monthlyAnchor('2027-02-28', 31), 31);
});

test('transazione: crea solo se nessun altro dispositivo l\'ha già fatto', () => {
  assert.deepEqual(decideSpawn({ exists: true, spawnedNext: false }, false), { markSource: true, createNext: true });
  assert.deepEqual(decideSpawn({ exists: true }, true), { markSource: true, createNext: false });
  assert.deepEqual(decideSpawn({ exists: true, spawnedNext: true }, false), { markSource: false, createNext: false });
  assert.deepEqual(decideSpawn({ exists: false }, false), { markSource: false, createNext: false });
});
