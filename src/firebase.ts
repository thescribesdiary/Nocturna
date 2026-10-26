import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import config from '../nocturna.config.js';

export const configured = !!(config.firebase.apiKey && config.firebase.projectId);

export const app = initializeApp(configured ? config.firebase : { apiKey: 'demo', projectId: 'demo-nocturna', appId: 'demo' });
export const auth = getAuth(app);
auth.languageCode = 'it';

// Cache offline: l'app funziona senza rete e sincronizza quando torna la connessione.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export async function login() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // Nell'app installata le finestre popup non sono affidabili: usiamo il reindirizzamento.
  if (isStandalone()) return signInWithRedirect(auth, provider);
  try {
    await signInWithPopup(auth, provider);
  } catch (e: any) {
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') return signInWithRedirect(auth, provider);
    throw e;
  }
}
export const logout = () => signOut(auth);
