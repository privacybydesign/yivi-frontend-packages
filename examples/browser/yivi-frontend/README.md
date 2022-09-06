# Browser Yivi frontend example

This package is an example for how to use the `yivi-frontend` wrapper in the
web browser. See the source of `index.html` for how we use the wrapper.

Note that the way we initialize the session on the Yivi server is **not** a
recommended best practice for use in web browsers! See the
[yivi-client documentation](../../../plugins/yivi-client) for more information
on how to safely initialize your session.

You can build this example by running the following commands in this directory:

```bash
npm install
npm run link # Only necessary for development builds
npm run build
```

To run this example, you need the [`yivi` CLI tool](https://github.com/privacybydesign/yivigo/releases/latest).
You can start the Yivi server to run this example in the following way:

```bash
yivi server --static-path=.
```

It will be available in your browser at http://localhost:8088.