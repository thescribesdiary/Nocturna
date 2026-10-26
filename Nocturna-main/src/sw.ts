/// <reference lib="webworker" />
// Service worker di Nocturna: app installabile, uso offline e notifiche push.
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import config from '../nocturna.config.js';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// Tutte le pagine aprono l'app, tranne le pagine di accesso di Firebase (/__/auth/...).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/__\//] }));

// Notifiche push: Firebase mostra da solo i promemoria che arrivano ad app chiusa.
if (config.firebase.apiKey && config.vapidKey) {
  onBackgroundMessage(getMessaging(initializeApp(config.firebase)), () => {});
}

// Toccando una notifica si apre (o si porta in primo piano) Nocturna.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) return (all[0] as WindowClient).focus();
    return self.clients.openWindow('/');
  })());
});
