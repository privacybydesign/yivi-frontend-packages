# Yivi css

This is a package that contains all the necessary CSS to make Yivi flows look
pretty and have a standardized look and feel. See
[the style guide](https://privacybydesign.github.io/yivi-frontend-packages/styleguide)
for visual examples and code snippets.

This package has been designed and tested to work with the browsers Chrome,
Firefox, Safari, Opera, Edge and IE11.

## Embedding in your application

This package only contains CSS. So basically you just include the CSS file(s)
and find the right HTML snippets [in the styleguide](https://privacybydesign.github.io/yivi-frontend-packages/styleguide/section-examples.html).
The modules based on `yivi-web` (so also `yivi-popup`) make use of these snippets.

### Import: the old fashioned way

There is a [normal version and a minified version](https://gitlab.science.ru.nl/yivi/github-mirrors/yivi-frontend-packages/-/jobs/artifacts/master/browse/yivi-css/dist?job=yivi-css)
of the styles that you can include in your project. The CSS can be linked into
your website the regular way. You have to host the CSS file yourself.

```html
<link rel="stylesheet" href="assets/yivi.css" />
```

### Import: the way the cool kids do it

Alternatively, you can install it as an npm package. This can be useful if you
want to use (parts of) the SCSS behind it and override some variables, if you
need to package it in some complicated way and if you want more control over
updates.

```bash
$ npm install yivi-css
```

You can then pull from the entire thing or just bits and pieces of it in your
SCSS/SASS files:

```scss
# The entire thing:
@import "~yivi-css";

# Or just bits and pieces of it:
@import "~yivi-css/src/components/yivi-form";
```

Or require the CSS in your javascript if you use a tool like Webpack:

```javascript
require('@privacybydesign/yivi-css');
```

## Contributing

### Compiling locally

Requires a working `git` and `npm` on your machine.

```bash
# Install dependencies
$ cd yivi-css
$ npm install

# Run the compiler & dev server
$ npm run dev
```

The style guide has been updated in the `docs/styleguide` directory in
the root of this project. To show the styleguide, the docs
directory can simply be hosted using an HTTP
server. You can use the [`irma` CLI tool](https://github.com/privacybydesign/irmago/releases/latest)
to do this.

```bash
irma server --static-path=../docs/styleguide
```

It will be available in your browser at http://localhost:8088.

Any change you make to the stylesheets will trigger a rebuild of the style guide
and will be shown after a browser refresh.

### Making PRs

Please only commit your changes to the SCSS files, not any of the generated
files:

```bash
$ git add yivi-css/src/
$ git commit -m "Update button shadows to reflect new design"
```
