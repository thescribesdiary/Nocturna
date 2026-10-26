import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/pirata-one/latin-400.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import '@phosphor-icons/web/regular';
import '@phosphor-icons/web/bold';
import '@phosphor-icons/web/fill';
import './styles/ds.css';
import './styles/tokens.css';
import App from './App';

// L'accesso con Google funziona al meglio sull'indirizzo .firebaseapp.com: ci spostiamo lì.
if (location.hostname.endsWith('.web.app')) {
  location.replace(location.href.replace('.web.app', '.firebaseapp.com'));
} else {
  if ('serviceWorker' in navigator && import.meta.env.PROD) registerSW({ immediate: true });
  const root = createRoot(document.getElementById('root')!);
  if (import.meta.env.DEV && location.search.includes('demo')) {
    // Solo in sviluppo: interfaccia con dati d'esempio, senza Firebase.
    Promise.all([import('./data/demo'), import('./App')]).then(([d, a]) =>
      root.render(<d.DemoProvider><a.Layout /></d.DemoProvider>));
  } else root.render(<React.StrictMode><App /></React.StrictMode>);
}
