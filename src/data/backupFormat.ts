// Formato e validazione dei backup di Nocturna. Modulo senza dipendenze: è usato anche dai test in tests/.

export const BACKUP_VERSION = 2;
export const BACKUP_SECTIONS = ['scuola', 'lavoro', 'lettura', 'scrittura'] as const;
export const BACKUP_STORES = [...BACKUP_SECTIONS, 'impostazioni'] as const;
/** Documenti di servizio che non vanno mai esportati né ripristinati (es. il segno della migrazione). */
export const SERVICE_DOCS: Record<string, string[]> = { impostazioni: ['spazio'] };
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export type BackupErrorReason = 'not-nocturna' | 'too-new' | 'too-big' | 'bad';
export class BackupError extends Error {
  reason: BackupErrorReason;
  constructor(reason: BackupErrorReason) { super(reason); this.reason = reason; }
}

/** ID di documento Firestore utilizzabile: niente '/', niente '.'/'..', niente nomi riservati __x__. */
export function validDocId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 700 && !id.includes('/')
    && id !== '.' && id !== '..' && !/^__.*__$/.test(id);
}

export const isServiceDoc = (store: string, id: string) => (SERVICE_DOCS[store] || []).includes(id);

/** Controlla il contenuto (già letto con JSON.parse) e restituisce solo i dati riconosciuti. */
export function parseBackupJson(j: any): { data: Record<string, any[]>; count: number; exportedAt: string } {
  if (!j || typeof j !== 'object' || j.app !== 'Nocturna' || !j.data || typeof j.data !== 'object' || Array.isArray(j.data))
    throw new BackupError('not-nocturna');
  if (j.version !== undefined && (typeof j.version !== 'number' || j.version > BACKUP_VERSION)) throw new BackupError('too-new');
  const data: Record<string, any[]> = {};
  let count = 0;
  for (const s of BACKUP_STORES) {
    const list = j.data[s];
    if (list === undefined) continue;
    if (!Array.isArray(list)) throw new BackupError('bad');
    const seen = new Set<string>();
    data[s] = [];
    for (const x of list) {
      if (!x || typeof x !== 'object' || Array.isArray(x) || !validDocId(x.id) || seen.has(x.id)) throw new BackupError('bad');
      seen.add(x.id);
      if (isServiceDoc(s, x.id)) continue;
      data[s].push(x);
      count++;
    }
  }
  return { data, count, exportedAt: typeof j.exportedAt === 'string' ? j.exportedAt : '' };
}

export type RestorePlan = {
  writes: { store: string; id: string; data: Record<string, any> }[];
  deletes: { store: string; id: string }[];
};

/**
 * Prepara il ripristino: prima si scrivono tutti i documenti del backup (stesso ID = sovrascrittura, quindi
 * nessun duplicato), poi si eliminano solo quelli attuali che il backup non contiene.
 * I documenti di servizio (es. impostazioni/spazio) non vengono mai scritti né eliminati.
 */
export function planRestore(backup: Record<string, any[]>, existing: Record<string, string[]>, clean: (store: string, x: Record<string, any>) => Record<string, any> = (_s, x) => x): RestorePlan {
  const plan: RestorePlan = { writes: [], deletes: [] };
  for (const s of BACKUP_STORES) {
    const keep = new Set<string>();
    for (const x of backup[s] || []) {
      if (!validDocId(x?.id) || isServiceDoc(s, x.id) || keep.has(x.id)) continue;
      keep.add(x.id);
      const { id, ...rest } = x;
      plan.writes.push({ store: s, id, data: clean(s, rest) });
    }
    for (const id of existing[s] || []) if (!keep.has(id) && !isServiceDoc(s, id)) plan.deletes.push({ store: s, id });
  }
  return plan;
}

/**
 * Divide le operazioni in lotti da al massimo `maxCount` elementi e circa `maxBytes` (stima JSON).
 * Firestore rifiuta le richieste oltre 10 MiB: con molte copertine un lotto da 400 documenti può superarle.
 */
export function chunkBySize<T>(items: T[], sizeOf: (x: T) => number, maxBytes = 8 * 1024 * 1024, maxCount = 400): T[][] {
  const out: T[][] = [];
  let cur: T[] = [], bytes = 0;
  for (const x of items) {
    const n = sizeOf(x);
    if (cur.length && (cur.length >= maxCount || bytes + n > maxBytes)) { out.push(cur); cur = []; bytes = 0; }
    cur.push(x); bytes += n;
  }
  if (cur.length) out.push(cur);
  return out;
}
