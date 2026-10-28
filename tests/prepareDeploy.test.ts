// Verifica scripts/prepare-deploy.mjs (usato dal deploy) in una cartella temporanea:
// non tocca i file del progetto e usa solo valori finti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CFG = 'const firebaseConfig = { apiKey: "AIzaFINTA", authDomain: "nocturna-prova1.firebaseapp.com", projectId: "nocturna-prova1", appId: "1:2:web:3" };';

function run(env: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'nocturna-deploy-'));
  try {
    mkdirSync(join(dir, 'scripts'));
    cpSync(join(ROOT, 'scripts/prepare-deploy.mjs'), join(dir, 'scripts/prepare-deploy.mjs'));
    cpSync(join(ROOT, 'nocturna.config.js'), join(dir, 'nocturna.config.js'));
    cpSync(join(ROOT, 'firestore.rules.template'), join(dir, 'firestore.rules.template'));
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    const genv = join(dir, 'github_env');
    const r = spawnSync(process.execPath, ['scripts/prepare-deploy.mjs'], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH ?? '', GITHUB_ENV: genv, ...env } });
    const read = (f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : '');
    return { status: r.status, out: r.stdout + r.stderr, rules: read('firestore.rules'), rc: read('.firebaserc'), genv: read('github_env') };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('genera le regole con gli indirizzi autorizzati (minuscoli) e nessun segnaposto rimasto', () => {
  const r = run({ FIREBASE_CONFIG: CFG, ALLOWED_EMAIL: 'Prima@Example.com, seconda@example.com' });
  assert.equal(r.status, 0, r.out);
  assert.ok(r.rules.includes("in ['prima@example.com', 'seconda@example.com']"));
  assert.ok(!r.rules.includes('__ALLOWED_EMAILS__'));
  assert.equal(JSON.parse(r.rc).projects.default, 'nocturna-prova1');
  assert.equal(r.genv, 'FIREBASE_PROJECT=nocturna-prova1\n');
});

test('il modello delle regole contiene il segnaposto una sola volta', () => {
  const t = readFileSync(join(ROOT, 'firestore.rules.template'), 'utf8');
  assert.equal(t.split('__ALLOWED_EMAILS__').length - 1, 1);
});

test('rifiuta configurazioni pericolose o incomplete senza generare file', () => {
  const casi: Record<string, string>[] = [
    { FIREBASE_CONFIG: CFG, ALLOWED_EMAIL: '' },
    { FIREBASE_CONFIG: CFG, ALLOWED_EMAIL: "x'@example.com" },
    { FIREBASE_CONFIG: CFG.replace('nocturna-prova1"', 'abc\nNODE_OPTIONS=--require=/tmp/x"'), ALLOWED_EMAIL: 'a@example.com' },
    { FIREBASE_CONFIG: CFG.replace(/projectId: "[^"]+"/, 'projectId: "Progetto_Non_Valido"'), ALLOWED_EMAIL: 'a@example.com' },
  ];
  for (const env of casi) {
    const r = run(env);
    assert.equal(r.status, 1, JSON.stringify(env));
    assert.equal(r.rules, '');
    assert.equal(r.genv, '');
  }
});
