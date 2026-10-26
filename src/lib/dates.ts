// Funzioni sulle date, riprese dai prototipi. Le date sono stringhe "AAAA-MM-GG", gli orari "HH:MM".
export const pad = (n: number) => String(n).padStart(2, '0');
export const K = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const P = (s: string) => {
  const a = s.split('-').map(Number);
  return new Date(a[0], a[1] - 1, a[2]);
};
export const add = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const monday = (d: Date) => add(d, -((d.getDay() + 6) % 7));
/** Stesso giorno del mese successivo; se non esiste (31 → 30 novembre) usa l'ultimo giorno del mese. */
export const addMonth = (d: Date, n = 1) => {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last));
};

export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const dayLong = (d: Date) => cap(GIORNI[d.getDay()]) + ' ' + d.getDate() + ' ' + MESI[d.getMonth()];
/** "sab 24 ott" */
export const fmtS = (k: string) => {
  const d = P(k);
  return GG[d.getDay()].toLowerCase() + ' ' + d.getDate() + ' ' + MESI[d.getMonth()].slice(0, 3);
};

export const todayKey = () => K(new Date());

/** Data + ora locali → Date. */
export const at = (date: string, time?: string) => {
  const d = P(date);
  if (time) {
    const [h, m] = time.split(':').map(Number);
    if (!isNaN(h)) d.setHours(h, m || 0, 0, 0);
  }
  return d;
};
