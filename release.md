# Releasing yivi-frontend-packages

This document describes the full release process for all packages in this monorepo.

## Prerequisites

- You must be logged into npm (`npm login`) with an account that has publish access to the `@privacybydesign` scope.
- Verify with `npm whoami` and `npm org ls privacybydesign`.

## Package overview

The release involves 8 packages, published in three stages:

**Standalone packages** (published via `release.sh`):
- `@privacybydesign/yivi-core`
- `@privacybydesign/yivi-css`
- `@privacybydesign/yivi-client`
- `@privacybydesign/yivi-console`
- `@privacybydesign/yivi-dummy`
- `@privacybydesign/yivi-web`

**Special packages** (published manually, each has its own prepare script):
- `@privacybydesign/yivi-popup`
- `@privacybydesign/yivi-frontend`

All packages are versioned in lockstep (same version number).

## Stable release

```bash
# 1. Bump all package versions, build standalone packages
./prepare-release.sh <version>
# Example: ./prepare-release.sh 1.1.0

# Check output carefully before continuing.

# 2. Publish standalone packages
./release.sh

# 3. Prepare and publish yivi-popup
./prepare-yivi-popup.sh
cd ./plugins/yivi-popup && npm publish --access public
cd ../..

# 4. Prepare and publish yivi-frontend
./prepare-yivi-frontend.sh
cd ./yivi-frontend && npm publish --access public
cd ..

# 5. Commit the version bump
git add -u ./\*package.json ./\*package-lock.json
git commit -m "Version bump"
```

## Pre-release (beta)

For beta or other pre-release versions, use a pre-release version string and add
`--tag <tag>` to all publish commands. This prevents the pre-release from becoming
the `latest` tag on npm.

```bash
# 1. Bump all package versions, build standalone packages
./prepare-release.sh <version>
# Example: ./prepare-release.sh 1.0.0-beta.5

# Check output carefully before continuing.

# 2. Restore root dev dependencies (see "Known issues" below).
npm install

# 3. Publish standalone packages with beta tag
./release.sh beta

# 4. Prepare and publish yivi-popup with beta tag
./prepare-yivi-popup.sh
# Verify plugins/yivi-popup/package.json has no self-reference in dependencies;
# remove it if present (see "Known issues" below).
cd ./plugins/yivi-popup && npm publish --access public --tag beta
cd ../..

# 5. Prepare and publish yivi-frontend with beta tag
./prepare-yivi-frontend.sh
# Verify yivi-frontend/package.json has no self-reference in devDependencies;
# remove it if present (see "Known issues" below).
cd ./yivi-frontend && npm publish --access public --tag beta
cd ..

# 6. Commit the version bump
git add -u ./\*package.json ./\*package-lock.json
git commit -m "Version bump to <version>"
```

## What the scripts do

### `prepare-release.sh <version>`

1. Bumps the `version` field in every package.json to the given version.
2. Updates all `@privacybydesign/*` cross-references in dependencies, peerDependencies, and devDependencies to `^<version>`.
3. For each standalone package: cleans, installs, builds (`npm run release`), then reinstalls with `--omit=dev`.

### `release.sh [tag]`

1. Finds all standalone packages (excludes yivi-popup and yivi-frontend).
2. Prompts for confirmation.
3. Runs `npm publish --access public` for each, optionally with `--tag <tag>`.

### `prepare-yivi-popup.sh`

1. Auto-detects the version from yivi-core's package.json.
2. Reinstalls dependencies, replacing workspace links with versioned registry packages as production dependencies.
3. Sets the package version.
4. Reinstalls with `--omit=dev` to prepare a clean publish artifact.

### `prepare-yivi-frontend.sh`

Same as yivi-popup, but installs `@privacybydesign/*` packages as devDependencies (they get bundled by webpack into the output). Runs both an ESM build (tsdown) and a UMD bundle (webpack).

## Known issues with the current scripts

These are workarounds you have to apply manually until the scripts are fixed.
The "Automation roadmap" section below tracks the planned cleanup.

### Root dev dependencies get stripped after `prepare-release.sh`

`prepare-release.sh` ends with a per-package loop that runs
`npm install --omit=dev` inside each standalone package. Because the repo uses
npm workspaces with hoisting, that command rewrites the **root** `node_modules`
to a production-only tree, removing transitive dev deps such as `tree-kill`
(needed by `tsdown`).

Symptom when running `prepare-yivi-popup.sh` or `prepare-yivi-frontend.sh`
afterwards:

```
ERROR  Error: Cannot find module 'tree-kill'
```

**Workaround:** run `npm install` at the repo root once between
`prepare-release.sh` and the prepare-yivi-popup / prepare-yivi-frontend
scripts. This restores the dev tree without affecting the already-built
standalone artifacts.

### Self-reference added to yivi-popup / yivi-frontend `package.json`

The prepare scripts loop over `npm ls --parseable | grep '@privacybydesign/'`
and run `npm install <pkg>@<version> --save-prod` (or `--save-dev`) for each.
That listing includes the package itself, so the script ends up adding the
package to its own `dependencies` (popup) or `devDependencies` (frontend).

After running each prepare script, check the affected `package.json` and
remove the self-reference before publishing. One-liner:

```bash
node -e "
  const fs = require('fs');
  for (const path of ['plugins/yivi-popup/package.json', 'yivi-frontend/package.json']) {
    const json = JSON.parse(fs.readFileSync(path, 'utf8'));
    for (const k of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (json[k] && json[k][json.name]) {
        delete json[k][json.name];
        console.log('removed self-ref from', path, k);
      }
    }
    fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
  }
"
```

## Troubleshooting

### `npm error 401 Unauthorized` / `404 Not Found` on publish

You are not logged in or your account does not have publish access to the
`@privacybydesign` scope. Run `npm whoami` and check your org membership with
`npm org ls privacybydesign`.

### `npm error Version not changed`

The prepare scripts set the version, but `prepare-yivi-popup.sh` /
`prepare-yivi-frontend.sh` also try to set it. This is harmless since both
scripts now use `--allow-same-version`. If you see this on an older version
of the scripts, you can safely continue with the publish step manually.

### Webpack build fails with `Module not found: @privacybydesign/*`

This happens when the workspace packages don't have their `dist/`
directories built. The `prepare-yivi-frontend.sh` script expects sibling
packages to already be built. Fix by running from the repo root before
retrying:

```bash
npm install
npm run build --workspaces --if-present
```

Then re-run `./prepare-yivi-frontend.sh`.

## Automation roadmap

Once the `typescript-esm-modernization` PR is merged, replace the manual
flow above with a single CI-driven release. Concrete cleanups, in
priority order:

1. **Fix the dev-tree strip** — In `prepare-release.sh`, replace the
   final per-package `npm install --omit=dev` loop with a `.npmignore` /
   `files` field strategy so publish artifacts stay clean without
   touching `node_modules`. The current approach corrupts the dev tree
   and forces the manual `npm install` workaround between phases.
2. **Stop adding self-references** — In `prepare-yivi-popup.sh` and
   `prepare-yivi-frontend.sh`, filter the `npm ls --parseable` output
   to skip the current package's own name before the install loop.
3. **Single entry point** — A top-level `release.sh <version> [tag]`
   that runs prepare-release, the two special prepares, all eight
   publishes, and the version-bump commit in one go. Fail loudly on
   any non-zero exit; never on `npm audit`.
4. **CI release on tag push** — A GitHub Action (or GitLab CI job)
   that runs the same script on `git push --tags`, using an
   `NPM_TOKEN` secret with publish rights to `@privacybydesign`. The
   workflow should:
   - Verify the tag matches every package's `version` field.
   - Run `npm publish --provenance --access public` (provenance gives
     consumers a verifiable build trail).
   - For pre-release tags (`vX.Y.Z-beta.N`), pass `--tag beta`
     automatically based on the tag string.
5. **Changesets or conventional commits** — Replace the manual
   "bump everything in lockstep" step with a tool that tracks
   per-package changes (e.g. `changesets`). Lockstep versioning is
   the simplest path today, but it forces a release of all eight
   packages even when only one changed.
6. **Remove `npm audit fix` / `npm update`** from the prepare
   scripts. These mutate the lockfile in non-deterministic ways
   right before publish, which is the opposite of what a release
   pipeline needs. Lockfile hygiene belongs in regular dependency-
   bump PRs, not in the release flow.
