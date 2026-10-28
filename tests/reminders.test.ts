import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore: script JavaScript senza tipi
import { planReminder, run, tokenGone, WINDOW, STALE } from '../scripts/reminders.mjs';

const NOW = Date.UTC(2026, 9, 29, 8, 0);
const T = { fromMillis: (n: number) => ({ ms: n, toMillis: () => n }) };

test('planReminder: invia i promemoria in scadenza e tiene in coda i successivi', () => {
  const r = planReminder('lavoro', { title: 'Riunione', due: '2026-10-29', time: '10:15', notifyQueue: [NOW + 5 * 60000, NOW + 2 * 86400000], notifyKinds: ['ora', 'ora'] }, NOW);
  assert.deepEqual(r.message, { title: 'Riunione', body: 'Alle 10:15 · Lavoro' });
  assert.deepEqual(r.patch, { queue: [NOW + 2 * 86400000], kinds: ['ora'], next: NOW + 2 * 86400000 });
});

test('planReminder: niente notifica per elementi nel cestino o promemoria scaduti da ore', () => {
  assert.equal(planReminder('scuola', { deletedAt: 1, notifyQueue: [NOW], date: '2026-10-29' }, NOW).message, null);
  const old = planReminder('scuola', { notifyQueue: [NOW - STALE - 1], date: '2026-10-29' }, NOW);
  assert.equal(old.message, null);
  assert.deepEqual(old.patch, { queue: [], kinds: [], next: null });
});

test('planReminder: testo corretto per scadenze di lettura e senza orario', () => {
  assert.equal(planReminder('lettura', { kind: 'libro', deadline: '2026-11-01', notifyQueue: [NOW], notifyKinds: ['libro'] }, NOW).message.body, "Scadenza di lettura dom 1 nov · The Scribe's Diary");
  assert.equal(planReminder('scrittura', { date: '2026-10-30', notifyQueue: [NOW], notifyKinds: ['ora'] }, NOW).message.body, 'Scadenza ven 30 ott · Mabel Altheanne Nyctalis');
});

test('tokenGone: solo i token non più registrati o non validi vengono rimossi', () => {
  assert.ok(tokenGone('messaging/registration-token-not-registered'));
  assert.ok(tokenGone('messaging/invalid-registration-token'));
  assert.ok(!tokenGone('messaging/invalid-argument'));
  assert.ok(!tokenGone('messaging/internal-error'));
  assert.ok(!tokenGone(undefined));
});

// Firestore e FCM finti: registrano cosa verrebbe scritto o inviato, senza rete.
function fake(docs: { path: string; data: any; changed?: boolean; fail?: boolean }[], fcmResults: Record<string, string> = {}) {
  const updates: string[] = [], sent: any[] = [], deleted: string[] = [];
  const db = {
    collectionGroup: (sec: string) => ({ where: () => ({ get: async () => ({
      docs: docs.filter((d) => d.path.split('/')[2] === sec).map((d) => ({
        id: d.path.split('/').pop(), updateTime: 'v1', data: () => d.data,
        ref: { parent: { parent: { id: d.path.split('/')[1] } }, update: async (_p: any, pre: any) => {
          if (d.fail) throw new Error('rete');
          if (d.changed || pre?.lastUpdateTime !== 'v1') throw Object.assign(new Error('FAILED_PRECONDITION'), { code: 9 });
          updates.push(d.path);
        } },
      })) }) }) }),
    collection: (p: string) => ({ get: async () => ({ docs: (p.includes('condiviso') ? ['t-ok', 't-gone', 't-bad'] : ['t-old']).map((id) => ({ id })) }) }),
    doc: (p: string) => ({ delete: async () => { deleted.push(p); } }),
  };
  const fcm = { sendEachForMulticast: async (m: any) => { sent.push(m); return {
    successCount: m.tokens.filter((t: string) => !fcmResults[t]).length,
    responses: m.tokens.map((t: string) => (fcmResults[t] ? { success: false, error: { code: fcmResults[t] } } : { success: true })),
  }; } };
  return { db, fcm, updates, sent, deleted };
}

test('run: prenota prima di inviare e salta i documenti cambiati nel frattempo (nessun doppione)', async () => {
  const f = fake([
    { path: 'users/condiviso/scuola/a', data: { title: 'A', date: '2026-10-29', notifyQueue: [NOW], notifyKinds: ['ora'], time: '09:00' } },
    { path: 'users/condiviso/scuola/b', data: { title: 'B', date: '2026-10-29', notifyQueue: [NOW] }, changed: true },
  ]);
  const s = await run({ db: f.db, fcm: f.fcm, Timestamp: T, app: 'https://x', now: NOW, log: () => {} });
  assert.deepEqual(f.updates, ['users/condiviso/scuola/a']);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].data.tag, 'a');
  assert.equal(s.changed, 1);
});

test('run: rimuove solo i token non più validi e un errore non blocca gli altri documenti', async () => {
  const f = fake([
    { path: 'users/condiviso/lavoro/x', data: { title: 'X', due: '2026-10-29', notifyQueue: [NOW] }, fail: true },
    { path: 'users/condiviso/lavoro/y', data: { title: 'Y', due: '2026-10-29', notifyQueue: [NOW] } },
  ], { 't-gone': 'messaging/registration-token-not-registered', 't-bad': 'messaging/invalid-argument' });
  const s = await run({ db: f.db, fcm: f.fcm, Timestamp: T, app: 'https://x', now: NOW, log: () => {} });
  assert.equal(s.errors, 1);
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.deleted, ['users/condiviso/dispositivi/t-gone']);
});

test('run: gli spazi personali usano i propri dispositivi; nessun invio se la coda resta futura', async () => {
  const f = fake([
    { path: 'users/u1/lettura/p', data: { title: 'P', date: '2026-10-29', notifyQueue: [NOW] } },
    { path: 'users/condiviso/lettura/q', data: { title: 'Q', date: '2026-11-29', notifyQueue: [NOW + WINDOW + 1] } },
  ]);
  await run({ db: f.db, fcm: f.fcm, Timestamp: T, app: 'https://x', now: NOW, log: () => {} });
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.sent[0].tokens, ['t-old']);
});
