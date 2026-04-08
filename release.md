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
# Example: ./prepare-release.sh 1.0.0-beta.2

# Check output carefully before continuing.

# 2. Publish standalone packages with beta tag
./release.sh beta

# 3. Prepare and publish yivi-popup with beta tag
./prepare-yivi-popup.sh
cd ./plugins/yivi-popup && npm publish --access public --tag beta
cd ../..

# 4. Prepare and publish yivi-frontend with beta tag
./prepare-yivi-frontend.sh
cd ./yivi-frontend && npm publish --access public --tag beta
cd ..

# 5. Commit the version bump
git add -u ./\*package.json ./\*package-lock.json
git commit -m "Version bump"
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

## Troubleshooting

### `npm error 404 Not Found` on publish

You are not logged in or your account does not have publish access to the `@privacybydesign` scope. Run `npm whoami` and check your org membership.

### `npm error Version not changed`

The prepare scripts set the version, but `prepare-yivi-popup.sh` / `prepare-yivi-frontend.sh` also try to set it. This is harmless since both scripts now use `--allow-same-version`. If you see this on an older version of the scripts, you can safely continue with the publish step manually.

### Webpack build fails with `Module not found: @privacybydesign/*`

This happens when the workspace packages don't have their `dist/` directories built. The `prepare-yivi-frontend.sh` script expects sibling packages to already be built. Fix by running from the repo root before retrying:

```bash
npm install
npm run build --workspaces --if-present
```

Then re-run `./prepare-yivi-frontend.sh`.
