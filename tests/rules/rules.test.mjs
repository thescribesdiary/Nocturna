// Test delle regole Firestore con l'emulatore. Si esegue con: npm run test:rules
// (la prima volta scarica l'emulatore da Google e richiede Java). Non usa dati né credenziali reali.
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';

const rules = readFileSync(new URL('../../firestore.rules.template', import.meta.url), 'utf8')
  .replace('__ALLOWED_EMAILS__', "'ammessa@example.com', 'seconda@example.com'");
let env;
const as = (uid, email, verified = true) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const u1 = () => as('u1', 'Ammessa@example.com'); // maiuscole: l'indirizzo viene confrontato in minuscolo
const u2 = () => as('u2', 'seconda@example.com');
const ts = () => serverTimestamp();

// Sicurezza: questi test devono girare solo contro l'emulatore locale e un progetto «demo-» (mai quello reale).
const PROJECT = 'demo-nocturna';
const host = process.env.FIRESTORE_EMULATOR_HOST || '';
if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host))
  throw new Error(`FIRESTORE_EMULATOR_HOST non punta a un emulatore locale (${host || 'non impostato'}): usa «npm run test:rules».`);
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('GOOGLE_APPLICATION_CREDENTIALS è impostata: i test delle regole non devono vedere credenziali reali.');

before(async () => { env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules, host: host.replace(/:\d+$/, '').replace(/^\[|\]$/g, ''), port: Number(host.split(':').pop()) } }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'users/condiviso/scuola/a1'), { kind: 'attivita', title: 'x', deletedAt: null });
    // Documento con un campo di tipo vecchio/inatteso: non deve impedire le modifiche agli altri campi.
    await setDoc(doc(db, 'users/condiviso/lavoro/vecchio'), { kind: 'task', title: 'v', deletedAt: 'ieri' });
    // Segno creato dal vecchio ripristino: contiene anche createdAt/updatedAt.
    await setDoc(doc(db, 'users/condiviso/impostazioni/spazio'), { merged: { u0: 1 }, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await setDoc(doc(db, 'users/condiviso/dispositivi/tok0'), { token: 'tok0', ua: 'x', lastSeen: Timestamp.now() });
    await setDoc(doc(db, 'users/u1/scuola/p1'), { kind: 'attivita', title: 'personale', notifyAt: Timestamp.now(), notifyQueue: [Timestamp.now()] });
    await setDoc(doc(db, 'users/u1/impostazioni/preferenze'), { tema: 'scuro' });
  });
});

test('account non autorizzati: nessuna lettura né scrittura', async () => {
  const anon = env.unauthenticatedContext().firestore();
  const altro = as('x', 'altro@example.com');
  const nonVerificata = as('u1', 'ammessa@example.com', false);
  for (const db of [anon, altro, nonVerificata]) {
    await assertFails(getDoc(doc(db, 'users/condiviso/scuola/a1')));
    await assertFails(setDoc(doc(db, 'users/condiviso/scuola/b'), { title: 'y' }));
    await assertFails(getDoc(doc(db, 'users/condiviso/impostazioni/spazio')));
    await assertFails(getDoc(doc(db, 'users/condiviso/dispositivi/tok0')));
  }
  await assertFails(getDoc(doc(as('u1', 'altro@example.com'), 'users/u1/scuola/p1')));
});

test('spazio personale: lettura del proprietario, scritture vietate', async () => {
  await assertSucceeds(getDoc(doc(u1(), 'users/u1/scuola/p1')));
  await assertSucceeds(getDoc(doc(u1(), 'users/u1/impostazioni/preferenze')));
  await assertFails(getDoc(doc(u2(), 'users/u1/scuola/p1')));
  await assertFails(updateDoc(doc(u1(), 'users/u1/scuola/p1'), { title: 'nuovo' }));
  await assertFails(updateDoc(doc(u1(), 'users/u1/scuola/p1'), { notifyAt: null, notifyQueue: [], title: 'nuovo' }));
  await assertFails(updateDoc(doc(u1(), 'users/u1/scuola/p1'), { notifyAt: Timestamp.now(), notifyQueue: [] }));
  await assertFails(updateDoc(doc(u1(), 'users/u1/scuola/p1'), { notifyAt: null, notifyQueue: [Timestamp.now()] }));
  await assertFails(setDoc(doc(u1(), 'users/u1/scuola/nuovo'), { title: 'x' }));
  await assertFails(deleteDoc(doc(u1(), 'users/u1/scuola/p1')));
  await assertFails(updateDoc(doc(u2(), 'users/u1/scuola/p1'), { notifyAt: null, notifyQueue: [] }));
});

test('spazio personale: ammessa solo la pulizia di notifyAt e notifyQueue', async () => {
  await assertSucceeds(updateDoc(doc(u1(), 'users/u1/scuola/p1'), { notifyAt: null, notifyQueue: [] }));
  await assertSucceeds(updateDoc(doc(u1(), 'users/u1/scuola/p1'), { notifyAt: null, notifyQueue: [] })); // ripetuta: nessun cambiamento
});

test('migrazione completa come la esegue joinSpace', async () => {
  const db = u1();
  await assertSucceeds(getDoc(doc(db, 'users/u1/scuola/p1')));
  const b = writeBatch(db);
  b.set(doc(db, 'users/condiviso/scuola/p1'), { kind: 'attivita', title: 'personale', notifyAt: Timestamp.now(), notifyQueue: [Timestamp.now()] });
  b.update(doc(db, 'users/u1/scuola/p1'), { notifyAt: null, notifyQueue: [] });
  b.set(doc(db, 'users/condiviso/impostazioni/preferenze'), { tema: 'scuro' });
  await assertSucceeds(b.commit());
  await assertSucceeds(setDoc(doc(db, 'users/condiviso/impostazioni/spazio'), { merged: { u1: Date.now() } }, { merge: true }));
});

test('collaborazione sui dati condivisi tra account autorizzati', async () => {
  await assertSucceeds(setDoc(doc(u1(), 'users/condiviso/lavoro/t1'), { kind: 'task', title: 't', deletedAt: null, notifyAt: null, notifyQueue: [], createdAt: ts(), updatedAt: ts() }));
  await assertSucceeds(getDoc(doc(u2(), 'users/condiviso/lavoro/t1')));
  await assertSucceeds(updateDoc(doc(u2(), 'users/condiviso/lavoro/t1'), { title: 'modificato da u2', updatedAt: ts() }));
  await assertSucceeds(updateDoc(doc(u2(), 'users/condiviso/scuola/a1'), { deletedAt: Date.now(), updatedAt: ts() }));
  await assertSucceeds(updateDoc(doc(u1(), 'users/condiviso/scuola/a1'), { deletedAt: null }));
  await assertSucceeds(deleteDoc(doc(u2(), 'users/condiviso/lavoro/t1')));
  await assertSucceeds(setDoc(doc(u2(), 'users/condiviso/impostazioni/preferenze'), { tema: 'chiaro', updatedAt: ts() }, { merge: true }));
  await assertSucceeds(setDoc(doc(u1(), 'users/condiviso/impostazioni/profilo'), { name: 'N', avatar: 'data:image/jpeg;base64,AA==', updatedAt: ts() }, { merge: true }));
  await assertSucceeds(deleteDoc(doc(u1(), 'users/condiviso/impostazioni/profilo')));
  // Un campo vecchio di tipo inatteso non blocca le modifiche agli altri campi.
  await assertSucceeds(updateDoc(doc(u1(), 'users/condiviso/lavoro/vecchio'), { title: 'ok', updatedAt: ts() }));
});

test('ripristino della Fase 2: scritture e poi eliminazioni in batch', async () => {
  const db = u1();
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), 'users/condiviso/scrittura/i1'), { kind: 'ispirazione', title: 'i', image: 'data:image/jpeg;base64,AA==', deletedAt: 5 });
    await setDoc(doc(c.firestore(), 'users/condiviso/impostazioni/profilo'), { name: 'N', avatar: 'data:image/jpeg;base64,AA==' });
  });
  // Il backup non ha più image/avatar/deletedAt: il set sostituisce il documento e toglie quei campi.
  await assertSucceeds(setDoc(doc(db, 'users/condiviso/scrittura/i1'), { kind: 'ispirazione', title: 'i', createdAt: ts(), updatedAt: ts() }));
  await assertSucceeds(setDoc(doc(db, 'users/condiviso/impostazioni/profilo'), { name: 'N', createdAt: ts(), updatedAt: ts() }));
  const w = writeBatch(db);
  w.set(doc(db, 'users/condiviso/scuola/r1'), { kind: 'attivita', title: 'dal backup', deletedAt: null, image: '', createdAt: ts(), updatedAt: ts() });
  w.set(doc(db, 'users/condiviso/impostazioni/colonne'), { scuola: {}, createdAt: ts(), updatedAt: ts() });
  await assertSucceeds(w.commit());
  const d = writeBatch(db);
  d.delete(doc(db, 'users/condiviso/scuola/a1'));
  await assertSucceeds(d.commit());
});

test('segnaposto impostazioni/spazio protetto', async () => {
  await assertSucceeds(setDoc(doc(u1(), 'users/condiviso/impostazioni/spazio'), { merged: { u1: 2 } }, { merge: true }));
  await assertSucceeds(setDoc(doc(u1(), 'users/condiviso/impostazioni/spazio'), { merged: { u1: 3 } }, { merge: true }));
  await assertFails(setDoc(doc(u2(), 'users/condiviso/impostazioni/spazio'), { merged: { u1: 4 } }, { merge: true }));
  await assertFails(setDoc(doc(u1(), 'users/condiviso/impostazioni/spazio'), { merged: { u1: 2 } })); // toglierebbe u0
  await assertFails(setDoc(doc(u1(), 'users/condiviso/impostazioni/spazio'), { altro: 1 }, { merge: true }));
  await assertFails(setDoc(doc(u1(), 'users/condiviso/impostazioni/spazio'), { merged: { u1: 'sì' } }, { merge: true }));
  await assertFails(deleteDoc(doc(u1(), 'users/condiviso/impostazioni/spazio')));
  const db = u1();
  const b = writeBatch(db);
  b.delete(doc(db, 'users/condiviso/impostazioni/spazio'));
  await assertFails(b.commit());
  await env.withSecurityRulesDisabled((c) => deleteDoc(doc(c.firestore(), 'users/condiviso/impostazioni/spazio')));
  await assertFails(setDoc(doc(u2(), 'users/condiviso/impostazioni/spazio'), { merged: { u1: 1 } }));
  await assertSucceeds(setDoc(doc(u2(), 'users/condiviso/impostazioni/spazio'), { merged: { u2: 1 } }, { merge: true }));
});

test('validazione dei campi e percorsi non previsti', async () => {
  const db = u1();
  await assertFails(setDoc(doc(db, 'users/condiviso/scuola/b'), { deletedAt: 'ieri' }));
  await assertFails(setDoc(doc(db, 'users/condiviso/scuola/b'), { image: 'x'.repeat(1000001) }));
  await assertFails(setDoc(doc(db, 'users/condiviso/scuola/b'), { image: 5 }));
  await assertFails(setDoc(doc(db, 'users/condiviso/scuola/b'), { updatedAt: 123 }));
  await assertFails(updateDoc(doc(db, 'users/condiviso/scuola/a1'), { deletedAt: 'ieri' }));
  await assertFails(setDoc(doc(db, 'users/condiviso/impostazioni/profilo'), { avatar: 7 }));
  const tanti = Object.fromEntries(Array.from({ length: 201 }, (_, i) => ['k' + i, i]));
  await assertFails(setDoc(doc(db, 'users/condiviso/scuola/b'), tanti));
  await assertFails(setDoc(doc(db, 'users/condiviso/altro/b'), { title: 'x' }));
  await assertFails(getDoc(doc(db, 'users/condiviso/altro/b')));
  await assertFails(setDoc(doc(db, 'users/condiviso/scuola/a1/sotto/x'), { title: 'x' }));
  await assertFails(setDoc(doc(db, 'altro/x'), { title: 'x' }));
  await assertFails(setDoc(doc(db, 'users/condiviso'), { title: 'x' }));
});

test('dispositivi: solo i campi previsti', async () => {
  const db = u1();
  await assertSucceeds(setDoc(doc(db, 'users/condiviso/dispositivi/tok1'), { token: 'tok1', ua: 'Safari', lastSeen: ts() }, { merge: true }));
  await assertSucceeds(getDoc(doc(u2(), 'users/condiviso/dispositivi/tok1')));
  await assertFails(setDoc(doc(db, 'users/condiviso/dispositivi/tok2'), { token: 'altro', ua: 'x', lastSeen: ts() }));
  await assertFails(setDoc(doc(db, 'users/condiviso/dispositivi/tok3'), { token: 'tok3', ua: 'x', lastSeen: ts(), extra: 1 }));
  await assertFails(setDoc(doc(db, 'users/condiviso/dispositivi/tok4'), { token: 'tok4', ua: 'x'.repeat(201), lastSeen: ts() }));
  await assertFails(setDoc(doc(db, 'users/condiviso/dispositivi/tok5'), { token: 'tok5', ua: 'x', lastSeen: 'oggi' }));
  await assertSucceeds(deleteDoc(doc(db, 'users/condiviso/dispositivi/tok1')));
  // Documento vecchio con un campo in più: si può ancora aggiornare lastSeen, ma non aggiungere campi.
  await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'users/condiviso/dispositivi/tok9'), { token: 'tok9', ua: 'x', lastSeen: Timestamp.now(), vecchio: true }));
  await assertSucceeds(setDoc(doc(db, 'users/condiviso/dispositivi/tok9'), { token: 'tok9', ua: 'x', lastSeen: ts() }, { merge: true }));
  await assertFails(setDoc(doc(db, 'users/condiviso/dispositivi/tok9'), { extra: 1 }, { merge: true }));
});
