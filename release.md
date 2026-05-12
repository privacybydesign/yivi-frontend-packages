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

## First release: v1.0.0

This monorepo is graduating from the `1.0.0-beta.N` series to a stable
`v1.0.0` line. The first run of the release workflow after this PR
merges will publish `1.0.0` for every package, for two reasons:

1. **No per-package tags exist yet.** multi-semantic-release looks for
   tags of the form `@privacybydesign/<pkg>@<version>`. Without one,
   semantic-release defaults the first release to `1.0.0`.
2. **The dep cascade propagates the same default.** Any package whose
   own files didn't get a release-worthy commit since the start of git
   history gets pulled into the release through the cascade — yivi-core
   publishes 1.0.0, which forces a cascade release of every package
   that depends on yivi-core, and so on. Cascade releases with no prior
   tag fall back to the same `1.0.0` first-release default.

**Do not seed per-package tags** for this transition. Doing so would
anchor each package at `1.0.0-beta.N` and the next release would be
`1.0.0-beta.N+1`, not `1.0.0`.

If you ever need to override the computed version (for any package, at
any future release), append a `Release-As: X.Y.Z` footer to the PR's
squash-merge commit message. semantic-release will respect it and skip
its own analysis.

After this v1.0.0 transition, all subsequent releases follow the normal
Conventional Commits flow described above.

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

### One package didn't get released in the first run

The first release relies on the dep cascade to pull every package into
the run. If a package has no release-worthy commits in its directory
AND nothing it depends on got released, the cascade won't reach it. To
force-release it: open a trivial `feat(<pkg>): ...` PR scoped to that
package's directory.

### I need to publish a specific version, not the one semantic-release computed

Append a `Release-As: X.Y.Z` footer to the PR's squash-merge commit
message. semantic-release uses it verbatim.
