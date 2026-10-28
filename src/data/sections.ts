// Le quattro aree di Nocturna, con colonne, colori e le regole dei prototipi.
import { lTypeColor } from './schema';
export type Section = 'scuola' | 'lavoro' | 'lettura' | 'scrittura';
export const ORDER: Section[] = ['scuola', 'lavoro', 'lettura', 'scrittura'];

/** Un documento Firestore di una sezione. I campi specifici dipendono da `kind`. */
export type Rec = {
  id: string;
  kind: string;
  title?: any;
  name?: any;
  status?: string;
  date?: string;
  time?: string;
  repeat?: '' | 'giorno' | 'settimana' | 'mese';
  deletedAt?: number | null;
  [k: string]: any;
};

export const CATS: Record<Section, { short: string; label: string; color: string; icon: string; kicker: string; desc: string; sub: string }> = {
  scuola: { short: 'Scuola', label: 'Scuola', color: '#c9a45c', icon: 'ph-graduation-cap', kicker: 'Area', sub: '', desc: 'Verifiche, interrogazioni, compiti, sessioni di studio, consegne e lezioni.' },
  lavoro: { short: 'Lavoro', label: 'Lavoro', color: '#8e9fbd', icon: 'ph-briefcase', kicker: 'Area', sub: '', desc: 'Attività quotidiane, riunioni, documenti da inviare, verbali e domande da porre durante le riunioni.' },
  lettura: { short: 'Lettura', label: "The Scribe's Diary", color: '#de7f99', icon: 'ph-book-open-text', kicker: 'Lettura', sub: 'Lettura', desc: 'Libri e collaborazioni, TBR, recensioni, segnalazioni, cover reveal, release e contenuti social. Ogni libro attraversa solo le colonne che gli servono.' },
  scrittura: { short: 'Scrittura', label: 'Mabel Altheanne Nyctalis', color: '#a98ad6', icon: 'ph-feather', kicker: 'Scrittura', sub: 'Scrittura', desc: 'Storie, raccolte, oneshot, capitoli Wattpad, revisioni, pubblicazioni e contenuti del profilo autrice.' },
};
export const catVar = (c: Section) => `var(--cat-${c})`;

/** Il tipo di documento che rappresenta un'"attività" in ciascuna sezione. */
export const ACT_KIND: Record<Section, string> = { scuola: 'attivita', lavoro: 'task', lettura: 'attivita', scrittura: 'attivita' };

export type Tone = 'idle' | 'todo' | 'active' | 'wait' | 'done' | 'pause';
export type Column = { id: string; label: string; hidden?: boolean; done?: boolean; tone?: Tone };

/** Colonne iniziali, come nei prototipi. Si possono personalizzare (Impostazioni → colonne). */
export const DEFAULT_COLS: Record<Section, Column[]> = {
  scuola: [
    { id: 'pianificare', label: 'Da pianificare', tone: 'idle' },
    { id: 'fare', label: 'Da fare', tone: 'todo' },
    { id: 'corso', label: 'In corso', tone: 'active' },
    { id: 'attesa', label: 'In attesa', tone: 'wait' },
    { id: 'completato', label: 'Completato', tone: 'done', done: true },
  ],
  lavoro: [
    { id: 'pianificare', label: 'Da pianificare', tone: 'idle' },
    { id: 'fare', label: 'Da fare', tone: 'todo' },
    { id: 'corso', label: 'In corso', tone: 'active' },
    { id: 'attesa', label: 'In attesa', tone: 'wait' },
    { id: 'completato', label: 'Completato', tone: 'done', done: true },
  ],
  lettura: [
    { id: 'organizzare', label: 'Da organizzare', tone: 'idle' },
    { id: 'preparare', label: 'Da preparare', tone: 'todo' },
    { id: 'attesa', label: 'In attesa', tone: 'wait' },
    { id: 'programmato', label: 'Programmato', tone: 'active' },
    { id: 'pubblicato', label: 'Pubblicato', tone: 'done', done: true },
    { id: 'completato', label: 'Completato', tone: 'done', done: true },
  ],
  scrittura: [
    { id: 'idea', label: 'Da ideare', tone: 'idle' },
    { id: 'scrittura', label: 'In scrittura', tone: 'active' },
    { id: 'revisione', label: 'In revisione', tone: 'wait' },
    { id: 'pronto', label: 'Pronto per pubblicazione', tone: 'todo' },
    { id: 'pubblicato', label: 'Pubblicato', tone: 'done', done: true },
    { id: 'pausa', label: 'In pausa', tone: 'pause' },
  ],
};
/** Stato assegnato quando un'attività viene segnata come completata. */
export const FINAL: Record<Section, string> = { scuola: 'completato', lavoro: 'completato', lettura: 'completato', scrittura: 'pubblicato' };

const TONE: Record<string, string> = { idle: '#857a7d', todo: '#b3a8ab', wait: '#c2925f', done: '#86a58f', pause: '#6f6669' };
export const toneColor = (c: Section, tone?: Tone) => (tone === 'active' ? catVar(c) : TONE[tone || 'todo'] || TONE.todo);

export type ColsConfig = Partial<Record<Section, Column[]>>;
export const colsOf = (cfg: ColsConfig | undefined, c: Section): Column[] => (cfg && cfg[c] && cfg[c]!.length ? cfg[c]! : DEFAULT_COLS[c]);
export const visibleCols = (cfg: ColsConfig | undefined, c: Section) => colsOf(cfg, c).filter((x) => !x.hidden);
export const isDone = (cfg: ColsConfig | undefined, c: Section, status?: string) => !!colsOf(cfg, c).find((x) => x.id === status)?.done;
export const finalStatus = (cfg: ColsConfig | undefined, c: Section) => {
  const cols = colsOf(cfg, c);
  const f = cols.find((x) => x.id === FINAL[c] && !x.hidden) || cols.find((x) => x.done && !x.hidden) || cols.find((x) => x.done);
  return f ? f.id : FINAL[c];
};
/** Lo stato "da fare" usato quando si riapre un'attività completata. */
export const reopenStatus = (cfg: ColsConfig | undefined, c: Section) => {
  const v = visibleCols(cfg, c).filter((x) => !x.done);
  return (v[1] || v[0] || colsOf(cfg, c)[0]).id;
};
export const statusLabel = (cfg: ColsConfig | undefined, c: Section, status?: string) => colsOf(cfg, c).find((x) => x.id === status)?.label || '';

/** Campi iniziali di un'attività creata dalla Home, come nei prototipi delle sezioni. */
export const NEW_ACT: Record<Section, Record<string, any>> = {
  scuola: { type: 'altro', subject: null, date: '', time: '', end: '', due: '', topics: '', notes: '', estimate: '', priority: 'media', grade: null, linkedTo: null, duration: '' },
  lavoro: { desc: '', type: 'task', project: null, priority: 'media', start: '', time: '', end: '', due: '', estimate: '', notes: '', repo: '', link: '', area: '', env: '', techNotes: '', steps: '', expected: '', actual: '', blocked: false, bReason: '', bWho: '', bLast: '', bFollow: '', bNext: '', rSender: '', rReceived: '', rAction: '', rFollow: '' },
  lettura: { type: 'altro', book: null, date: '', time: '', notes: '', links: '', isCollab: false, collabName: '', materials: '', opNotes: '', agreed: '', reminder: '', channels: [], urgent: false },
  scrittura: { type: 'altro', project: null, date: '', time: '', notes: '', urgent: false },
};

// ── Ponte tra le sezioni e la Home ─────────────────────────────────────────

export type HomeTask = {
  id: string; // "sezione:idDocumento"
  src: string;
  cat: Section;
  title: string;
  date: string;
  time: string;
  status: string;
  urgent: boolean;
  repeat: string;
  done: boolean;
  /** Testo al posto dello stato (es. per le scadenze di lettura dei libri). */
  label?: string;
  /** Colore del tipo di attività (Lettura), usato dai pallini del calendario della sezione. */
  dot?: string;
  /** Tempo stimato scritto nell'attività (testo libero, es. «1 h 30»), se presente. */
  estimate?: string;
};

/** La data che un'attività mostra nel calendario (regole dei prototipi). */
export const dateOf = (c: Section, x: Rec): string => {
  if (c === 'scuola') return x.date || x.due || '';
  if (c === 'lavoro') return (x.type === 'riunione' ? x.start || x.due : x.due || x.start) || '';
  return x.date || '';
};
export const urgentOf = (c: Section, x: Rec) => (c === 'scuola' ? x.priority === 'alta' : c === 'lavoro' ? x.priority === 'alta' || x.priority === 'urgente' : !!x.urgent);

export const toHome = (c: Section, x: Rec, cfg?: ColsConfig): HomeTask => ({
  id: c + ':' + x.id,
  src: x.id,
  cat: c,
  title: x.title || '',
  date: dateOf(c, x),
  time: x.time || '',
  status: x.status || '',
  urgent: urgentOf(c, x),
  repeat: x.repeat || '',
  done: isDone(cfg, c, x.status),
  dot: c === 'lettura' ? lTypeColor(x.type) : undefined,
  estimate: typeof x.estimate === 'string' && x.estimate.trim() ? x.estimate : undefined,
});

/** Traduce una modifica fatta in Home nei campi del documento d'origine. */
export const dateFieldPatch = (c: Section, x: Partial<Rec>, date: string): Record<string, any> => {
  if (c === 'scuola') return x.date || !x.due ? { date } : { due: date };
  if (c === 'lavoro') return x.type === 'riunione' || (!x.due && x.start) ? { start: date } : { due: date };
  return { date };
};
export const urgentPatch = (c: Section, x: Partial<Rec>, urgent: boolean): Record<string, any> => {
  if (c === 'scuola' || c === 'lavoro') {
    const now = urgentOf(c, x as Rec);
    if (urgent === now) return {};
    return { priority: urgent ? 'alta' : 'media' };
  }
  return { urgent };
};

/** Nome leggibile di qualunque documento (per cestino e backup). */
export const recTitle = (x: Rec) => x.title || x.name || '(senza titolo)';
export const KIND_LABEL: Record<string, string> = {
  attivita: 'Attività', task: 'Attività', materia: 'Materia', lezione: "Lezione dell'orario", progetto: 'Progetto', nota: 'Nota', libro: 'Libro', ispirazione: 'Ispirazione',
};
