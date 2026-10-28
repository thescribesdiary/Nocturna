// Carica un modulo dell'app che importa altri file senza estensione (come fa Vite), compilandolo al volo
// con esbuild (già installato come dipendenza di Vite). Nessuna rete, nessun file scritto.
import { buildSync } from 'esbuild';

export async function load<T = any>(entry: string): Promise<T> {
  const r = buildSync({ entryPoints: [new URL('../../' + entry, import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
}
