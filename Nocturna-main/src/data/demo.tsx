// SOLO PER LO SVILUPPO: archivio in memoria con dati d'esempio, per provare l'interfaccia senza Firebase.
// Si apre con `npm run dev` e l'indirizzo /?demo. Non viene incluso nell'app pubblicata.
import React, { useMemo, useRef, useState } from 'react';
import { K, add } from '../lib/dates';
import { ACT_KIND, NEW_ACT, ORDER, Rec, Section } from './sections';
import { Ctx, Prefs, Store, TrashEntry } from './store';
import { LetturaCfg, letturaCfg, setLetturaCfg } from './schema';

const d = (n: number) => K(add(new Date(), n));
const A = (c: Section, o: Record<string, any>): Rec => ({ ...NEW_ACT[c], kind: ACT_KIND[c], deletedAt: null, ...o } as Rec);
const seed = (): Record<Section, Rec[]> => ({
  scuola: [
    { id: 'm1', kind: 'materia', name: 'Storia' } as Rec, { id: 'm2', kind: 'materia', name: 'Matematica' } as Rec, { id: 'm3', kind: 'materia', name: 'Inglese' } as Rec,
    { id: 't1', kind: 'lezione', day: '1', start: '08:00', end: '09:00', subject: 'm1', room: 'Aula 2B' } as Rec, { id: 't2', kind: 'lezione', day: '3', start: '10:00', end: '11:00', subject: 'm2', room: 'Laboratorio' } as Rec,
    A('scuola', { id: 's1', title: 'Verifica di storia — Rivoluzione industriale', type: 'verifica', subject: 'm1', date: d(5), time: '09:00', status: 'fare', priority: 'alta', topics: 'Cause; macchina a vapore; urbanizzazione.' }),
    A('scuola', { id: 's6', title: 'Studio: cause della Rivoluzione industriale', type: 'studio', subject: 'm1', linkedTo: 's1', date: d(2), time: '16:00', duration: '1 h', status: 'fare' }),
    A('scuola', { id: 's2', title: 'Esercizi di matematica', type: 'compito', due: d(0), status: 'corso' }),
    A('scuola', { id: 's3', title: 'Ripasso di inglese', type: 'studio', date: d(0), time: '15:00', status: 'fare' }),
    A('scuola', { id: 's4', title: 'Autorizzazione uscita al museo', due: d(-2), status: 'attesa' }),
    A('scuola', { id: 's5', title: 'Verifica di inglese — Past tenses', type: 'verifica', date: d(-9), status: 'completato' }),
  ],
  lavoro: [
    { id: 'p1', kind: 'progetto', name: 'Portale clienti Aurora', desc: 'Area riservata per i clienti.', status: 'attivo', priority: 'alta' } as Rec,
    { id: 'n1', kind: 'nota', title: 'Verbale — Sprint review', date: d(-3), noteType: 'verbale', project: 'p1', content: 'Demo dei filtri.', actions: [{ text: 'Preparare le note di rilascio', taskId: null }], actionsText: 'Preparare le note di rilascio' } as Rec,
    A('lavoro', { id: 'l1', title: 'Riunione di reparto', type: 'riunione', start: d(2), time: '09:00', status: 'fare', repeat: 'settimana' }),
    A('lavoro', { id: 'l2', title: 'Il logout non invalida la sessione su Safari', type: 'bug', project: 'p1', blocked: true, bReason: 'In attesa dei log', due: d(1), status: 'fare', priority: 'urgente' }),
    A('lavoro', { id: 'l3', title: 'Code review PR #145', type: 'review', due: d(0), time: '11:00', status: 'corso' }),
    A('lavoro', { id: 'l4', title: 'Report mensile', due: d(6), status: 'pianificare' }),
    A('lavoro', { id: 'l5', title: 'Call con il team', due: d(-1), time: '11:00', status: 'completato' }),
  ],
  lettura: [
    { id: 'b1', kind: 'libro', title: 'Le ore di vetro', author: 'Ilaria Montesi', publisher: 'Corvoscuro (fittizia)', format: 'cartaceo', status: 'inlettura', collabType: 'blogtour', collabName: 'Edizioni Nebbialta', deadlineMode: 'data', deadline: d(10), tbr: false } as Rec,
    { id: 'b2', kind: 'libro', title: 'Canti del faro', author: 'Guido Serra', publisher: 'Lanterna', format: 'digitale', status: 'daleggere', tbr: true, reader: 'delegato', delegate: 'Giulia R.', deadlineMode: 'nessuna' } as Rec,
    { id: 'b3', kind: 'libro', title: 'Tramonto di cicatrici', author: 'Giorgia Saolini', publisher: 'Indipendente', format: 'digitale', status: 'daleggere', collabType: 'reviewparty', collabName: 'Il circolo delle recensioni', received: d(-6), added: d(-50), deadlineMode: 'data', deadline: d(16) } as Rec,
    { id: 'b4', kind: 'libro', title: 'Ciò che resta di te', author: 'Lexie Moretti', publisher: 'Edizioni Rovo', format: 'cartaceo', status: 'daleggere', deadlineMode: 'mese', deadlineMonth: d(0).slice(0, 7) } as Rec,
    A('lettura', { id: 'r6', book: 'b3', title: 'Recensione «Tramonto di cicatrici»', type: 'recensione', date: d(19), status: 'organizzare', channels: ['blog', 'instagram', 'goodreads'] }),
    A('lettura', { id: 'r7', book: 'b1', title: 'Unboxing «Le ore di vetro»', type: 'unboxing', date: d(-3), status: 'completato', channels: ['instagram'] }),
    A('lettura', { id: 'r1', book: 'b1', title: 'Recensione «Le ore di vetro»', type: 'recensione', date: d(0), time: '18:00', status: 'preparare', reminder: '1' }),
    A('lettura', { id: 'r2', title: 'Cover reveal «Inverno a Kessaly»', type: 'cover', date: d(3), time: '12:00', status: 'programmato' }),
    A('lettura', { id: 'r3', title: 'Release «Sale e cenere»', type: 'release', date: d(7), status: 'programmato' }),
    A('lettura', { id: 'r4', title: 'Post: le letture di settembre', type: 'social', date: d(-6), status: 'pubblicato' }),
    A('lettura', { id: 'r5', title: 'Segnalazione «Inverno a Kessaly»', type: 'segnalazione', status: 'attesa' }),
  ],
  scrittura: [
    { id: 'q1', kind: 'progetto', title: 'Le figlie della nebbia', projectType: 'Storia a capitoli', status: 'scrittura', desc: 'Romanzo gotico a capitoli.' } as Rec,
    A('scrittura', { id: 'w5', title: 'Scambio di ottobre', type: 'corte', status: 'idea', date: d(4) }),
    A('scrittura', { id: 'w1', project: 'q1', title: 'Capitolo 12 — «Le figlie della nebbia»', type: 'capitolo', date: d(1), time: '21:00', status: 'scrittura' }),
    A('scrittura', { id: 'w2', title: 'Revisione stilistica di «Cenere»', type: 'revisione', date: d(4), status: 'revisione' }),
    A('scrittura', { id: 'w3', title: 'Post sul profilo autrice', type: 'promozione', date: d(0), time: '20:30', status: 'pronto' }),
    A('scrittura', { id: 'w4', title: 'Idea: racconto sul faro', type: 'storia', status: 'idea' }),
  ],
});

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState(seed);
  const [prefs, setP] = useState<Prefs>({ theme: (new URLSearchParams(location.search).get('theme') as any) || 'scuro', summaryOnOpen: !location.search.includes('nosum'), lessonsOnHome: false, autoTrash: false });
  const [cols, setC] = useState({});
  const [lc, setLc] = useState<LetturaCfg | null>(null);
  setLetturaCfg(lc);
  const [toast, setToast] = useState('');
  const [toastUndo, setToastUndo] = useState<(() => void) | null>(null);
  const t = useRef<number>();
  const say = (m: string, undo?: () => void) => { clearTimeout(t.current); setToast(m); setToastUndo(() => undo || null); t.current = window.setTimeout(() => { setToast(''); setToastUndo(null); }, 4000); };
  const patch = (s: Section, id: string, p: Record<string, any>) => setRaw((r) => ({ ...r, [s]: r[s].map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const docs = useMemo(() => { const o: any = {}; ORDER.forEach((s) => (o[s] = raw[s].filter((x) => !x.deletedAt))); return o; }, [raw]);
  const trash = useMemo(() => { const o: TrashEntry[] = []; ORDER.forEach((s) => raw[s].forEach((rec) => rec.deletedAt && o.push({ section: s, rec }))); return o; }, [raw]);
  let n = 0;
  const value: Store = {
    uid: 'demo', ready: true, docs, trash, prefs, cols, sync: navigator.onLine ? 'sincronia' : 'offline',
    profile: { name: 'Demo', bio: '', avatar: '' },
    newId: () => 'n' + Date.now() + n++,
    create: (s, data) => { const id = data.id || 'n' + Date.now() + n++; setRaw((r) => ({ ...r, [s]: [...r[s], { ...data, id, deletedAt: null } as Rec] })); return id; },
    update: patch,
    trashIt: (s, id) => { patch(s, id, { deletedAt: Date.now() }); say('Spostato nel cestino.', () => patch(s, id, { deletedAt: null })); },
    removeRec: (s, id) => { patch(s, id, { deletedAt: Date.now() }); say('Spostato nel cestino.', () => patch(s, id, { deletedAt: null })); return true; },
    restore: (s, id) => patch(s, id, { deletedAt: null }),
    destroy: (s, id) => setRaw((r) => ({ ...r, [s]: r[s].filter((x) => x.id !== id) })),
    emptyTrash: () => setRaw((r) => { const o: any = {}; ORDER.forEach((s) => (o[s] = r[s].filter((x) => !x.deletedAt))); return o; }),
    setPrefs: (p) => setP((x) => ({ ...x, ...p })),
    setProfile: () => {},
    setCols: (s, c) => setC((x) => ({ ...x, [s]: c })),
    lcfg: letturaCfg(), setLcfg: (c) => setLc(c),
    toast, toastUndo, say,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
