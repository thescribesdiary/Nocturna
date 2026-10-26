// Prepara la pubblicazione: legge la configurazione, la controlla e genera le regole di sicurezza.
// Viene eseguito automaticamente da GitHub prima di ogni pubblicazione.
import { readFileSync, writeFileSync } from 'node:fs';

const fail = (msg) => { console.error('\n✗ ' + msg + '\n'); process.exit(1); };
const KEYS = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];

// 1. Configurazione Firebase: dal secret FIREBASE_CONFIG (si incolla così come la mostra la console),
//    altrimenti da nocturna.config.js.
const fileCfg = (await import('../nocturna.config.js')).default;
let fb = { ...(fileCfg.firebase || {}) };
const pasted = process.env.FIREBASE_CONFIG || '';
if (pasted.trim()) {
  fb = {};
  for (const k of KEYS) {
    const m = pasted.match(new RegExp(k + `\\s*["']?\\s*:\\s*["']([^"']+)["']`));
    if (m) fb[k] = m[1].trim();
  }
}
for (const k of ['apiKey', 'authDomain', 'projectId', 'appId'])
  if (!fb[k]) fail(`Nella configurazione Firebase manca "${k}". Ricopia nel secret FIREBASE_CONFIG tutto il blocco firebaseConfig della console.`);
const vm = pasted.match(/vapidKey\s*["']?\s*:\s*["']([^"']+)["']/);
const vapidKey = ((vm && vm[1]) || process.env.FIREBASE_VAPID_KEY || fileCfg.vapidKey || '').trim();
writeFileSync('nocturna.config.js', `// Generato automaticamente durante la pubblicazione.\nexport default ${JSON.stringify({ firebase: fb, vapidKey }, null, 2)};\n`);

// 2. Account autorizzati: solo dal secret ALLOWED_EMAIL (non compaiono mai nel codice pubblico).
//    Uno o più indirizzi Google separati da virgola: tutti vedono e modificano gli stessi dati.
const emails = (process.env.ALLOWED_EMAIL || '').split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
if (!emails.length) fail("Manca il secret ALLOWED_EMAIL su GitHub con l'indirizzo Google autorizzato (vedi README).");
for (const e of emails) if (!/^[^@\s'\\]+@[^@\s'\\]+\.[^@\s'\\]+$/.test(e)) fail(`Nel secret ALLOWED_EMAIL "${e}" non sembra un indirizzo email. Scrivi gli indirizzi separati da una virgola.`);

writeFileSync('firestore.rules', readFileSync('firestore.rules.template', 'utf8').replace('__ALLOWED_EMAILS__', emails.map((e) => `'${e}'`).join(', ')));
writeFileSync('.firebaserc', JSON.stringify({ projects: { default: fb.projectId } }, null, 2));
if (process.env.GITHUB_ENV) writeFileSync(process.env.GITHUB_ENV, `FIREBASE_PROJECT=${fb.projectId}\n`, { flag: 'a' });
console.log(`✓ Account autorizzati: ${emails.length}.`);
console.log(`✓ Configurazione valida per il progetto ${fb.projectId}.` + (vapidKey ? ' Notifiche push configurate.' : ' Notifiche push non ancora configurate (manca vapidKey).'));
