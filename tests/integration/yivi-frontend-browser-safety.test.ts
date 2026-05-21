import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Regression guard for the bug fixed in PR #72 (refs issue #71):
// the published ESM bundle was loading qrcode's Node entry, which pulled in
// pngjs and Node built-ins via `createRequire(import.meta.url)`. Browser
// bundlers (Vite, etc.) externalize `node:module`, so the bundle crashed on
// first evaluation. These assertions run against the built artifact and fail
// fast if a future change reintroduces a Node-only dependency in the ESM.

const esmBundlePath = resolve(
  __dirname,
  '../../yivi-frontend/dist/index.mjs',
);

describe('yivi-frontend ESM bundle browser safety', () => {
  const bundle = readFileSync(esmBundlePath, 'utf8');

  it('does not import from node:module', () => {
    expect(bundle).not.toMatch(/from\s+["']node:module["']/);
  });

  it('does not call createRequire', () => {
    expect(bundle).not.toMatch(/createRequire\s*\(/);
  });

  it('does not bundle Node built-ins via __require', () => {
    const nodeBuiltins = ['fs', 'stream', 'zlib', 'util', 'assert', 'buffer'];
    for (const builtin of nodeBuiltins) {
      const pattern = new RegExp(`__require\\(["']${builtin}["']\\)`);
      expect(bundle, `Node built-in "${builtin}" leaked into ESM bundle`).not.toMatch(pattern);
    }
  });

  it('does not bundle pngjs (Node-only PNG encoder)', () => {
    expect(bundle).not.toMatch(/node_modules\/pngjs\//);
  });
});
