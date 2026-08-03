import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Regression guard for the Dependabot alert on elliptic (GHSA-848j-6mx2-7j84).
// That advisory has no patched release, so the only way to clear it is to keep
// elliptic out of the tree entirely. It entered through
// node-polyfill-webpack-plugin -> node-stdlib-browser -> crypto-browserify in
// yivi-frontend. The plugin turned out to be inert (removing it produces a
// byte-identical yivi.js), so it was dropped. If the plugin, or anything else
// pulling in crypto-browserify, comes back anywhere in the workspace tree, this
// test fails and the choice has to be made deliberately instead of silently
// reopening the alert.
//
// Scope: this reads the root package-lock.json, so it covers the workspaces only.
// examples/ is not a workspace and is absent from that lockfile, so the copy of
// node-polyfill-webpack-plugin in examples/browser/yivi-console does not trip it.

const lockfile = JSON.parse(readFileSync(resolve(__dirname, '../../package-lock.json'), 'utf8')) as {
  packages: Record<string, unknown>;
};

const installedNames = Object.keys(lockfile.packages)
  .filter((path) => path.includes('node_modules/'))
  .map((path) => path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length));

describe('dependency tree', () => {
  it('does not contain elliptic', () => {
    expect(installedNames).not.toContain('elliptic');
  });

  it('does not contain crypto-browserify, which depends on elliptic', () => {
    expect(installedNames).not.toContain('crypto-browserify');
  });
});
