// Modelli dati di ogni sezione, ricavati dai prototipi: tipologie, campi dei moduli, filtri.
import { Rec, Section } from './sections';

export type Opt = [string, string, string?]; // valore, etichetta, icona o colore
export type Docs = Record<Section, Rec[]>;
export type Field = {
  k: string; // chiave, anche annidata ("grade.value")
  label: string;
  t: 'text' | 'textarea' | 'date' | 'time' | 'month' | 'number' | 'choice' | 'select' | 'multi' | 'bool' | 'rating' | 'image' | 'status' | 'repeat';
  opts?: Opt[] | ((docs: Docs, r: Rec) => Opt[]);
  show?: (r: Rec) => boolean;
  ph?: string;
  hint?: string;
  half?: boolean;
  /** Per le immagini: larghezza massima in px (copertine 240, ispirazione 1200). */
  w?: number;
  icon?: string;
  /** Etichetta che dipende da altri campi (es. «Referente del review party»). */
  labelFn?: (r: Rec) => string;
};
export type Group = { title?: string; adv?: boolean; show?: (r: Rec) => boolean; fields: Field[] };
export type KindDef = {
  section: Section; kind: string; noun: string; newLabel: string; editLabel: string;
  titleKey: 'title' | 'name'; required: [string, string][]; blank: Record<string, any>; groups: Group[];
};

export const getP = (o: any, k: string) => k.split('.').reduce((a, p) => (a == null ? undefined : a[p]), o);
export const setP = (o: any, k: string, v: any): any => {
  const [h, ...r] = k.split('.');
  return { ...o, [h]: r.length ? setP(o?.[h] || {}, r.join('.'), v) : v };
};
const label = (opts: Opt[], v: any) => opts.find((o) => o[0] === v)?.[1] || '';
export const optLabel = label;

const ref = (s: Section, kind: string, key: 'title' | 'name' = 'title', filter?: (x: Rec) => boolean) =>
  (docs: Docs): Opt[] => docs[s].filter((x) => x.kind === kind && (!filter || filter(x))).map((x) => [x.id, x[key] || '(senza titolo)'] as Opt).sort((a, b) => a[1].localeCompare(b[1]));
const is = (k: string, ...v: any[]) => (r: Rec) => v.includes(getP(r, k));

// ── SCUOLA ─────────────────────────────────────────────────────────────
export const S_TYPES: Opt[] = [['verifica', 'Verifica', 'ph-exam'], ['interrogazione', 'Interrogazione', 'ph-chat-circle-text'], ['compito', 'Compito', 'ph-pencil-simple-line'], ['studio', 'Sessione di studio', 'ph-book-open'], ['consegna', 'Consegna', 'ph-tray-arrow-up'], ['lezione', 'Lezione', 'ph-chalkboard-teacher'], ['altro', 'Altro', 'ph-dots-three-circle']];
export const PROVA = ['verifica', 'interrogazione'];
export const PRIO3: Opt[] = [['bassa', 'Bassa'], ['media', 'Media'], ['alta', 'Alta']];
export const DAYS: Opt[] = [['1', 'Lunedì'], ['2', 'Martedì'], ['3', 'Mercoledì'], ['4', 'Giovedì'], ['5', 'Venerdì'], ['6', 'Sabato']];
const subjects = ref('scuola', 'materia', 'name');

// ── LAVORO ─────────────────────────────────────────────────────────────
export const L_TYPES: Opt[] = [['task', 'Task', 'ph-check-square'], ['feature', 'Feature', 'ph-sparkle'], ['bug', 'Bug', 'ph-bug'], ['refactor', 'Refactoring', 'ph-wrench'], ['review', 'Code review', 'ph-git-pull-request'], ['test', 'Test e debugging', 'ph-flask'], ['riunione', 'Riunione', 'ph-users-three'], ['doc', 'Documentazione', 'ph-file-text'], ['rilascio', 'Consegna o rilascio', 'ph-rocket-launch'], ['richiesta', 'Richiesta ricevuta', 'ph-envelope-simple'], ['altro', 'Altro', 'ph-dots-three-circle']];
const SW = ['feature', 'bug', 'refactor', 'review', 'test', 'doc', 'rilascio'];
export const PRIO4: Opt[] = [['bassa', 'Bassa', 'ph-caret-down'], ['media', 'Media', 'ph-equals'], ['alta', 'Alta', 'ph-caret-double-up'], ['urgente', 'Urgente', 'ph-warning-diamond']];
export const PSTAT: Opt[] = [['pianificazione', 'Pianificazione', '#b3a8ab'], ['attivo', 'Attivo', '#8e9fbd'], ['pausa', 'In pausa', '#c2925f'], ['completato', 'Completato', '#86a58f'], ['archiviato', 'Archiviato', '#6f6669']];
const AREAS: Opt[] = ['Frontend', 'Backend', 'Database', 'API', 'Full stack'].map((a) => [a, a]);
export const NK: Opt[] = [['verbale', 'Verbale', 'ph-users-three'], ['appunto', 'Appunto', 'ph-note'], ['tecnica', 'Nota tecnica', 'ph-code']];
const lprojects = ref('lavoro', 'progetto', 'name', (x) => x.status !== 'archiviato');

// ── LETTURA ────────────────────────────────────────────────────────────
export const BST: Opt[] = [['daleggere', 'Da leggere', '#b3a8ab'], ['inlettura', 'In lettura', '#de7f99'], ['completato', 'Completato', '#86a58f'], ['darecensire', 'Da recensire', '#e0c08a'], ['attesa', 'In attesa', '#c2925f'], ['nonleggere', 'Da non leggere', '#75696c']];
export const A_TYPES: Opt[] = [['recensione', 'Recensione', 'ph-pen-nib'], ['blogtour', 'Tappa blog tour (intervista/analisi)', 'ph-flag-pennant'], ['cover', 'Cover reveal', 'ph-image'], ['segnalazione', "Segnalazione d'uscita", 'ph-megaphone-simple'], ['post', 'Post libero sul blog', 'ph-article'], ['unboxing', 'Unboxing', 'ph-package'], ['release', 'Release', 'ph-calendar-star'], ['social', 'Contenuto social', 'ph-share-network'], ['promo', 'Contenuti promozionali', 'ph-sparkle'], ['altro', 'Altro', 'ph-dots-three-circle']];
export const A_COLORS: Record<string, string> = { recensione: '#8fa6d6', blogtour: '#d9606f', cover: '#b98ad6', segnalazione: '#6fb7b4', post: '#86a58f', unboxing: '#d6a35c', release: '#de7f99', social: '#8e9fbd', promo: '#e0c08a', altro: '#93878a' };
export const FORMATS: Opt[] = [['cartaceo', 'Cartaceo', 'ph-book'], ['digitale', 'Digitale (ebook/PDF)', 'ph-device-mobile'], ['audio', 'Audiolibro', 'ph-headphones']];
export const COLLABS: Opt[] = [['nessuna', 'Nessuna'], ['reviewparty', 'Review party'], ['blogtour', 'Blog tour'], ['omaggio', 'Copia omaggio'], ['arc', 'ARC / anteprima'], ['autore', "Con l'autore"]];
const COLLAB_WHO: Record<string, string> = { reviewparty: 'Referente del review party', blogtour: 'Organizzatrice del blog tour', omaggio: 'Contatto della casa editrice', arc: "Contatto per l'anteprima", autore: "Contatto dell'autore" };
const REVST: Opt[] = [['darecensire', 'Da recensire'], ['bozza', 'In bozza'], ['pubblicata', 'Pubblicata'], ['nonprevista', 'Non prevista']];
export const READER: Opt[] = [['me', 'Letto da me', 'ph-user'], ['delegato', 'Terza persona (delegato)', 'ph-handshake'], ['nessuno', 'Nessuno (sola segnalazione)', 'ph-prohibit']];
const DLMODE: Opt[] = [['data', 'Data precisa', 'ph-calendar-check'], ['mese', 'Entro un mese', 'ph-calendar-dots'], ['nessuna', 'Nessuna scadenza', 'ph-minus-circle']];
export const CHANNELS: Opt[] = [['blog', 'Blog', 'ph-globe'], ['instagram', 'Instagram', 'ph-instagram-logo'], ['goodreads', 'Goodreads', 'ph-books']];
export const REMIND: Opt[] = [['', 'Nessun avviso'], ['0', 'Il giorno stesso'], ['1', '1 giorno prima'], ['3', '3 giorni prima'], ['7', '1 settimana prima']];
const books = ref('lettura', 'libro', 'title', (x) => !x.volDone && !x.volCancelled);

// Tipi di attività e canali del piano editoriale: modificabili da Impostazioni (documento impostazioni/lettura).
export type LType = { id: string; label: string; icon: string; color: string };
export type LChan = { id: string; label: string; icon: string };
export type LetturaCfg = { types: LType[]; channels: LChan[] };
export const DEFAULT_LCFG: LetturaCfg = {
  types: A_TYPES.map(([id, label, icon]) => ({ id, label, icon: icon || 'ph-bookmark-simple', color: A_COLORS[id] || '#93878a' })),
  channels: CHANNELS.map(([id, label, icon]) => ({ id, label, icon: icon || 'ph-hash' })),
};
let LCFG: LetturaCfg = DEFAULT_LCFG;
/** Chiamata dall'archivio quando cambiano le impostazioni di Lettura. */
export const setLetturaCfg = (c?: Partial<LetturaCfg> | null) => {
  LCFG = { types: c?.types?.length ? c.types : DEFAULT_LCFG.types, channels: c?.channels?.length ? c.channels : DEFAULT_LCFG.channels };
};
export const letturaCfg = () => LCFG;
export const lTypes = (): Opt[] => LCFG.types.map((t) => [t.id, t.label, t.icon] as Opt);
export const lChannels = (): Opt[] => LCFG.channels.map((t) => [t.id, t.label, t.icon] as Opt);
export const lTypeColor = (id?: string) => LCFG.types.find((t) => t.id === id)?.color || '#93878a';
export const lChannelLabel = (id: string) => LCFG.channels.find((t) => t.id === id)?.label || id;
/** Un libro chiuso (volume completato o annullato) sparisce da panoramica, calendari e promemoria. */
export const bookClosed = (b: Rec) => !!(b.volDone || b.volCancelled);

// ── SCRITTURA ──────────────────────────────────────────────────────────
export const W_TYPES: Opt[] = [['storia', 'Scrittura di una storia', 'ph-feather'], ['capitolo', 'Capitolo', 'ph-file-text'], ['revisione', 'Revisione', 'ph-magnifying-glass'], ['preparazione', 'Preparazione alla pubblicazione', 'ph-stack'], ['pubblicazione', 'Pubblicazione', 'ph-paper-plane-tilt'], ['promozione', 'Contenuto o promozione autoriale', 'ph-share-network'], ['corte', 'Attività della corte', 'ph-crown-simple'], ['altro', 'Altro', 'ph-dots-three-circle']];
export const PKINDS: Opt[] = ['Romanzo', 'Racconto', 'Raccolta', 'Oneshot', 'Storia a capitoli', 'Altro'].map((x) => [x, x]);
const wprojects = ref('scrittura', 'progetto');
export const W_PSTAT: Opt[] = [['idea', 'Da ideare', '#857a7d'], ['scrittura', 'In scrittura', '#a98ad6'], ['revisione', 'In revisione', '#c2925f'], ['pronto', 'Pronto per pubblicazione', '#e0c08a'], ['pubblicato', 'Pubblicato', '#86a58f'], ['pausa', 'In pausa', '#6f6669']];

const TYPES: Record<Section, () => Opt[]> = { scuola: () => S_TYPES, lavoro: () => L_TYPES, lettura: lTypes, scrittura: () => W_TYPES };
export const typesOf = (c: Section) => TYPES[c]();
export const typeOf = (c: Section, t?: string): Opt => { const l = TYPES[c](); return l.find((x) => x[0] === t) || l.find((x) => x[0] === 'altro') || ['altro', 'Altro', 'ph-dots-three-circle']; };

const when: Field[] = [
  { k: 'date', label: 'Data', t: 'date', half: true },
  { k: 'time', label: 'Ora', t: 'time', half: true },
];
const repeat: Field = { k: 'repeat', label: 'Ripeti', t: 'repeat' };

export const KINDS: Record<string, KindDef> = {
  'scuola/attivita': {
    section: 'scuola', kind: 'attivita', noun: 'attività', newLabel: 'Nuova attività', editLabel: 'Modifica attività', titleKey: 'title', required: [['title', 'Il titolo è obbligatorio.']],
    blank: { type: 'compito', subject: null, date: '', time: '', end: '', due: '', topics: '', notes: '', estimate: '', priority: 'media', grade: null, linkedTo: null, duration: '', repeat: '' },
    groups: [
      { fields: [
        { k: 'title', label: 'Titolo', t: 'text', ph: 'Es. Verifica di storia' },
        { k: 'type', label: 'Tipologia', t: 'choice', opts: S_TYPES },
        { k: 'subject', label: 'Materia (facoltativa)', t: 'select', opts: subjects },
        { k: 'linkedTo', label: 'Per la prova', t: 'select', show: is('type', 'studio'), opts: (d) => d.scuola.filter((x) => x.kind === 'attivita' && PROVA.includes(x.type)).map((x) => [x.id, x.title] as Opt), hint: 'Collega la sessione a una verifica o interrogazione.' },
        { k: 'status', label: 'Stato', t: 'status' },
      ] },
      { title: 'Quando', fields: [
        { k: 'date', label: "Data dell'attività", t: 'date', half: true },
        { k: 'time', label: 'Ora', t: 'time', half: true },
        { k: 'end', label: 'Ora di fine', t: 'time', half: true, show: is('type', 'lezione', 'studio') },
        { k: 'duration', label: 'Durata', t: 'text', half: true, ph: 'Es. 1 h', show: is('type', 'studio') },
        { k: 'due', label: 'Scadenza (se diversa)', t: 'date', half: true },
        repeat,
      ] },
      { title: 'Argomenti da preparare', show: is('type', 'verifica', 'interrogazione', 'studio'), fields: [{ k: 'topics', label: 'Argomenti', t: 'textarea' }] },
      { title: 'Voto', show: is('type', 'verifica', 'interrogazione'), adv: true, fields: [
        { k: 'grade.value', label: 'Voto ottenuto', t: 'text', half: true, ph: 'Es. 7½', hint: 'Da compilare dopo la prova.' },
        { k: 'grade.date', label: 'Data della prova', t: 'date', half: true },
        { k: 'grade.notes', label: 'Note sul voto', t: 'textarea', ph: 'Argomenti da ripassare, commenti…' },
      ] },
      { title: 'Altri dettagli', adv: true, fields: [
        { k: 'topics', label: 'Argomenti', t: 'textarea', show: (r) => !['verifica', 'interrogazione', 'studio'].includes(r.type) },
        { k: 'estimate', label: 'Tempo di preparazione stimato', t: 'text', half: true, ph: 'Es. 3 h' },
        { k: 'priority', label: 'Priorità', t: 'choice', opts: PRIO3 },
        { k: 'notes', label: 'Note', t: 'textarea' },
      ] },
    ],
  },
  'scuola/materia': {
    section: 'scuola', kind: 'materia', noun: 'materia', newLabel: 'Nuova materia', editLabel: 'Modifica materia', titleKey: 'name', required: [['name', 'Inserisci il nome della materia.']],
    blank: { name: '' }, groups: [{ fields: [{ k: 'name', label: 'Nome', t: 'text', ph: 'Es. Storia' }] }],
  },
  'scuola/lezione': {
    section: 'scuola', kind: 'lezione', noun: 'lezione', newLabel: "Nuova lezione nell'orario", editLabel: 'Modifica lezione', titleKey: 'title', required: [],
    blank: { day: '1', start: '08:00', end: '09:00', subject: null, room: '' },
    groups: [{ fields: [
      { k: 'day', label: 'Giorno', t: 'choice', opts: DAYS },
      { k: 'start', label: 'Inizio', t: 'time', half: true },
      { k: 'end', label: 'Fine', t: 'time', half: true },
      { k: 'subject', label: 'Materia', t: 'select', opts: subjects },
      { k: 'room', label: 'Aula o nota (facoltativa)', t: 'text' },
    ] }],
  },
  'lavoro/task': {
    section: 'lavoro', kind: 'task', noun: 'attività', newLabel: 'Nuova attività', editLabel: 'Modifica attività', titleKey: 'title', required: [['title', 'Il titolo è obbligatorio.']],
    blank: { desc: '', type: 'task', project: null, priority: 'media', start: '', time: '', end: '', due: '', estimate: '', notes: '', repo: '', link: '', area: '', env: '', techNotes: '', steps: '', expected: '', actual: '', blocked: false, bReason: '', bWho: '', bLast: '', bFollow: '', bNext: '', rSender: '', rReceived: '', rAction: '', rFollow: '', repeat: '' },
    groups: [
      { fields: [
        { k: 'title', label: 'Titolo', t: 'text', ph: 'Es. Filtro avanzato nella tabella ordini' },
        { k: 'type', label: 'Tipologia', t: 'choice', opts: L_TYPES },
        { k: 'project', label: 'Progetto (facoltativo)', t: 'select', opts: lprojects },
        { k: 'status', label: 'Stato', t: 'status' },
        { k: 'priority', label: 'Priorità', t: 'choice', opts: PRIO4 },
        { k: 'desc', label: 'Descrizione', t: 'textarea' },
      ] },
      { title: 'Date', fields: [
        { k: 'start', label: 'Inizio previsto', t: 'date', half: true },
        { k: 'time', label: 'Ora', t: 'time', half: true },
        { k: 'end', label: 'Ora di fine', t: 'time', half: true, show: is('type', 'riunione') },
        { k: 'due', label: 'Scadenza', t: 'date', half: true },
        repeat,
      ] },
      { title: 'Richiesta ricevuta', show: is('type', 'richiesta'), fields: [
        { k: 'rSender', label: 'Mittente', t: 'text', half: true },
        { k: 'rReceived', label: 'Ricevuta il', t: 'date', half: true },
        { k: 'rAction', label: 'Risposta o azione richiesta', t: 'textarea' },
        { k: 'rFollow', label: 'Follow-up', t: 'date', half: true },
      ] },
      { title: 'Bug', show: is('type', 'bug'), fields: [
        { k: 'steps', label: 'Passaggi per riprodurlo', t: 'textarea' },
        { k: 'expected', label: 'Comportamento atteso', t: 'textarea' },
        { k: 'actual', label: 'Comportamento effettivo', t: 'textarea' },
      ] },
      { title: 'Dettagli tecnici', adv: true, show: (r) => SW.includes(r.type), fields: [
        { k: 'repo', label: 'Repository o progetto', t: 'text' },
        { k: 'link', label: 'Issue, pull request o ticket', t: 'text' },
        { k: 'area', label: 'Area tecnica', t: 'choice', opts: AREAS },
        { k: 'env', label: 'Ambiente o componente', t: 'text' },
        { k: 'techNotes', label: 'Note tecniche', t: 'textarea' },
      ] },
      { title: 'Blocco', fields: [
        { k: 'blocked', label: 'Attività bloccata', t: 'bool' },
        { k: 'bReason', label: 'Motivo del blocco', t: 'text', show: is('blocked', true) },
        { k: 'bWho', label: 'In attesa di', t: 'text', show: is('blocked', true) },
        { k: 'bLast', label: 'Ultimo contatto', t: 'date', half: true, show: is('blocked', true) },
        { k: 'bFollow', label: 'Follow-up previsto', t: 'date', half: true, show: is('blocked', true) },
        { k: 'bNext', label: 'Prossimo passo', t: 'textarea', show: is('blocked', true) },
      ] },
      { title: 'Altri dettagli', adv: true, fields: [
        { k: 'estimate', label: 'Tempo stimato', t: 'text', half: true, ph: 'Es. 4 h' },
        { k: 'notes', label: 'Note', t: 'textarea' },
      ] },
    ],
  },
  'lavoro/progetto': {
    section: 'lavoro', kind: 'progetto', noun: 'progetto', newLabel: 'Nuovo progetto', editLabel: 'Modifica progetto', titleKey: 'name', required: [['name', 'Il nome del progetto è obbligatorio.']],
    blank: { name: '', desc: '', status: 'pianificazione', priority: 'media', repo: '', docs: '', notes: '' },
    groups: [{ fields: [
      { k: 'name', label: 'Nome', t: 'text' },
      { k: 'desc', label: 'Descrizione breve', t: 'textarea' },
      { k: 'status', label: 'Stato', t: 'choice', opts: PSTAT },
      { k: 'priority', label: 'Priorità', t: 'choice', opts: PRIO4 },
      { k: 'repo', label: 'Repository', t: 'text' },
      { k: 'docs', label: 'Documentazione', t: 'text' },
      { k: 'notes', label: 'Note', t: 'textarea' },
    ] }],
  },
  'lavoro/nota': {
    section: 'lavoro', kind: 'nota', noun: 'nota', newLabel: 'Nuova nota', editLabel: 'Modifica nota', titleKey: 'title', required: [['title', 'Il titolo è obbligatorio.']],
    blank: { title: '', date: '', noteType: 'appunto', project: null, participants: '', content: '', topics: '', decisions: '', actionsText: '', actions: [], links: '' },
    groups: [
      { fields: [
        { k: 'title', label: 'Titolo', t: 'text' },
        { k: 'noteType', label: 'Tipo di nota', t: 'choice', opts: NK },
        { k: 'date', label: 'Data', t: 'date', half: true },
        { k: 'project', label: 'Progetto', t: 'select', opts: lprojects },
        { k: 'content', label: 'Contenuto', t: 'textarea' },
      ] },
      { title: 'Riunione', show: is('noteType', 'verbale'), fields: [
        { k: 'participants', label: 'Partecipanti', t: 'text' },
        { k: 'topics', label: 'Argomenti trattati', t: 'textarea' },
        { k: 'decisions', label: 'Decisioni prese', t: 'textarea' },
      ] },
      { title: 'Attività da svolgere', fields: [
        { k: 'actionsText', label: 'Una per riga', t: 'textarea', hint: 'Dal dettaglio della nota potrai trasformarle in attività.' },
        { k: 'links', label: 'Link e riferimenti', t: 'text' },
      ] },
    ],
  },
  'lettura/libro': {
    section: 'lettura', kind: 'libro', noun: 'libro', newLabel: 'Nuovo libro', editLabel: 'Modifica libro', titleKey: 'title',
    required: [['title', 'Il titolo è obbligatorio.'], ['author', "L'autore è obbligatorio."], ['publisher', "L'editore è obbligatorio."], ['format', 'Scegli il formato.']],
    blank: { title: '', author: '', publisher: '', cover: '', status: 'daleggere', genre: '', format: '', ebookWhere: '', pages: '', added: '', received: '', start: '', end: '', rating: 0, notes: '', tbr: false, collabType: 'nessuna', collabName: '', collabNotes: '', priority: 'media', reviewStatus: 'darecensire', reviewUrl: '', reader: 'me', delegate: '', deadlineMode: 'nessuna', deadline: '', deadlineMonth: '', volDone: false, volCancelled: false },
    groups: [
      { fields: [
        { k: 'cover', label: 'Copertina (facoltativa)', t: 'image' },
        { k: 'title', label: 'Titolo del libro', t: 'text' },
        { k: 'author', label: 'Autore', t: 'text', half: true },
        { k: 'publisher', label: 'Editore', t: 'text', half: true },
        { k: 'format', label: 'Formato di ricezione', t: 'choice', opts: FORMATS },
        { k: 'ebookWhere', label: 'Posizione ebook o note sul digitale', t: 'text', ph: 'Es. Kindle, Kobo, NetGalley, Google Drive', show: is('format', 'digitale') },
        { k: 'genre', label: 'Genere o categoria', t: 'text', half: true, ph: 'Es. Narrativa, Thriller' },
        { k: 'pages', label: 'Numero di pagine', t: 'number', half: true, ph: 'Es. 320' },
        { k: 'added', label: 'Data di inserimento', t: 'date', half: true },
        { k: 'received', label: 'Data di ricezione', t: 'date', half: true, hint: 'Quando il volume è arrivato: pacco consegnato o file scaricato.' },
        { k: 'status', label: 'Stato di lettura', t: 'choice', opts: BST, hint: '«Da non leggere» disattiva la scadenza e il promemoria di lettura.' },
        { k: 'tbr', label: 'Nella TBR', t: 'bool' },
        { k: 'volDone', label: 'Volume completato (lo toglie da panoramica, calendari e promemoria)', t: 'bool' },
        { k: 'volCancelled', label: 'Volume annullato (lo toglie da panoramica, calendari e promemoria)', t: 'bool' },
      ] },
      { title: 'Collaborazione', fields: [
        { k: 'collabType', label: 'Collaborazione', t: 'choice', opts: COLLABS },
        { k: 'collabName', label: 'Referente', labelFn: (r) => COLLAB_WHO[r.collabType] || 'Referente', t: 'text', show: (r) => r.collabType && r.collabType !== 'nessuna', hint: 'Chi tiene i contatti fra te, il gruppo e la casa editrice.' },
        { k: 'collabNotes', label: 'Note sulla collaborazione', t: 'textarea', show: (r) => r.collabType && r.collabType !== 'nessuna' },
        { k: 'priority', label: 'Priorità', t: 'choice', opts: PRIO3 },
        { k: 'reviewStatus', label: 'Stato della recensione sul blog', t: 'choice', opts: REVST },
        { k: 'reviewUrl', label: 'Link della recensione', t: 'text', ph: 'https://ilmioblog.it/…' },
        { k: 'reader', label: 'Chi legge il libro?', t: 'choice', opts: READER },
        { k: 'delegate', label: 'Delegato', t: 'text', show: is('reader', 'delegato') },
      ] },
      { title: 'Pianificazione della scadenza di lettura', show: (r) => r.status !== 'nonleggere', fields: [
        { k: 'deadlineMode', label: 'Tipo di scadenza', t: 'choice', opts: DLMODE },
        { k: 'deadline', label: 'Data precisa entro cui leggerlo', t: 'date', show: is('deadlineMode', 'data'), hint: 'Ricevi un promemoria 3 giorni prima e il giorno stesso.' },
        { k: 'deadlineMonth', label: 'Entro il mese', t: 'month', show: is('deadlineMode', 'mese'), hint: 'Compare nel riquadro «Da leggere entro il mese» del calendario.' },
      ] },
      { title: 'Altri dettagli', adv: true, fields: [
        { k: 'start', label: 'Inizio lettura', t: 'date', half: true },
        { k: 'end', label: 'Fine lettura', t: 'date', half: true },
        { k: 'rating', label: 'Valutazione', t: 'rating' },
        { k: 'notes', label: 'Note personali', t: 'textarea' },
      ] },
    ],
  },
  'lettura/attivita': {
    section: 'lettura', kind: 'attivita', noun: 'attività', newLabel: 'Nuova attività', editLabel: 'Modifica attività', titleKey: 'title', required: [['title', 'Il titolo è obbligatorio.']],
    blank: { type: 'recensione', book: null, date: '', time: '', notes: '', links: '', isCollab: false, collabName: '', materials: '', opNotes: '', agreed: '', reminder: '', channels: [], urgent: false, repeat: '' },
    groups: [
      { fields: [
        { k: 'title', label: 'Titolo', t: 'text', ph: 'Es. Recensione «…»' },
        { k: 'type', label: 'Tipologia', t: 'choice', opts: () => lTypes() },
        { k: 'book', label: 'Libro collegato (facoltativo)', t: 'select', opts: books },
        { k: 'status', label: 'Stato', t: 'status' },
        { k: 'channels', label: 'Canali', t: 'multi', opts: () => lChannels() },
      ] },
      { title: 'Quando', fields: [...when, { k: 'reminder', label: 'Promemoria', t: 'choice', opts: REMIND }, repeat] },
      { title: 'Collaborazione', fields: [
        { k: 'isCollab', label: 'Fa parte di una collaborazione', t: 'bool' },
        { k: 'collabName', label: 'Collaborazione o interlocutore', t: 'text', show: is('isCollab', true) },
        { k: 'materials', label: 'Materiali ricevuti o da ricevere', t: 'textarea', show: is('isCollab', true) },
        { k: 'agreed', label: 'Data concordata', t: 'date', half: true, show: is('isCollab', true) },
        { k: 'opNotes', label: 'Note operative', t: 'textarea', show: is('isCollab', true) },
      ] },
      { title: 'Altri dettagli', adv: true, fields: [
        { k: 'urgent', label: 'Urgente', t: 'bool' },
        { k: 'notes', label: 'Note', t: 'textarea' },
        { k: 'links', label: 'Link o riferimenti', t: 'text' },
      ] },
    ],
  },
  'scrittura/attivita': {
    section: 'scrittura', kind: 'attivita', noun: 'attività', newLabel: 'Nuova attività', editLabel: 'Modifica attività', titleKey: 'title', required: [['title', 'Il titolo è obbligatorio.']],
    blank: { type: 'storia', project: null, date: '', time: '', notes: '', urgent: false, repeat: '' },
    groups: [{ fields: [
      { k: 'title', label: 'Titolo', t: 'text' },
      { k: 'type', label: 'Tipo di attività', t: 'choice', opts: W_TYPES },
      { k: 'status', label: 'Stato', t: 'status' },
      { k: 'project', label: 'Progetto o storia (facoltativo)', t: 'select', opts: wprojects },
      { k: 'date', label: 'Scadenza o pubblicazione', t: 'date', half: true },
      { k: 'time', label: 'Ora', t: 'time', half: true },
      repeat,
      { k: 'urgent', label: 'Urgente', t: 'bool' },
      { k: 'notes', label: 'Note brevi', t: 'textarea' },
    ] }],
  },
  'scrittura/progetto': {
    section: 'scrittura', kind: 'progetto', noun: 'progetto', newLabel: 'Nuovo progetto', editLabel: 'Modifica progetto', titleKey: 'title', required: [['title', 'Il titolo è obbligatorio.']],
    blank: { title: '', projectType: '', status: 'idea', desc: '', cover: '' },
    groups: [{ fields: [
      { k: 'cover', label: 'Copertina (facoltativa)', t: 'image', w: 360, icon: 'ph-feather' },
      { k: 'title', label: 'Titolo', t: 'text' },
      { k: 'projectType', label: 'Tipo di progetto', t: 'choice', opts: PKINDS },
      { k: 'status', label: 'Stato', t: 'choice', opts: W_PSTAT },
      { k: 'desc', label: 'Descrizione o nota', t: 'textarea' },
    ] }],
  },
  'scrittura/ispirazione': {
    section: 'scrittura', kind: 'ispirazione', noun: 'ispirazione', newLabel: 'Nuova ispirazione', editLabel: 'Modifica ispirazione', titleKey: 'title', required: [['title', 'Dai un titolo all’ispirazione.']],
    blank: { title: '', image: '', link: '', linkLabel: '', notes: '', project: null, tag: '' },
    groups: [{ fields: [
      { k: 'image', label: 'Foto (facoltativa)', t: 'image', w: 1200, icon: 'ph-image', hint: 'Viene compressa (circa 1200 px) e salvata nel database, senza costi.' },
      { k: 'title', label: 'Titolo', t: 'text', ph: 'Es. Castello in rovina, moodboard del capitolo 3' },
      { k: 'link', label: 'Link a una fonte esterna (facoltativo)', t: 'text', ph: 'https://… (Google Drive, Pinterest, articolo)', hint: 'Per PDF e documenti pesanti: caricali su Google Drive e incolla qui il link.' },
      { k: 'linkLabel', label: 'Nome del link', t: 'text', ph: 'Es. Documento di ricerca' },
      { k: 'tag', label: 'Etichetta', t: 'text', half: true, ph: 'Es. luoghi, personaggi' },
      { k: 'project', label: 'Progetto (facoltativo)', t: 'select', opts: wprojects, half: true },
      { k: 'notes', label: 'Nota', t: 'textarea' },
    ] }],
  },
};
export const kindDef = (s: Section, kind: string) => KINDS[s + '/' + kind];
export const collabWho = (t: string) => COLLAB_WHO[t] || 'Referente';

/** Etichetta del collegamento principale di un'attività (materia, progetto, libro). */
export function refOf(c: Section, x: Rec, docs: Docs): string {
  const f = (s: Section, id: any, key = 'title') => (id ? docs[s].find((d) => d.id === id)?.[key] || '' : '');
  if (c === 'scuola') return f('scuola', x.subject, 'name');
  if (c === 'lavoro') return f('lavoro', x.project, 'name');
  if (c === 'lettura') return f('lettura', x.book);
  return f('scrittura', x.project);
}

/** Filtri della bacheca per sezione. */
export type FilterDef = { id: string; label: string; opts: (docs: Docs) => Opt[]; get: (x: Rec) => any };
export const FILTERS: Record<Section, FilterDef[]> = {
  scuola: [
    { id: 'subject', label: 'Materia', opts: (d) => [...subjects(d), ['none', 'Senza materia']], get: (x) => x.subject || 'none' },
    { id: 'type', label: 'Tipologia', opts: () => S_TYPES, get: (x) => x.type },
  ],
  lavoro: [
    { id: 'project', label: 'Progetto', opts: (d) => [...ref('lavoro', 'progetto', 'name')(d), ['none', 'Senza progetto']], get: (x) => x.project || 'none' },
    { id: 'type', label: 'Tipologia', opts: () => L_TYPES, get: (x) => x.type },
    { id: 'priority', label: 'Priorità', opts: () => PRIO4, get: (x) => x.priority },
    { id: 'blocked', label: 'Blocco', opts: () => [['si', 'Bloccate'], ['no', 'Non bloccate']], get: (x) => (x.blocked ? 'si' : 'no') },
  ],
  lettura: [
    { id: 'type', label: 'Tipologia', opts: () => lTypes(), get: (x) => x.type },
    { id: 'book', label: 'Libro', opts: (d) => [...books(d), ['none', 'Senza libro']], get: (x) => x.book || 'none' },
  ],
  scrittura: [
    { id: 'type', label: 'Tipologia', opts: () => W_TYPES, get: (x) => x.type },
    { id: 'project', label: 'Progetto', opts: (d) => [...wprojects(d), ['none', 'Senza progetto']], get: (x) => x.project || 'none' },
  ],
};
