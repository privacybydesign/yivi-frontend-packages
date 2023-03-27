# Yivi dummy

This plugin contains a test dummy back-end for Yivi flows. With the dummy you
can simulate different issues that may be hard to test otherwise, which is
especially useful for developing front-end Yivi flow plugins.

This plugin takes no special parameters to the start method, but it can be
configured through the options. See below.

## Usage

```javascript
const YiviCore = require('@privacybydesign/yivi-core');
const Dummy    = require('@privacybydesign/yivi-dummy');

const yivi = new YiviCore({
  debugging: true,
  dummy: 'happy path'
});

yivi.use(Dummy);
yivi.start();
```

## Options

### dummy

The dummy option can take one of these values:

 * `happy path`          ⸺ Fake everything just working™️
 * `pairing`             ⸺ Fake everything just working with pairing enabled™️
 * `mobile`              ⸺ Fake everything just working for scanning a QR on mobile™️
 * `timeout`             ⸺ Fake a session time out on the server
 * `cancel`              ⸺ Fake cancellation in the Yivi app (don't have attributes or reject disclosure)
 * `connection error`    ⸺ Fake error connecting to the server on the initial session start
 * `browser unsupported` ⸺ Fake an unsupported browser detected

### debugging

This plugin listens to the `debugging` option, and will render some basic
information when debugging is enabled.

### qrPayload

If you want to customize what is shown in the QR code, you can pass anything to
the `qrPayload` option.

### successPayload

If you want to customize what the Promise resolves to, you can pass anything to
the `successPayload` option.

### pairingCode

If you are testing the `pairing` dummy flow, a 4-digit pairing code is asked. 
By default, this is `1234`, but you can change it by setting the `pairingCode` 
option to a different value.

### timing

Finally, you can customize the timings of the different stages. Maybe you want
to use the dummy in automated tests, and you set the time for each step to zero
milliseconds. Maybe you want to make a nice interactive demo of something, and
have more realistic timings. It's up to you.

These are the defaults:

```javascript
const yivi = new YiviCore({
  timing: {
    start: 1000,
    prepare: 1000,
    scan: 2000,
    pairing: 500,
    app: 2000
  }
});
```
