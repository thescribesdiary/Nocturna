// Invia le notifiche dei promemoria in scadenza. Viene eseguito da GitHub ogni 15 minuti.
// Legge da Firestore solo i documenti con notifyAt vicino e li notifica sui dispositivi registrati.
//
// Per evitare notifiche doppie e sovrascritture:
// 1. prima «prenota» il promemoria aggiornando il documento solo se nessuno lo ha modificato dopo la lettura
//    (precondizione sull'ora di aggiornamento); se l'app lo ha cambiato nel frattempo, lo salta: ci penserà
//    il giro successivo con i dati nuovi;
// 2. solo dopo invia la notifica. Un errore su un documento non blocca gli altri.
import { pathToFileURL } from 'node:url';

export const SECTIONS = { scuola: 'Scuola', lavoro: 'Lavoro', lettura: "The Scribe's Diary", scrittura: 'Mabel Altheanne Nyctalis' };
export const WINDOW = 20 * 60000;          // invia ciò che scade entro 20 minuti (GitHub può ritardare)
export const STALE = 3 * 3600000;          // promemoria più vecchi di 3 ore: non più utili, si saltano
const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'], MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export const dateOf = (c, x) => c === 'scuola' ? x.date || x.due || '' : c === 'lavoro' ? (x.type === 'riunione' ? x.start || x.due : x.due || x.start) || '' : x.date || '';
export const fmt = (k) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k || '')) return '';
  const [y, m, d] = k.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d));
  return GG[dt.getUTCDay()] + ' ' + d + ' ' + MESI[m - 1];
};

/** Errori FCM che indicano un token non più valido (solo questi portano a cancellarlo). */
export const tokenGone = (code = '') => code.includes('registration-token-not-registered') || code.includes('invalid-registration-token');

/**
 * Decide cosa fare con un documento: quali promemoria restano in coda (`patch`) e, se serve, la notifica da inviare.
 * `toMillis` converte i Timestamp di Firestore; nei test bastano numeri.
 */
export function planReminder(sec, x, now, toMillis = (t) => (typeof t === 'number' ? t : t.toMillis())) {
  const kinds = x.notifyKinds || [];
  const q = (x.notifyQueue || []).map((t, i) => [toMillis(t), kinds[i] || 'ora']).sort((a, b) => a[0] - b[0]);
  const due = q.filter(([t]) => t <= now + WINDOW), rest = q.filter(([t]) => t > now + WINDOW);
  const fresh = due.filter(([t]) => t >= now - STALE);
  const patch = { queue: rest.map(([t]) => t), kinds: rest.map(([, k]) => k), next: rest.length ? rest[0][0] : null };
  if (!fresh.length || x.deletedAt) return { patch, message: null };
  const label = SECTIONS[sec];
  const date = x.kind === 'libro' ? x.deadline : dateOf(sec, x);
  const latest = fresh[fresh.length - 1][1];
  const quando = fmt(date);
  const body = latest === 'libro' ? `Scadenza di lettura ${quando} · ${label}`
    : latest === 'ora' && x.time ? `Alle ${x.time} · ${label}`
    : `Scadenza ${quando}${x.time ? ' alle ' + x.time : ''} · ${label}`;
  return { patch, message: { title: x.title || 'Promemoria', body } };
}

export async function run({ db, fcm, Timestamp, app, now = Date.now(), log = console.log }) {
  const tokensCache = new Map();
  const tokensOf = async (space) => {
    if (!tokensCache.has(space)) tokensCache.set(space, (await db.collection(`users/${space}/dispositivi`).get()).docs.map((d) => d.id));
    return tokensCache.get(space);
  };
  const stats = { sent: 0, skipped: 0, changed: 0, errors: 0, removedTokens: 0 };
  for (const sec of Object.keys(SECTIONS)) {
    const snap = await db.collectionGroup(sec).where('notifyAt', '<=', Timestamp.fromMillis(now + WINDOW)).get();
    for (const doc of snap.docs) {
      try {
        const space = doc.ref.parent.parent?.id;
        const { patch, message } = planReminder(sec, doc.data(), now);
        // 1. Prenotazione: fallisce se il documento è cambiato dopo la lettura.
        try {
          await doc.ref.update({
            notifyQueue: patch.queue.map((t) => Timestamp.fromMillis(t)), notifyKinds: patch.kinds,
            notifyAt: patch.next == null ? null : Timestamp.fromMillis(patch.next), notifiedAt: Timestamp.fromMillis(now),
          }, { lastUpdateTime: doc.updateTime });
        } catch (e) {
          if (e?.code === 9 || e?.code === 5 || /FAILED_PRECONDITION|NOT_FOUND/i.test(String(e?.message))) { stats.changed++; continue; }
          throw e;
        }
        if (!space || !message) { stats.skipped++; continue; }
        // 2. Invio, solo dopo la prenotazione riuscita.
        const tokens = await tokensOf(space);
        if (!tokens.length) { stats.skipped++; continue; }
        const res = await fcm.sendEachForMulticast({
          tokens,
          notification: message,
          data: { tag: doc.id, section: sec },
          webpush: { notification: { icon: `${app}/icon-192.png`, badge: `${app}/icon-192.png`, tag: doc.id, renotify: true }, fcmOptions: { link: `${app}/#/${sec}` } },
        });
        stats.sent += res.successCount;
        for (const [i, r] of res.responses.entries()) {
          if (r.success || !tokenGone(r.error?.code)) continue;
          await db.doc(`users/${space}/dispositivi/${tokens[i]}`).delete().then(() => stats.removedTokens++).catch(() => {});
        }
      } catch (e) {
        stats.errors++;
        log(`Errore sul promemoria ${sec}/${doc.id}: ${e?.code || ''} ${e?.message || e}`);
      }
    }
  }
  return stats;
}

async function main() {
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
  const { getMessaging } = await import('firebase-admin/messaging');
  let sa = {};
  try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}'); } catch { /* il contenuto del secret non va mai stampato */ }
  if (!sa.project_id) { console.error('Manca il secret FIREBASE_SERVICE_ACCOUNT, oppure non è un JSON valido.'); process.exit(1); }
  initializeApp({ credential: cert(sa) });
  const s = await run({ db: getFirestore(), fcm: getMessaging(), Timestamp, app: `https://${sa.project_id}.firebaseapp.com` });
  console.log(`Notifiche inviate: ${s.sent}. Promemoria saltati: ${s.skipped}. Cambiati nel frattempo: ${s.changed}. Token rimossi: ${s.removedTokens}. Errori: ${s.errors}.`);
  if (s.errors) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
