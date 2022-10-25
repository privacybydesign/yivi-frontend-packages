# Yivi console

This plugin contains a console based front-end for Yivi flows. It's mostly
useful for testing purposes or for use in `nodejs` applications.

This plugin takes no special options or parameters to the start method. It will
render a QR code to either the local `nodejs` terminal or the browser console.

## Usage

```javascript
const YiviCore = require('@privacybydesign/yivi-core');
const Console  = require('@privacybydesign/yivi-console');

const yivi = new YiviCore(/* options */);
yivi.use(Console);
yivi.start();
```

## Extra behaviour
The `yivi-console` plugin makes it possible for users to abort the session without
completing it. When using this plugin, the `start` method of `yivi-core` will
reject its promise in this scenario using the callback message `Aborted`.
