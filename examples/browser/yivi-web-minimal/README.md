# Browser Yivi web minimal example

This package is an example for how to use the `yivi-web` plugin in minimal
mode. In this mode, only the QR code and state animations are rendered, without
the form wrapper, header, or helper elements.

You can build this example by running the following commands in this directory:

```bash
npm install
npm run build
```

To run the example, the `public` directory can simply be hosted using an HTTP
server. You can use the [`irma` CLI tool](https://github.com/privacybydesign/irmago/releases/latest)
to do this.

```bash
irma server --static-path=./public
```

It will be available in your browser at http://localhost:8088.
