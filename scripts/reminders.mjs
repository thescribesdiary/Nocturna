// Invia le notifiche dei promemoria in scadenza. Viene eseguito da GitHub ogni 15 minuti.
// Legge da Firestore solo i documenti con notifyAt vicino e li notifica sui dispositivi registrati.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (!sa.project_id) { console.error('Manca il secret FIREBASE_SERVICE_ACCOUNT.'); process.exit(1); }
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const fcm = getMessaging();
const APP = `https://${sa.project_id}.firebaseapp.com`;

const SECTIONS = { scuola: 'Scuola', lavoro: 'Lavoro', lettura: "The Scribe's Diary", scrittura: 'Mabel Altheanne Nyctalis' };
const WINDOW = 20 * 60000;          // invia ciò che scade entro 20 minuti (GitHub può ritardare)
const STALE = 3 * 3600000;          // promemoria più vecchi di 3 ore: non più utili, si saltano
const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'], MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const now = Date.now();

const dateOf = (c, x) => c === 'scuola' ? x.date || x.due || '' : c === 'lavoro' ? (x.type === 'riunione' ? x.start || x.due : x.due || x.start) || '' : x.date || '';
const fmt = (k) => { const [y, m, d] = k.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); return GG[dt.getUTCDay()] + ' ' + d + ' ' + MESI[m - 1]; };
const tokensCache = new Map();
async function tokensOf(uid) {
  if (!tokensCache.has(uid)) {
    const s = await db.collection(`users/${uid}/dispositivi`).get();
    tokensCache.set(uid, s.docs.map((d) => d.id));
  }
  return tokensCache.get(uid);
}

let sent = 0, skipped = 0;
for (const [sec, label] of Object.entries(SECTIONS)) {
  const snap = await db.collectionGroup(sec).where('notifyAt', '<=', Timestamp.fromMillis(now + WINDOW)).get();
  for (const doc of snap.docs) {
    const x = doc.data();
    const uid = doc.ref.parent.parent?.id;
    const kinds = x.notifyKinds || [];
    const q = (x.notifyQueue || []).map((t, i) => [t.toMillis(), kinds[i] || 'ora']).sort((a, b) => a[0] - b[0]);
    const due = q.filter(([t]) => t <= now + WINDOW), rest = q.filter(([t]) => t > now + WINDOW);
    const fresh = due.filter(([t]) => t >= now - STALE);
    if (uid && fresh.length && !x.deletedAt) {
      const date = x.kind === 'libro' ? x.deadline : dateOf(sec, x);
      const latest = fresh[fresh.length - 1][1];
      const body = latest === 'libro' ? `Scadenza di lettura ${fmt(date)} · ${label}` : latest === 'ora' ? `Alle ${x.time} · ${label}` : `Scadenza ${fmt(date)}${x.time ? ' alle ' + x.time : ''} · ${label}`;
      const tokens = await tokensOf(uid);
      if (tokens.length) {
        const res = await fcm.sendEachForMulticast({
          tokens,
          notification: { title: x.title || 'Promemoria', body },
          webpush: { notification: { icon: `${APP}/icon-192.png`, badge: `${APP}/icon-192.png`, tag: doc.id, renotify: true }, fcmOptions: { link: `${APP}/#/${sec}` } },
        });
        res.responses.forEach((r, i) => {
          const code = r.error?.code || '';
          if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('invalid-argument'))
            db.doc(`users/${uid}/dispositivi/${tokens[i]}`).delete().catch(() => {});
        });
        sent += res.successCount;
      }
    } else skipped++;
    await doc.ref.update({ notifyQueue: rest.map(([t]) => Timestamp.fromMillis(t)), notifyKinds: rest.map(([, k]) => k), notifyAt: rest.length ? Timestamp.fromMillis(rest[0][0]) : null, notifiedAt: Timestamp.now() });
  }
}
console.log(`Notifiche inviate: ${sent}. Promemoria saltati: ${skipped}.`);
