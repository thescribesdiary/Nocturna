import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeImage } from '../src/lib/safe.ts';

test('safeImage accetta immagini incorporate e https', () => {
  assert.equal(safeImage('data:image/jpeg;base64,/9j/4AAQ=='), 'data:image/jpeg;base64,/9j/4AAQ==');
  assert.equal(safeImage('https://example.com/a.png'), 'https://example.com/a.png');
});

test('safeImage rifiuta schemi pericolosi e valori strani', () => {
  for (const v of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'http://example.com/a.png',
    'https://x.com/a.png) , url(javascript:1', 'data:image/svg+xml;base64,PHN2Zz4=', ' https://x.com', 42, null, undefined, {}])
    assert.equal(safeImage(v), '', String(v));
});

test('safeImage rifiuta immagini oltre il limite delle regole Firestore (1.000.000 caratteri)', () => {
  const head = 'data:image/jpeg;base64,';
  assert.equal(safeImage(head + 'A'.repeat(1_000_000 - head.length)).length, 1_000_000);
  assert.equal(safeImage(head + 'A'.repeat(1_000_001 - head.length)), '');
});
