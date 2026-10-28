// Calendario editoriale: attività di Lettura e Scrittura nel calendario generale, collegamenti, nuovi campi
// facoltativi, compatibilità con i record precedenti e con i backup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/bundle.ts';
import { parseBackupJson, planRestore } from '../src/data/backupFormat.ts';
import { sumDurations } from '../src/lib/duration.ts';

const sections = await load('src/data/sections.ts');
const schema = await load('src/data/schema.ts');
const books = await load('src/data/books.ts');

const promo = { id: 'w1', kind: 'attivita', title: 'Cover reveal «Le figlie della nebbia»', type: 'promozione', contentFormat: 'cover', platforms: ['instagram', 'wattpad'], project: 'p1', date: '2026-11-03', time: '18:00', status: 'dafare', estimate: '1 h 30' };
const review = { id: 'l1', kind: 'attivita', title: 'Recensione', type: 'recensione', book: 'b1', date: '2026-11-04', status: 'dafare', estimate: '45 min' };
const legacy = { id: 'w0', kind: 'attivita', title: 'Capitolo 12', type: 'capitolo', date: '2026-11-05', status: 'dafare' }; // record di prima: nessun campo nuovo

test('le attività editoriali compaiono nel calendario generale come voci dell\'originale', () => {
  const h = sections.toHome('scrittura', promo);
  assert.equal(h.id, 'scrittura:w1');           // una sola voce, collegata al documento d'origine
  assert.equal(h.src, 'w1');
  assert.equal(h.date, '2026-11-03');
  assert.equal(h.time, '18:00');
  assert.equal(h.estimate, '1 h 30');
  const r = sections.toHome('lettura', review);
  assert.equal(r.cat, 'lettura');
  assert.equal(r.dot, schema.lTypeColor('recensione'));  // stesso colore del tipo già usato
  assert.equal(sections.ACT_KIND.scrittura, 'attivita');
  assert.equal(sections.ACT_KIND.lettura, 'attivita');
});

test('spostare la data dal calendario modifica il campo originale, senza copie', () => {
  assert.deepEqual(sections.dateFieldPatch('scrittura', promo, '2026-11-10'), { date: '2026-11-10' });
  assert.deepEqual(sections.dateFieldPatch('lettura', review, '2026-11-11'), { date: '2026-11-11' });
});

test('scadenze di lettura dei libri nel calendario, una per libro', () => {
  const list = books.bookDeadlines([{ id: 'b1', kind: 'libro', title: 'X', deadlineMode: 'data', deadline: '2026-11-20', status: 'daleggere' }, { id: 'b2', kind: 'libro', title: 'Y', deadlineMode: 'nessuna' }]);
  assert.deepEqual(list.map((t: any) => [t.id, t.src, t.date]), [['libro:b1', 'b1', '2026-11-20']]);
});

test('formato e piattaforme di Scrittura sono facoltativi e visibili solo per promozione e pubblicazione', () => {
  const def = schema.kindDef('scrittura', 'attivita');
  const f = Object.fromEntries(def.groups.flatMap((g: any) => g.fields).map((x: any) => [x.k, x]));
  for (const k of ['contentFormat', 'platforms']) {
    assert.ok(f[k], k);
    assert.equal(f[k].show({ type: 'promozione' }), true);
    assert.equal(f[k].show({ type: 'pubblicazione' }), true);
    assert.equal(f[k].show({ type: 'capitolo' }), false);
    assert.ok(!def.required.some(([r]: [string]) => r === k), k + ' non obbligatorio');
  }
  assert.ok(f.project && f.project.t === 'select'); // collegamento al progetto o alla storia, già esistente
  assert.deepEqual(def.blank.platforms, []);
  for (const k of ['cover', 'unboxing', 'storia', 'reel', 'citazione', 'estratto', 'teaser', 'annuncio', 'countdown'])
    assert.ok(schema.W_FORMATS.some((o: any) => o[0] === k), k);
  const lf = schema.kindDef('lettura', 'attivita').groups.flatMap((g: any) => g.fields).map((x: any) => x.k);
  assert.ok(lf.includes('book') && lf.includes('estimate') && lf.includes('channels'));
});

test('record precedenti senza campi nuovi: nessun errore e nessun tempo inventato', () => {
  const h = sections.toHome('scrittura', legacy);
  assert.equal(h.estimate, undefined);
  assert.deepEqual(sumDurations([h.estimate, sections.toHome('scrittura', promo).estimate]), { minutes: 90, counted: 1 });
});

test('backup e ripristino conservano i nuovi campi', () => {
  const b = parseBackupJson({ app: 'Nocturna', version: 2, data: { scrittura: [promo, legacy], lettura: [review] } });
  const plan = planRestore(b.data, {});
  const w1 = plan.writes.find((w) => w.id === 'w1')!.data;
  assert.equal(w1.contentFormat, 'cover');
  assert.deepEqual(w1.platforms, ['instagram', 'wattpad']);
  assert.equal(w1.estimate, '1 h 30');
  assert.equal(w1.project, 'p1');
  assert.equal(plan.writes.find((w) => w.id === 'l1')!.data.book, 'b1');
  assert.equal(plan.writes.find((w) => w.id === 'w0')!.data.platforms, undefined);
});
