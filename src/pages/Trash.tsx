import React, { useState } from 'react';
import { GG, MESI, P } from '../lib/dates';
import { CATS, KIND_LABEL, catVar, dateOf, recTitle } from '../data/sections';
import { useStore } from '../data/store';
import { H1 } from '../components/ui';

const when = (ms: number) => {
  const d = new Date(ms), t = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (same(d, t)) return 'eliminata oggi';
  if (same(d, y)) return 'eliminata ieri';
  return 'eliminata il ' + d.getDate() + ' ' + MESI[d.getMonth()].slice(0, 3);
};

export function Trash({ mobile }: { mobile: boolean }) {
  const { trash, restore, destroy, emptyTrash, say } = useStore();
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <main style={{ flex: 1, minWidth: 0, padding: mobile ? '4px 0 40px' : '24px 26px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: mobile ? undefined : 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 220 }}>
          <H1 size={mobile ? 36 : 44}>Cestino</H1>
          <p style={{ fontSize: 15.5, color: 'var(--color-neutral-400)', margin: 0 }}>Gli elementi eliminati restano qui finché non li ripristini o li elimini definitivamente.</p>
        </div>
        {trash.length > 0 && (
          <button className="btn btn-secondary" onClick={() => { if (confirm !== '*') { setConfirm('*'); return; } emptyTrash(); setConfirm(null); say('Cestino svuotato.'); }} style={{ flex: 'none', whiteSpace: 'nowrap', minHeight: 38, color: 'var(--color-urgent)', borderColor: 'color-mix(in srgb, var(--color-urgent) 45%, transparent)' }}>
            <i className="ph ph-trash" style={{ fontSize: 16 }} />{confirm === '*' ? 'Conferma: svuota il cestino' : 'Svuota cestino'}
          </button>
        )}
      </div>
      {trash.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 880 }}>
          {trash.map(({ section, rec }) => {
            const date = dateOf(section, rec);
            const d = date ? P(date) : null;
            const meta = CATS[section].label + (KIND_LABEL[rec.kind] && rec.kind !== 'attivita' && rec.kind !== 'task' ? ' · ' + KIND_LABEL[rec.kind] : '') + (d ? ' · ' + GG[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()].slice(0, 3) : '') + ' · ' + when(rec.deletedAt || Date.now());
            const key = section + ':' + rec.id;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 62, padding: '10px 4px', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)', flexWrap: mobile ? 'wrap' : 'nowrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: catVar(section), flex: 'none' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: mobile ? 'calc(100% - 30px)' : 0 }}>
                  <span style={{ fontSize: 16 }}>{recTitle(rec)}</span>
                  <span style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>{meta}</span>
                </div>
                <button className="btn btn-secondary" onClick={() => { restore(section, rec.id); setConfirm(null); say('Elemento ripristinato.'); }} style={{ flex: 'none', minHeight: mobile ? 44 : 38 }}><i className="ph ph-arrow-counter-clockwise" style={{ fontSize: 16 }} />Ripristina</button>
                <button className="btn btn-ghost" onClick={() => { if (confirm !== key) { setConfirm(key); return; } destroy(section, rec.id); setConfirm(null); say('Eliminato definitivamente.'); }} style={{ flex: 'none', minHeight: mobile ? 44 : 38, paddingInline: 10, color: 'var(--color-urgent)' }}>
                  <i className="ph ph-trash" style={{ fontSize: 16 }} />{confirm === key ? 'Conferma' : 'Elimina definitivamente'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '28px 0', maxWidth: 480 }}>
          <i className="ph ph-trash-simple" style={{ fontSize: 34, color: 'var(--color-neutral-500)' }} />
          <p style={{ fontSize: 16, margin: 0 }}>Il cestino è vuoto.</p>
          <p style={{ fontSize: 14.5, color: 'var(--color-neutral-400)', margin: 0 }}>Quando elimini un elemento da una sezione, lo ritrovi qui.</p>
        </div>
      )}
    </main>
  );
}
