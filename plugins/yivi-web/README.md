# Yivi web

This plugin contains a front-end for Yivi flows in the web browser.

It is designed to be used with
[`yivi-css`](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/plugins/yivi-css). 
`yivi-css` is not a dependency of this package by design. This means that the CSS must be imported
separately. How to do this, you can check in the README of `yivi-css`. In this way you can also
adapt `yivi-css` to your own design and import this custom style instead.

If you *do* want to use `yivi-css` (which is recommended), you may also consider using
[the `yivi-frontend` package](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/yivi-frontend)
instead for ease of use, or take a look at
[the `yivi-web` example](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/examples/browser/yivi-web)
for a more hands-on implementation example.

## Usage

```javascript
const YiviCore = require('@privacybydesign/yivi-core');
const Web      = require('@privacybydesign/yivi-web');

require('@privacybydesign/yivi-css');

const yivi = new YiviCore({
  element: '#yivi-web-form'
});

yivi.use(Web);
yivi.start();
```

## Options

### element

The `element` option should contain a selector that points to an element in
which to render the Yivi form. This is a required option.

### language

You can set the interface language by setting the `language` option. Currently
supported values: `en` and `nl`. Default is `nl`.

### fallbackDelay

You can set the delay in milliseconds that should be waited before the helper
message is shown as fallback. This only involves the mobile flow on Android.
This delay is measured from the point that the user presses the button to open
the Yivi app. A recommended value here is to double the polling interval.
Default is `1000` ms.

### translations

If you have more specific translation requirements, or if your use-case is not
logging a user in, you can override any of the strings in the interface using
the `translations` option. It is good practice to be specific in these texts to
avoid unnecessary confusion for your users.

```javascript
const yivi = new YiviCore({
  translations: {
    header:  'Sign the agreement with <i class="yivi-web-logo">Yivi</i>',
    loading: 'Finding your agreement...'
  }
});
```

You can find the default values [in the translation files](https://github.com/privacybydesign/yivi-frontend-packages/tree/master/plugins/yivi-web/translations).

### showHelper

The option `showHelper` is a boolean that determines if the
[`yivi-css` helper](https://privacybydesign.github.io/yivi-frontend-packages/styleguide/section-examples.html#kssref-examples-helpers)
should be shown or not. Default is false.

_Note: the helper is also triggered during the mobile flow on Android. In that case, the helper
becomes visible when the user presses the button to open the Yivi app, and the app fails to open.
So, when `showHelper` is set to false, the helper is only visible as fallback and disappears
again as soon as the happy flow continues. When `showHelper` is set to true, the helper will
be visible unconditionally._
