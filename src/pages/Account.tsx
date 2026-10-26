import React, { useEffect, useState } from 'react';
import { auth, logout } from '../firebase';
import { Theme, useStore } from '../data/store';
import { CATS, ORDER, Section, catVar } from '../data/sections';
import { ParsedBackup, exportBackup, readBackup, restoreBackup } from '../data/backup';
import { PushState, disablePush, enablePush, pushState, testNotification } from '../data/push';
import { H1, Route, Seg } from '../components/ui';
import { SummaryDialog } from '../components/Summary';
import { ColumnsEditor } from '../components/Kanban';
import { resizeImage } from '../components/RecordForm';

const card: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px', borderRadius: 12, background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', minWidth: 0 };
const muted = { fontSize: 14, color: 'var(--color-neutral-400)', margin: 0 } as const;
const Head = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><i className={'ph ' + icon} style={{ fontSize: 20, color: 'var(--color-accent-300)' }} /><h2 style={{ fontSize: 19, fontWeight: 500, margin: 0, flex: 1 }}>{children}</h2></div>
);
const SYNC = {
  sincronia: ['In sincronia', 'ph-cloud-check', '#9fc0a8', 'Tutto aggiornato: i dati sono salvati online e allineati sui tuoi dispositivi.'],
  attesa: ['Modifiche in attesa', 'ph-cloud-arrow-up', '#d9a878', 'Alcune modifiche stanno per essere inviate.'],
  offline: ['Offline', 'ph-cloud-slash', 'var(--color-urgent)', 'Puoi continuare a lavorare: le modifiche verranno inviate al ritorno della connessione.'],
} as const;
const PUSH_LABEL: Record<PushState, string> = {
  attive: 'Attive su questo dispositivo',
  spente: 'Non attive su questo dispositivo',
  negate: 'Bloccate: riattivale dalle impostazioni del browser o del telefono.',
  'non-supportate': 'Non supportate qui. Su iPhone installa prima l’app sulla schermata Home e aprila da lì.',
  'non-configurate': 'Non ancora configurate: manca la chiave per le notifiche (vedi README).',
};

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ position: 'relative', width: 46, height: 28, flex: 'none', borderRadius: 999, border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-neutral-600)'}`, background: on ? 'var(--color-accent-700)' : 'var(--color-neutral-800)', cursor: 'pointer', padding: 0, marginTop: 2 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: on ? 'var(--color-accent-200)' : 'var(--color-neutral-400)', transition: 'left .15s' }} />
    </button>
  );
}

function Avatar({ src, name, size = 84 }: { src: string; name: string; size?: number }) {
  const initials = (name || '?').split(/\s+/).map((x) => x.charAt(0)).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: src ? `url(${src}) center/cover` : 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))', boxShadow: '0 0 0 1px var(--color-neutral-700)', display: 'grid', placeItems: 'center' }}>
      {!src && <span className="gothic" style={{ fontSize: size * 0.42, color: 'var(--color-accent-200)' }}>{initials}</span>}
    </div>
  );
}

function SyncLine() {
  const { sync } = useStore();
  const [l, ic, col, info] = SYNC[sync];
  return <><div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15.5 }}><i className={'ph ' + ic} style={{ fontSize: 18, color: col }} />{l}</div><p style={muted}>{info}</p></>;
}

export function Account({ page, mobile, go }: { page: 'profilo' | 'impostazioni'; mobile: boolean; go: (r: Route) => void }) {
  const st = useStore();
  const user = auth.currentUser;
  const [edit, setEdit] = useState<{ name: string; bio: string; avatar: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [cols, setCols] = useState<Section | null>(null);
  const [push, setPush] = useState<PushState>('spente');
  const [busy, setBusy] = useState('');
  const [restore, setRestore] = useState<{ file: string; parsed: ParsedBackup | null; ack: boolean } | null>(null);
  useEffect(() => { pushState().then(setPush).catch(() => setPush('non-supportate')); }, []);
  const lastBackup = (() => { try { const t = localStorage.getItem('nocturna-last-backup'); return t ? new Date(+t).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : ''; } catch { return ''; } })();
  const name = st.profile.name || user?.displayName || '';

  const profilo = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(340px,100%),1fr))', gap: 16, maxWidth: 1000, alignItems: 'start' }}>
      <section style={card}>
        <Head icon="ph-user-circle">Il tuo profilo</Head>
        {!edit ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Avatar src={st.profile.avatar} name={name} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                <span style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.2 }}>{name || 'Senza nome'}</span>
                {st.profile.bio ? <span style={{ fontSize: 15, color: 'var(--color-neutral-300)' }}>{st.profile.bio}</span> : <span style={{ fontSize: 14, color: 'var(--color-neutral-500)' }}>Nessuna descrizione</span>}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => setEdit({ name, bio: st.profile.bio, avatar: st.profile.avatar })} style={{ alignSelf: 'flex-start', minHeight: 44, fontSize: 15 }}><i className="ph ph-pencil-simple" />Modifica profilo</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Avatar src={edit.avatar} name={edit.name} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="btn btn-secondary" style={{ minHeight: 42, position: 'relative', cursor: 'pointer' }}><i className="ph ph-upload-simple" />Scegli immagine
                  <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEdit({ ...edit, avatar: await resizeImage(f, 160, true) }); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>
                {edit.avatar && <button className="btn btn-ghost" onClick={() => setEdit({ ...edit, avatar: '' })} style={{ minHeight: 36, color: 'var(--color-neutral-300)' }}>Rimuovi immagine</button>}
              </div>
            </div>
            <div className="field"><label>Nome visualizzato</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={{ minHeight: 46, fontSize: 16 }} /></div>
            <div className="field"><label>Breve descrizione <span style={{ color: 'var(--color-neutral-500)' }}>· facoltativa</span></label><textarea className="input" value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} style={{ minHeight: 80, fontSize: 15.5, fontFamily: 'inherit' }} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => { st.setProfile({ name: edit.name.trim(), bio: edit.bio.trim(), avatar: edit.avatar }); setEdit(null); st.say('Profilo salvato.'); }} style={{ minHeight: 44, paddingInline: 18 }}>Salva</button>
              <button className="btn btn-secondary" onClick={() => setEdit(null)} style={{ minHeight: 44 }}>Annulla</button>
            </div>
          </>
        )}
      </section>
      <section style={card}>
        <Head icon="ph-google-logo">Account collegato</Head>
        <span style={{ fontSize: 15, color: 'var(--color-neutral-200)', overflowWrap: 'anywhere' }}>{user?.email}</span>
        <p style={muted}>L'account Google è usato solo per la sincronizzazione personale dei dati di Nocturna.</p>
        <SyncLine />
        <button className="btn btn-secondary" onClick={() => go('impostazioni')} style={{ alignSelf: 'flex-start', minHeight: 44, fontSize: 15 }}><i className="ph ph-gear-six" />Gestisci in Impostazioni</button>
      </section>
    </div>
  );

  const doRestore = async () => {
    if (!restore?.parsed || !restore.ack) return;
    setBusy('restore');
    try { await restoreBackup(st.uid, restore.parsed); st.say('Backup ripristinato.'); setRestore(null); } catch (e) { console.error(e); st.say('Ripristino non riuscito: serve la connessione. Riprova.'); }
    setBusy('');
  };

  const impostazioni = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(360px,100%),1fr))', gap: 16, maxWidth: 1100, alignItems: 'start' }}>
      <section style={card}>
        <Head icon="ph-cloud">Account e sincronizzazione</Head>
        <span style={{ fontSize: 15, overflowWrap: 'anywhere' }}><i className="ph ph-google-logo" /> {user?.email}</span>
        <SyncLine />
        <button className="btn btn-secondary" onClick={logout} style={{ alignSelf: 'flex-start', minHeight: 44 }}><i className="ph ph-sign-out" />Esci da questo dispositivo</button>
      </section>

      <section style={card}>
        <Head icon="ph-database">Backup e ripristino</Head>
        <p style={muted}>Scarica una copia di tutti i dati di Nocturna in un file JSON, da conservare dove preferisci. Puoi reimportarla in qualsiasi momento.</p>
        {lastBackup && <span style={{ fontSize: 14, color: 'var(--color-neutral-300)' }}>Ultimo backup da questo dispositivo: {lastBackup}</span>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" disabled={!!busy} onClick={async () => { setBusy('export'); try { const n = await exportBackup(st.uid); st.say('Backup creato: ' + n + ' elementi.'); } catch { st.say('Backup non riuscito.'); } setBusy(''); }} style={{ minHeight: 44 }}><i className="ph ph-download-simple" />{busy === 'export' ? 'Preparazione…' : 'Crea backup'}</button>
          <label className="btn btn-secondary" style={{ minHeight: 44, position: 'relative', cursor: 'pointer' }}><i className="ph ph-upload-simple" />Ripristina backup
            <input type="file" accept="application/json,.json" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { setRestore({ file: f.name, parsed: await readBackup(f), ack: false }); } catch { setRestore({ file: f.name, parsed: null, ack: false }); } }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </label>
        </div>
        {restore && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--color-urgent) 45%, transparent)' }}>
            <span style={{ fontSize: 15 }}>{restore.file}</span>
            {restore.parsed ? (
              <>
                <span style={muted}>{restore.parsed.count} elementi{restore.parsed.exportedAt ? ' · creato il ' + new Date(restore.parsed.exportedAt).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
                <p style={{ margin: 0, fontSize: 14.5, color: 'var(--color-urgent)' }}>Il ripristino sostituisce tutti i dati attuali, su tutti i dispositivi. Prima, se vuoi, crea un backup di quelli di adesso.</p>
                <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 15, cursor: 'pointer' }}><input type="checkbox" checked={restore.ack} onChange={(e) => setRestore({ ...restore, ack: e.target.checked })} />Ho capito: sostituisci i dati attuali</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setRestore(null)}>Annulla</button>
                  <button className="btn btn-primary" disabled={!restore.ack || !!busy} onClick={doRestore} style={{ color: 'var(--color-urgent)', borderColor: 'var(--color-urgent)' }}>{busy === 'restore' ? 'Ripristino…' : 'Ripristina'}</button>
                </div>
              </>
            ) : (
              <><p style={{ margin: 0, fontSize: 14.5, color: 'var(--color-urgent)' }}>Questo file non è un backup di Nocturna.</p><button className="btn btn-secondary" onClick={() => setRestore(null)} style={{ alignSelf: 'flex-start' }}>Chiudi</button></>
            )}
          </div>
        )}
      </section>

      <section style={card}>
        <Head icon="ph-bell">Notifiche e riepilogo</Head>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 16 }}>Riepilogo all'apertura dell'app</span>
            <span style={muted}>All'apertura mostra le attività imminenti, le scadenze e quelle in ritardo di tutte le sezioni.</span>
          </div>
          <Switch on={st.prefs.summaryOnOpen} onClick={() => st.setPrefs({ summaryOnOpen: !st.prefs.summaryOnOpen })} label="Riepilogo all'apertura dell'app" />
        </div>
        <button className="btn btn-secondary" onClick={() => setPreview(true)} style={{ alignSelf: 'flex-start', minHeight: 42 }}><i className="ph ph-eye" />Anteprima del riepilogo</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
          <span style={{ fontSize: 16 }}>Promemoria su questo dispositivo</span>
          <span style={muted}>Notifica 15 minuti prima delle attività con orario e, per il piano editoriale, nei giorni scelti nel campo «Promemoria», alle 9:00. Arrivano anche ad app chiusa. Attivale su ogni dispositivo su cui vuoi riceverle.</span>
          <span style={{ fontSize: 14.5, color: push === 'attive' ? '#9fc0a8' : push === 'negate' ? 'var(--color-urgent)' : 'var(--color-neutral-300)' }}>{PUSH_LABEL[push]}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {push === 'spente' && <button className="btn btn-primary" disabled={!!busy} onClick={async () => { setBusy('push'); try { const s = await enablePush(st.uid); setPush(s); st.say(s === 'attive' ? 'Notifiche attivate.' : 'Notifiche non attivate.'); } catch (e) { console.error(e); st.say('Attivazione non riuscita. Riprova.'); } setBusy(''); }} style={{ minHeight: 44 }}><i className="ph ph-bell-ringing" />Attiva notifiche</button>}
            {push === 'attive' && <button className="btn btn-secondary" onClick={() => testNotification().catch(() => st.say('Prova non riuscita.'))} style={{ minHeight: 44 }}><i className="ph ph-paper-plane-tilt" />Invia una prova</button>}
            {push === 'attive' && <button className="btn btn-ghost" onClick={async () => { await disablePush(st.uid); setPush(await pushState()); st.say('Notifiche disattivate su questo dispositivo.'); }} style={{ minHeight: 44, color: 'var(--color-neutral-300)' }}>Disattiva</button>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 10, border: '1px dashed var(--color-neutral-600)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><i className="ph ph-envelope-simple" style={{ fontSize: 19, color: 'var(--color-neutral-400)' }} /><span style={{ fontSize: 16, flex: 1 }}>Notifiche via email</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)', fontSize: 12.5, color: 'var(--color-accent-200)' }}><i className="ph-fill ph-lock-simple" />Plus</span></div>
          <span style={muted}>Funzione riservata a un futuro piano Plus, non disponibile. È diversa dal riepilogo all'apertura. Nessuna email viene inviata.</span>
        </div>
      </section>

      <section style={card}>
        <Head icon="ph-palette">Preferenze</Head>
        <span style={{ fontSize: 16 }}>Tema</span>
        <Seg<Theme> big={mobile} grid label="Tema" value={st.prefs.theme} onChange={(theme) => st.setPrefs({ theme })} opts={[['scuro', 'Scuro'], ['contrasto', 'Alto contrasto'], ['chiaro', 'Chiaro']]} />
        <span style={{ fontSize: 16, paddingTop: 6 }}>Colonne delle bacheche</span>
        <span style={muted}>Rinomina, riordina, aggiungi o nascondi le colonne di ogni sezione.</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ORDER.map((c) => (
            <button key={c} onClick={() => setCols(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '6px 10px', border: 0, borderRadius: 8, background: 'color-mix(in srgb, var(--color-text) 4%, transparent)', color: 'var(--color-text)', font: 'inherit', fontSize: 15, cursor: 'pointer', textAlign: 'left' }}>
              <i className={'ph ' + CATS[c].icon} style={{ color: catVar(c), fontSize: 18 }} /><span style={{ flex: 1 }}>{CATS[c].label}</span><i className="ph ph-caret-right" style={{ color: 'var(--color-neutral-500)' }} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <main style={{ flex: 1, minWidth: 0, padding: mobile ? '4px 0 40px' : '24px 26px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: mobile ? undefined : 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent-300)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />Account</div>
        <H1 size={mobile ? 36 : 42}>{page === 'profilo' ? 'Profilo' : 'Impostazioni'}</H1>
      </div>
      <div style={{ alignSelf: mobile ? 'stretch' : 'flex-start' }}><Seg big={mobile} grid={mobile} label="Account" value={page} onChange={(p) => go(p)} opts={[['profilo', 'Profilo'], ['impostazioni', 'Impostazioni']]} /></div>
      {page === 'profilo' ? profilo : impostazioni}
      {preview && <SummaryDialog preview onClose={() => setPreview(false)} />}
      {cols && <ColumnsEditor c={cols} mobile={mobile} onClose={() => setCols(null)} />}
    </main>
  );
}
