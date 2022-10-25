# Yivi frontend

This is a thin wrapper around `yivi-core`, `yivi-web`, `yivi-popup`,
`yivi-client` and `yivi-css`. The intended use of this package is to provide
an all-in-one Javascript file that developers can include to get started:

```html
<script src="assets/yivi.js" type="text/javascript"></script>
```

or as JavaScript import:
```javascript
const yivi = require('@privacybydesign/yivi-frontend');
```

## Documentation
More documentation on how to use this module can be found in the
[Yivi documentation](https://irma.app/docs/irma-frontend/#irma-frontend).

## Usage
When you want to use an embedded web element,
then you can instantiate `yivi-frontend` like so:

```javascript
const example = yivi.newWeb({
  debugging: false,            // Enable to get helpful output in the browser console
  element:   '#yivi-web-form', // Which DOM element to render to

  // Back-end options
  session: {
    // Configure your flow here, see code examples in root README file
  },

  ...
});
```

When you want to use a popup overlay that renders on top of the content of
your website, then you can instantiate `yivi-frontend` like so:

```javascript
const example = yivi.newPopup({
  debugging: false, // Enable to get helpful output in the browser console

  // Back-end options
  session: {
    // Configure your flow here, see code examples in root README file
  },

  ...
});
```

Finally, you can start your Yivi flow:

```javascript
example.start()
.then(result => console.log("Successful disclosure! 🎉", result))
.catch(error => console.error("Couldn't do what you asked 😢", error));
```

Be aware that you can start an instance of `yivi-core` only once.
When you want to call `start()` again, you have to create a new instance.

## Download
A bundled JavaScript file can be found [here](https://gitlab.science.ru.nl/irma/github-mirrors/irma-frontend-packages/-/jobs/artifacts/master/browse/irma-frontend/dist?job=irma-frontend).
Please download this file and host it yourself. Versions can change and we do not want to break your website.

## Development
You can link local versions of modules easily using `npm link`. There is
an explanation about how to use `npm link` in the README of the
[`yivi-frontend-packages` root directory](https://github.com/privacybydesign/yivi-frontend-packages).

