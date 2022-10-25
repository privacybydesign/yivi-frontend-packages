# Browser Yivi console example

This package is an example for how to use the `yivi-console` plugin in the
web browser. See the source of `index.js` for how we use the plugin.

You can run this example by running these commands in this directory:

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
