// Controlli sui valori che arrivano dai dati (anche da un backup importato) prima di usarli come URL.
// Modulo senza dipendenze: è usato anche dai test in tests/.

const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+=*$/;
const HTTPS = /^https:\/\/[^\s"'()<>\\]+$/;

/** Restituisce l'immagine solo se è un'immagine incorporata (data:image/…) o un indirizzo https, altrimenti ''. */
export function safeImage(v: unknown): string {
  if (typeof v !== 'string' || v.length > 1_000_000) return ''; // stesso limite delle regole Firestore
  return DATA_IMAGE.test(v) || HTTPS.test(v) ? v : '';
}
