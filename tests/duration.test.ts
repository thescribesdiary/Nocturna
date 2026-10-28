import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, parseDuration, sumDurations } from '../src/lib/duration.ts';

test('legge i tempi stimati scritti a mano', () => {
  const casi: [string, number][] = [['2 h', 120], ['2h', 120], ['1h30', 90], ['1 h 30', 90], ['1 h e 30', 90], ['1,5 h', 90], ['1.5 ore', 90], ['1 ora', 60], ['45 min', 45], ['45m', 45], ["20'", 20], ['30 minuti', 30], ['1:15', 75]];
  for (const [s, m] of casi) assert.equal(parseDuration(s), m, s);
});

test('ignora testi non riconosciuti invece di indovinare', () => {
  for (const s of ['', 'tanto', 'un paio d\'ore', '1h75', '3 giorni', null, undefined, {}]) assert.equal(parseDuration(s as any), null, String(s));
});

test('somma e formato del totale', () => {
  assert.deepEqual(sumDurations(['1 h', '30 min', 'boh', undefined]), { minutes: 90, counted: 2 });
  assert.equal(formatDuration(90), '1 h 30');
  assert.equal(formatDuration(120), '2 h');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(0), '');
});
