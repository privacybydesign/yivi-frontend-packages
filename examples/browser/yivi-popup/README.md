# Browser Yivi popup example

This package is an example for how to use the `yivi-popup` plugin in the
web browser. See the source of `index.js` and `public/index.html` for how we use
the plugin.

You can build this example by running the following commands in this directory:

```bash
npm install
npm run link # Only necessary for development builds
npm run build
```

To run the example, the `public` directory can simply be hosted using an HTTP
server. You can use the [`irma` CLI tool](https://github.com/privacybydesign/irmago/releases/latest)
to do this.

```bash
irma server --static-path=./public
```

It will be available in your browser at http://localhost:8088.
