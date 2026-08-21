# yivi-frontend-packages

`@privacybydesign/yivi-core`, `yivi-css`, `yivi-frontend` and the plugins under
`plugins/` — the TypeScript client to an IRMA server, published to npm. Built for
the browser first, but the same packages assemble a Node client. Full type
definitions, ESM and CommonJS. `README.md` has the session flows, the package
list and the development commands; `release.md` has the release mechanism.

## Position

Yivi is attribute-based identity: a person holds credentials on their own device
and discloses only the attributes a verifier asks for. These packages are the
browser end of it: they ask a back end to start a session, render the QR or
pairing code, and follow the session to its result. What an attribute means, and
whether a disclosure is valid, is decided by the server and not here.

## Repos to consider before changing something here

- `privacybydesign/irmago` — the IRMA server on the other end of every session
  these packages start. It owns the session and pairing wire format; this client
  follows it.
- `encryption4all/postguard-js` — `@e4a/pg-js` depends on `yivi-client`,
  `yivi-core`, `yivi-css` and `yivi-web`, so a change here reaches PostGuard's
  browser clients. A cross-org consumer, and one that moves on an npm release
  rather than on a merge.
- `privacybydesign/irmamobile` — the Yivi app, which scans what `yivi-web`
  renders.

## Where the operational knowledge is

Not in this file. The host assembles a binding-rule bundle per task and lands it
in the container at `~/dobby-rules.md`; something durable learned in this repo is
filed there as a rule. Something a human contributor needs goes in the README.
This file stays orientation.
