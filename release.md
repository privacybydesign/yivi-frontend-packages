# Releasing yivi-frontend-packages

Releases are fully automated by [multi-semantic-release][msr] on top of
[semantic-release][sr]. There is **no manual `npm publish` step** and
**no `NPM_TOKEN` secret** — npm authenticates via [Trusted Publishing][tp]
(OIDC).

[msr]: https://github.com/dhoulb/multi-semantic-release
[sr]: https://semantic-release.gitbook.io/
[tp]: https://docs.npmjs.com/trusted-publishers

## How it works

1. Land a PR on `master` (stable) or `beta` (prerelease) with a
   Conventional Commit title:
   - `fix: ...` → patch (`1.2.3 → 1.2.4`)
   - `feat: ...` → minor (`1.2.3 → 1.3.0`)
   - `feat!: ...` or footer `BREAKING CHANGE:` → major
   - `chore:`, `docs:`, `test:`, `refactor:`, `ci:` → no release
2. CI runs lint + build + test, then `npm run release`, which invokes
   `multi-semantic-release`.
3. For each of the eight publishable packages:
   - Commits touching that package's files since its last tag determine
     the new version.
   - If no commits affect the package, no release happens — **unless**
     one of its workspace dependencies got a new version, in which case
     the package is published as a patch with the new dep version
     baked in (this is the cascade you want for `A → B → C`).
4. Each released package gets:
   - An npm publish with `provenance` via OIDC.
   - A git tag `@privacybydesign/<pkg>@<version>`.
   - A GitHub Release with auto-generated notes.

## Conventional Commits cheat sheet

| Commit prefix              | Release | Notes                          |
|----------------------------|---------|--------------------------------|
| `fix(scope): ...`          | patch   | Bug fixes                      |
| `feat(scope): ...`         | minor   | New features                   |
| `feat(scope)!: ...`        | major   | Breaking change                |
| `perf(scope): ...`         | patch   | Perf improvements              |
| `refactor`, `chore`, `docs`, `test`, `ci`, `style`, `build` | none | No release |

A footer of `BREAKING CHANGE: <description>` also triggers a major bump,
regardless of the type. The `scope` is free-form; conventional choices
are the package name (`yivi-web`, `yivi-core`, …) or area (`release`,
`types`).

PR titles are enforced by `.github/workflows/pr-title.yml` so the
squash-merge commit on `master` has the right prefix.

## Dependency cascade

multi-semantic-release runs with `--deps.bump=override --deps.release=patch`,
which means:

- When package B publishes a new version, every package A that has B in
  its `dependencies`, `devDependencies`, or `peerDependencies` gets:
  - A patch release.
  - Its A→B dep spec rewritten to the exact new B version.

Concretely, the chain in this repo looks like:

```
yivi-core ─┬─→ yivi-client    (peerDep)
           ├─→ yivi-console   (peerDep)
           ├─→ yivi-dummy     (peerDep)
           ├─→ yivi-web       (peerDep) ──→ yivi-popup ──→ yivi-frontend
           └─→ yivi-popup     (dep)
yivi-css ──────────────────────────────────────────────→ yivi-frontend
```

A `fix:` to yivi-core will publish yivi-core, then cascade patch
releases through yivi-client/console/dummy/web/popup/frontend.

## Beta releases

Push to the `beta` branch instead of `master`:

```bash
git checkout -b beta
# ... commits ...
git push origin beta
```

Versions on this branch carry the `-beta.N` suffix and are published
with the `beta` npm dist-tag (not `latest`).

## One-time npm setup (per package)

Trusted Publishing has to be enabled once per package on npmjs.com:

1. Sign in as a member of the `@privacybydesign` org.
2. For each of the eight packages, go to *Settings > Publishing access*.
3. Click *Add Trusted Publisher* and fill in:
   - Publisher: **GitHub Actions**
   - Owner: `privacybydesign`
   - Repository: `yivi-frontend-packages`
   - Workflow filename: `release.yml`
   - Environment: *(empty)*

The eight packages are:

- `@privacybydesign/yivi-core`
- `@privacybydesign/yivi-css`
- `@privacybydesign/yivi-client`
- `@privacybydesign/yivi-console`
- `@privacybydesign/yivi-dummy`
- `@privacybydesign/yivi-web`
- `@privacybydesign/yivi-popup`
- `@privacybydesign/yivi-frontend`

## One-time bootstrap: seed per-package tags

The first time the workflow runs after this PR merges, multi-semantic-
release will look for tags of the form `@privacybydesign/<pkg>@<version>`
to determine each package's previous release. None exist yet, so without
seed tags the first computed version would be `1.0.0` — overwriting the
`1.0.0-beta.N` series that's already on npm.

Before merging this PR, create one tag per package pointing at the
current `master` HEAD (or whichever commit you consider the last
manually-released state):

```bash
last="$(git rev-parse HEAD)"
for pkg_ver in \
  '@privacybydesign/yivi-core@1.0.0-beta.6' \
  '@privacybydesign/yivi-css@1.0.0-beta.7' \
  '@privacybydesign/yivi-client@1.0.0-beta.6' \
  '@privacybydesign/yivi-console@1.0.0-beta.6' \
  '@privacybydesign/yivi-dummy@1.0.0-beta.6' \
  '@privacybydesign/yivi-web@1.0.0-beta.6' \
  '@privacybydesign/yivi-popup@1.0.0-beta.6' \
  '@privacybydesign/yivi-frontend@1.0.0-beta.6'; do
    git tag "$pkg_ver" "$last"
done
git push --tags
```

After that, semantic-release will compute the next version from each
package's last tag using the commits that touched its files.

## Running locally (dry-run)

```bash
npm ci
npm run build
npm run release:dry
```

This runs multi-semantic-release with `--dry-run`: nothing is published,
but you'll see which packages would be released, the next versions, and
the rewritten dep specs.

## Cross-package version specs

Internal deps in this monorepo (`@privacybydesign/*` referenced from
other `@privacybydesign/*` packages) are stored as `"*"` in working tree
package.json files. npm workspaces always resolves these to the local
workspace package regardless of version, and multi-semantic-release
rewrites `"*"` to the exact published version in the tarball at publish
time (because of `--deps.bump=override`).

Consumers of these packages on npm see exact-version pins between our
own packages (e.g. yivi-frontend's `@privacybydesign/yivi-web` will read
`1.2.3`, not `^1.2.3`). This matches how multi-semantic-release ensures
the cascade keeps the published graph internally consistent.

## Troubleshooting

### `npm error 401 Unauthorized` from CI

Trusted Publishing isn't configured for that package on npmjs.com, or
the workflow filename / repo / owner doesn't match the configured
publisher. Re-check the per-package setup above. Note that you have to
do it eight times — once per package.

### A package was bumped by cascade but I expected a real release

Run `npm run release:dry` locally. multi-semantic-release prints why
each package gets its version: either "(commits)" or "(triggered by
dependency)". If you expected the former, double-check that your
commits' scope/files actually touched that package's directory.

### The first run after merge wants to start at 1.0.0

You skipped the seed-tag bootstrap above. Tag the current state per
package, push the tags, and re-run the workflow.
