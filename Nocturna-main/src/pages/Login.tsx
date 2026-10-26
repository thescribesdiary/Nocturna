import React, { useState } from 'react';
import { configured, login } from '../firebase';
import { ArchDivider, Corners } from '../components/Ornaments';

export function Login({ error }: { error?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(error || '');
  const go = async () => {
    setBusy(true); setErr('');
    try { await login(); } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') setErr('Accesso non riuscito. Controlla la connessione e riprova.');
    } finally { setBusy(false); }
  };
  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(700px 420px at 80% -10%, color-mix(in srgb, var(--color-accent-800) 36%, transparent), transparent 70%), var(--color-bg)' }}>
      <div style={{ position: 'relative', width: 'min(430px,100%)', display: 'flex', flexDirection: 'column', gap: 18, padding: '40px 34px', border: '1px solid var(--color-divider)', borderRadius: 4, background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}>
        <Corners size={46} inset={6} />
        <div>
          <div className="gothic" style={{ fontSize: 64, lineHeight: 0.9 }}>Nocturna</div>
          <div style={{ marginTop: 12 }}><ArchDivider width={230} /></div>
        </div>
        <p style={{ margin: 0, fontSize: 17, color: 'var(--color-neutral-300)', lineHeight: 1.5 }}>Scuola, lavoro, lettura e scrittura in un unico calendario, sincronizzato tra i tuoi dispositivi.</p>
        {configured ? (
          <button className="btn btn-primary" onClick={go} disabled={busy} style={{ minHeight: 48, fontSize: 17, alignSelf: 'flex-start', paddingInline: 18 }}>
            <i className="ph ph-google-logo" style={{ fontSize: 18 }} />{busy ? 'Accesso in corso…' : 'Accedi con Google'}
          </button>
        ) : (
          <p style={{ margin: 0, padding: '12px 14px', borderRadius: 10, border: '1px dashed var(--color-neutral-600)', fontSize: 15, color: 'var(--color-neutral-300)' }}>
            Firebase non è ancora configurato: compila il file <code>nocturna.config.js</code> seguendo la guida nel README.
          </p>
        )}
        {err && <p role="alert" style={{ margin: 0, fontSize: 15, color: 'var(--color-urgent)' }}>{err}</p>}
      </div>
    </div>
  );
}
