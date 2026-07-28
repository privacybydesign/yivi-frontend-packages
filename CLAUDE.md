# Notes for automated contributors

## Dependencies and Dependabot

- This is a single npm workspace root (`yivi-core`, `yivi-css`, `yivi-frontend`,
  `plugins/*`). All Dependabot alerts land on the root `package-lock.json`.
- Alerts have so far been dev/build scope only, which is why `npm audit fix`
  cleared them lockfile-only, without touching any `package.json`. Do not assume
  that of the next batch. Most workspaces ship runtime `dependencies`:
  `deepmerge` from `plugins/yivi-web` (plus `qrcode`), `yivi-client`,
  `yivi-dummy` and `yivi-popup`; `prompt-sync` and `qrcode-terminal` from
  `plugins/yivi-console`; `@privacybydesign/yivi-css` from `yivi-frontend`.
  Check `dependencies` against `devDependencies` before calling a bump
  consumer-safe.
- `examples/` is **not** a workspace. Its `package.json` files are not in the
  lockfile, so they are outside Dependabot's scope and need separate work.
- `brace-expansion` under eslint 9 cannot be fixed by a lockfile refresh.
  `minimatch@3` does `require('brace-expansion')` and calls the result, but
  brace-expansion 4+ exports an object (`{ expand, ... }`). An `overrides` entry
  breaks eslint; the fix is an eslint major bump.
- `tar`, `sigstore` and `undici` under `node_modules/npm` are bundled inside the
  `npm` tarball, so an `overrides` entry cannot reach them; they move only when
  `npm` itself does. A lockfile refresh *does* move `npm`, as long as
  `@semantic-release/npm`'s `^11.6.2` range still allows a newer one, which is
  how the bundled `tar` reached 7.5.19 here. Reach for a pin only once the
  installed `npm` is already at the top of that range.
- `tar` GHSA-r292-9mhp-454m is the exception: it needs 7.5.21, and neither the
  newest 11.x (11.18.0) nor npm 12.0.1 bundles a patched copy, so no `npm` bump
  clears it. It waits on upstream npm refreshing its bundled `tar`.

## Verifying a dependency change

The published artifacts are built by `npm run build`. A dev-dependency change
should not alter them, so byte-compare against `master` before opening the PR:

```bash
git clone -q --branch master "file://$PWD" /tmp/pristine && (cd /tmp/pristine && npm ci && npm run build)
npm ci && npm run build
sha256sum {.,/tmp/pristine}/yivi-frontend/dist/{yivi.js,index.mjs,index.cjs}
```

Keep `--branch master`. Cloning a local path without it checks out whatever the
source repo has checked out, so from a feature branch the compare runs the branch
against itself and reports identical whatever the change did.

`npm run lint` covers both eslint and stylelint; `npm run fmt` applies the
prettier fixes eslint reports. `npm test` reads built artifacts in
`tests/integration/`, so run `npm run build` first, matching CI, which runs
build before test.
