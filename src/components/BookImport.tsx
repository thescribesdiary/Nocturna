// Importazione di più libri da un file CSV: scelta del file → revisione → conferma → riepilogo.
// Nulla viene scritto prima della conferma; i duplicati non sovrascrivono mai i libri esistenti.
import React, { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { kindDef } from '../data/schema';
import { Rec } from '../data/sections';
import { bookCsvTemplate, bookImportConfig } from '../data/bookImportConfig';
import { ImportPreview, previewImport, rowsToImport, summary } from '../lib/bookImport';
import { decodeCsv } from '../lib/csv';
import { useToday } from '../data/hooks';
import { Corners } from './Ornaments';
import { useDialog } from './useDialog';

const MAX_BYTES = 2 * 1024 * 1024;
const DUP: Record<string, string> = { esistente: 'Possibile duplicato di un libro già presente', cestino: 'Possibile duplicato di un libro nel cestino', file: 'Ripetuto nel file' };

export function BookImport({ mobile, onClose }: { mobile: boolean; onClose: () => void }) {
  const st = useStore();
  const today = useToday();
  const dlg = useDialog(onClose);
  const [file, setFile] = useState('');
  const [p, setP] = useState<ImportPreview | null>(null);
  const [dups, setDups] = useState<Set<number>>(new Set());
  const [done, setDone] = useState<null | { added: number; skipped: number; invalid: number }>(null);
  const books = useMemo(() => st.docs.lettura.filter((x) => x.kind === 'libro'), [st.docs.lettura]);
  // Anche i libri nel cestino contano come possibili duplicati.
  const trashed = useMemo(() => st.trash.filter((t) => t.section === 'lettura' && t.rec.kind === 'libro').map((t) => t.rec), [st.trash]);

  const pick = async (f: File) => {
    setFile(f.name); setDups(new Set()); setDone(null);
    if (f.size > MAX_BYTES) { setP({ rows: [], columns: [], unknown: [], unsupported: [], fatal: 'Il file supera 2 MB.' }); return; }
    const { text } = decodeCsv(await f.arrayBuffer());
    setP(previewImport(text, bookImportConfig([...books, ...trashed])));
  };
  const s = p && !p.fatal ? summary(p, dups) : null;

  const confirm = () => {
    if (!p || p.fatal) return;
    const def = kindDef('lettura', 'libro');
    const rows = rowsToImport(p, dups);
    // Stesse convenzioni del modulo «Aggiungi libro»: campi vuoti dello schema, tipo «libro», data di inserimento di oggi.
    rows.forEach((r) => st.create('lettura', { ...def.blank, ...r.data, kind: 'libro', added: r.data.added || today } as Omit<Rec, 'id'>));
    const sum = summary(p, dups);
    setDone({ added: rows.length, skipped: sum.skipped, invalid: sum.invalid });
    st.say(rows.length === 1 ? '1 libro importato.' : rows.length + ' libri importati.');
  };
  const template = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + bookCsvTemplate()], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'nocturna-modello-libri.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const muted: React.CSSProperties = { margin: 0, fontSize: 14, color: 'var(--color-neutral-400)' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'grid', placeItems: mobile ? 'end stretch' : 'center', padding: mobile ? 0 : 20, background: 'color-mix(in srgb, var(--color-sidebar) 70%, transparent)' }}>
      <div ref={dlg} role="dialog" aria-modal="true" aria-label="Importa libri da CSV" className="dialog" style={{ width: mobile ? '100%' : 'min(640px,100%)', maxHeight: mobile ? '92%' : '100%', overflowY: 'auto', gap: 14, borderRadius: mobile ? '22px 22px 0 0' : undefined }}>
        {!mobile && <Corners size={30} inset={4} />}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="dialog-title" style={{ flex: 1 }}>Importa libri da CSV</div>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 44, height: 44, border: 0, background: 'none', color: 'var(--color-neutral-400)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><i className="ph ph-x" style={{ fontSize: 20 }} aria-hidden="true" /></button>
        </div>

        {done ? (
          <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 16 }}>Importazione completata.</p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.7 }}>
              <li>Libri aggiunti: {done.added}</li>
              <li>Saltati (possibili duplicati): {done.skipped}</li>
              <li>Non validi, non importati: {done.invalid}</li>
            </ul>
            <div className="dialog-actions"><button className="btn btn-primary" onClick={onClose}>Chiudi</button></div>
          </div>
        ) : (
          <>
            <p style={muted}>Una riga per libro, con l'intestazione nella prima riga. Servono almeno Titolo, Autore, Editore e Formato (cartaceo, digitale o audiolibro). Puoi usare la virgola o il punto e virgola come separatore. Niente viene salvato finché non confermi.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="btn btn-secondary" style={{ position: 'relative', cursor: 'pointer', minHeight: 44 }}>
                <i className="ph ph-file-csv" aria-hidden="true" />{file ? 'Scegli un altro file' : 'Scegli il file CSV'}
                <input type="file" accept=".csv,text/csv" aria-label="File CSV dei libri" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f).catch(() => setP({ rows: [], columns: [], unknown: [], unsupported: [], fatal: 'Impossibile leggere il file.' })); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
              <button className="btn btn-ghost" onClick={template} style={{ minHeight: 44, color: 'var(--color-neutral-300)' }}><i className="ph ph-download-simple" aria-hidden="true" />Scarica il modello</button>
            </div>
            {file && <span style={muted}>{file}</span>}

            {p?.fatal && <p role="alert" style={{ margin: 0, fontSize: 15, color: 'var(--color-urgent-text, var(--color-urgent))' }}>{p.fatal}</p>}
            {p && !p.fatal && s && (
              <>
                <p role="status" style={{ margin: 0, fontSize: 15 }}>
                  {p.rows.length} righe: <strong>{s.toAdd}</strong> da importare, {s.skipped} saltate come possibili duplicati, {s.invalid} non valide.
                </p>
                {(p.unknown.length > 0 || p.unsupported.length > 0) && (
                  <div role="note" style={{ padding: '10px 12px', borderRadius: 8, background: 'color-mix(in srgb, var(--color-text) 6%, transparent)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {p.unknown.length > 0 && <span><strong>Colonne non riconosciute, non verranno importate:</strong> {p.unknown.join(', ')}.</span>}
                    {p.unsupported.length > 0 && <span><strong>Colonne non importabili:</strong> {p.unsupported.join('; ')}.</span>}
                  </div>
                )}
                <ul aria-label="Righe del file" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.rows.map((r) => {
                    const bad = r.errors.length > 0;
                    const state = bad ? 'Non valida' : r.duplicate ? DUP[r.duplicate.kind] + (r.duplicate.kind === 'file' ? ' (' + r.duplicate.ref + ')' : '') : 'Pronta da importare';
                    return (
                      <li key={r.line} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 11px', borderRadius: 8, boxShadow: 'var(--shadow-sm)', background: 'var(--color-surface)' }}>
                        <span style={{ fontSize: 15 }}><span style={{ color: 'var(--color-neutral-400)' }}>Riga {r.line} · </span>{r.data.title || <em>senza titolo</em>}{r.data.author ? ' — ' + r.data.author : ''}</span>
                        <span style={{ fontSize: 13.5, color: bad ? 'var(--color-urgent-text, var(--color-urgent))' : 'var(--color-neutral-300)' }}>
                          <i className={'ph ' + (bad ? 'ph-warning-circle' : r.duplicate ? 'ph-copy' : 'ph-check-circle')} aria-hidden="true" /> {state}
                        </span>
                        {bad && <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: 'var(--color-neutral-300)' }}>{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                        {!bad && r.duplicate && (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', minHeight: 32 }}>
                            <input type="checkbox" checked={dups.has(r.line)} onChange={(e) => { const n = new Set(dups); if (e.target.checked) n.add(r.line); else n.delete(r.line); setDups(n); }} />
                            Importa comunque come libro separato (il libro esistente non viene toccato)
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={onClose}>Annulla</button>
              <button className="btn btn-primary" disabled={!s || s.toAdd === 0} onClick={confirm}>{s && s.toAdd ? (s.toAdd === 1 ? 'Importa 1 libro' : `Importa ${s.toAdd} libri`) : 'Importa'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
