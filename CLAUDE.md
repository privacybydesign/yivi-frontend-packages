# Notes for automated contributors

## Dependencies and Dependabot

- This is a single npm workspace root (`yivi-core`, `yivi-css`, `yivi-frontend`,
  `plugins/*`). All Dependabot alerts land on the root `package-lock.json`, and
  every dependency here is dev/build scope, so `npm audit fix` usually clears
  them lockfile-only, without touching any `package.json`.
- `examples/` is **not** a workspace. Its `package.json` files are not in the
  lockfile, so they are outside Dependabot's scope and need separate work.
- Two chains cannot be fixed by a lockfile refresh:
  - `brace-expansion` under eslint 9. `minimatch@3` does
    `require('brace-expansion')` and calls the result, but brace-expansion 4+
    exports an object (`{ expand, ... }`). An `overrides` entry breaks eslint;
    the fix is an eslint major bump.
  - `tar`, `sigstore` and `undici` under `node_modules/npm`. These are bundled
    inside the `npm` tarball, so only pinning `npm` itself moves them, and
    `@semantic-release/npm` caps it at `^11.6.2`.

## Verifying a dependency change

The published artifacts are built by `npm run build`. A dev-dependency change
should not alter them, so byte-compare against `master` before opening the PR:

```bash
git clone -q "file://$PWD" /tmp/pristine && (cd /tmp/pristine && npm ci && npm run build)
npm ci && npm run build
sha256sum {.,/tmp/pristine}/yivi-frontend/dist/{yivi.js,index.mjs,index.cjs}
```

`npm run lint` covers both eslint and stylelint; `npm run fmt` applies the
prettier fixes eslint reports. `npm test` reads built artifacts in
`tests/integration/`, so run `npm run build` first, matching CI, which runs
build before test.
