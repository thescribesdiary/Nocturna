import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logout } from './firebase';
import { DataProvider, cachedTheme, useStore } from './data/store';
import { Route, useIsMobile, useRoute } from './components/ui';
import { MobileBar, Sidebar, Toast } from './components/Shell';
import { OpeningSummary } from './components/Summary';
import { Home } from './pages/Home';
import { SectionPage } from './pages/Section';
import { Trash } from './pages/Trash';
import { Account } from './pages/Account';
import { Login } from './pages/Login';
import { SPACE, joinSpace } from './data/space';

function Page({ route, mobile, go }: { route: Route; mobile: boolean; go: (r: Route) => void }) {
  switch (route) {
    case 'scuola': case 'lavoro': case 'lettura': case 'scrittura':
      return <SectionPage key={route} c={route} mobile={mobile} />;
    case 'cestino': return <Trash mobile={mobile} />;
    case 'profilo': case 'impostazioni': return <Account page={route} mobile={mobile} go={go} />;
    default: return <Home mobile={mobile} />;
  }
}

export function Layout() {
  const { prefs, ready, uid, say } = useStore();
  const mobile = useIsMobile();
  const [route, go] = useRoute();

  useEffect(() => {
    document.documentElement.style.background = 'var(--color-bg)';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', prefs.theme === 'chiaro' ? '#ebe3e2' : prefs.theme === 'contrasto' ? '#050304' : '#0f0b0d');
  }, [prefs.theme]);

  useEffect(() => {
    if (ready && uid !== 'demo') import('./data/push').then((m) => m.initPush(uid, say)).catch(() => {});
  }, [ready, uid]); // eslint-disable-line

  const bg = 'radial-gradient(900px 420px at 80% -12%, color-mix(in srgb, var(--color-accent-800) 32%, transparent), transparent 70%), var(--color-bg)';
  return (
    <div data-theme={prefs.theme} style={{ height: '100%', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
      {mobile ? (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'radial-gradient(500px 300px at 90% -5%, color-mix(in srgb, var(--color-accent-800) 30%, transparent), transparent 70%), var(--color-bg)' }}>
          <MobileBar route={route} go={go} />
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 18px calc(env(safe-area-inset-bottom, 0px) + 110px)' }}>
            {ready ? <Page route={route} mobile go={go} /> : <Loading />}
          </div>
        </div>
      ) : (
        <div style={{ height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: bg }}>
          <Sidebar route={route} go={go} />
          {ready ? <Page route={route} mobile={false} go={go} /> : <Loading />}
        </div>
      )}
      <OpeningSummary />
      <Toast />
    </div>
  );
}

const Loading = () => (
  <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40, color: 'var(--color-neutral-500)', fontSize: 15 }}>Caricamento dei dati…</div>
);

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [denied, setDenied] = useState('');
  const [joined, setJoined] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);
  // Prima di aprire i dati: entra nello spazio condiviso e, la prima volta, porta con sé i dati vecchi.
  useEffect(() => {
    if (!user) return;
    let done = false;
    const finish = () => { if (!done) { done = true; setJoined(user.uid); } };
    const t = window.setTimeout(finish, 8000); // senza rete non blocchiamo l'app
    joinSpace(user.uid).then(finish).catch((e) => {
      if (e?.code === 'permission-denied') { setDenied(`L'account ${user.email || ''} non è autorizzato ad accedere a Nocturna.`); logout(); }
      else { console.error(e); finish(); }
    });
    return () => window.clearTimeout(t);
  }, [user]);
  // Le regole di sicurezza rifiutano gli account non autorizzati: in quel caso usciamo e lo spieghiamo.
  const onDenied = () => {
    setDenied(`L'account ${auth.currentUser?.email || ''} non è autorizzato ad accedere a Nocturna.`);
    logout();
  };

  if (user === undefined)
    return <div data-theme={cachedTheme()} style={{ height: '100%', background: 'var(--color-bg)' }} />;
  if (!user)
    return <div data-theme={cachedTheme()} style={{ height: '100%', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}><Login error={denied} /></div>;
  if (joined !== user.uid)
    return <div data-theme={cachedTheme()} style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--color-bg)', color: 'var(--color-neutral-500)', fontFamily: 'var(--font-body)', fontSize: 15 }}>Apertura dei dati condivisi…</div>;
  return (
    <DataProvider uid={SPACE} onDenied={onDenied}>
      <Layout />
    </DataProvider>
  );
}
