// Notifiche push: registra questo dispositivo per ricevere i promemoria inviati da GitHub.
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app, db } from '../firebase';
import config from '../../nocturna.config.js';

const KEY = 'nocturna-push-token';
export type PushState = 'attive' | 'spente' | 'negate' | 'non-supportate' | 'non-configurate';

export async function pushState(): Promise<PushState> {
  if (!config.vapidKey) return 'non-configurate';
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported().catch(() => false))) return 'non-supportate';
  if (Notification.permission === 'denied') return 'negate';
  return Notification.permission === 'granted' && localStorage.getItem(KEY) ? 'attive' : 'spente';
}

async function register(uid: string) {
  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey: config.vapidKey, serviceWorkerRegistration: reg });
  if (!token) throw new Error('no-token');
  const old = localStorage.getItem(KEY);
  if (old && old !== token) await deleteDoc(doc(db, 'users', uid, 'dispositivi', old)).catch(() => {});
  await setDoc(doc(db, 'users', uid, 'dispositivi', token), { token, ua: navigator.userAgent.slice(0, 200), lastSeen: serverTimestamp() }, { merge: true });
  localStorage.setItem(KEY, token);
}

export async function enablePush(uid: string): Promise<PushState> {
  const s = await pushState();
  if (s === 'non-configurate' || s === 'non-supportate' || s === 'negate') return s;
  const p = await Notification.requestPermission();
  if (p !== 'granted') return p === 'denied' ? 'negate' : 'spente';
  await register(uid);
  return 'attive';
}

export async function disablePush(uid: string) {
  stopListening?.(); stopListening = null;
  const t = localStorage.getItem(KEY);
  if (t) await deleteDoc(doc(db, 'users', uid, 'dispositivi', t)).catch(() => {});
  await deleteToken(getMessaging(app)).catch(() => {});
  localStorage.removeItem(KEY);
}

/** All'avvio: rinnova il token se le notifiche sono già attive e mostra quelle che arrivano con l'app aperta. */
// Un solo ascoltatore per tutta la sessione: se initPush viene chiamata più volte
// (nuovo rendering, cambio di account) le notifiche non vengono mostrate due volte.
let stopListening: (() => void) | null = null;
let currentSay: (m: string) => void = () => {};

export async function initPush(uid: string, say: (m: string) => void) {
  currentSay = say;
  if ((await pushState()) !== 'attive') return;
  await register(uid).catch(() => {});
  if (stopListening) return;
  stopListening = onMessage(getMessaging(app), async (m) => {
    const title = m.notification?.title || 'Nocturna', body = m.notification?.body || '';
    currentSay(title + (body ? ' · ' + body : ''));
    const reg = await navigator.serviceWorker.ready;
    // Stesso tag usato in background (ID del documento): una notifica nuova sostituisce quella vecchia invece di sommarsi.
    reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: m.data?.tag || m.messageId });
  });
}

export async function testNotification() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('Nocturna', { body: 'Le notifiche funzionano su questo dispositivo.', icon: '/icon-192.png', badge: '/icon-192.png' });
}
