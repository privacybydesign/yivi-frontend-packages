# Yivi popup

This plugin contains a popup for Yivi flows in the web browser. It is a pop-up
variant of the [`yivi-web` plugin](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/plugins/yivi-web).

Because this plugin is based on `yivi-web`, it is also designed to be used with
[`yivi-css`](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/plugins/yivi-css). 
`yivi-css` is not a dependency of this package by design. This means that the CSS must be imported
separately. How to do this, you can check in the README of `yivi-css`. In this way you can also
adapt `yivi-css` to your own design and import this custom style instead.

If you *do* want to use `yivi-css` (which is recommended), you may also consider using
[the `yivi-frontend` package](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/yivi-frontend)
instead for ease of use, or take a look at
[the `yivi-popup` example](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/examples/browser/yivi-web)
for a more hands-on implementation example.

## Usage

```javascript
const YiviCore = require('@privacybydesign/yivi-core');
const Popup    = require('@privacybydesign/yivi-popup');

require('@privacybydesign/yivi-css');

const yivi = new YiviCore(/* options */);
yivi.use(Popup);
yivi.start();
```

## Options

This plugin can handle all the options that the [`yivi-web` plugin](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/plugins/yivi-web#options)
accepts. It introduces one additional option:

### closePopupDelay
This option determines how long the popup will remain open, after a session has been
succeeded or got into some other irrecoverable end state, before it automatically closes.
In this way the user can see the animation that indicates the reason why the popup is closing.
The default is `2000` milliseconds.

## Extra behaviour
The `yivi-popup` plugin makes it possible for users to abort the session by closing
the popup. When using this plugin, the `start` method of `yivi-core` will
reject its promise in this scenario using the callback message `Aborted`.
