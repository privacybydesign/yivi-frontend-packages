const YiviCore = require('@privacybydesign/yivi-core');
const Console = require('@privacybydesign/yivi-console');
const Dummy = require('@privacybydesign/yivi-dummy');

const util = require('util');

const yivi = new YiviCore({
  debugging: true,
  dummy: 'happy path',
});

yivi.use(Console);
yivi.use(Dummy);

yivi
  .start()
  .then((result) =>
    console.log('Successful disclosure! 🎉', util.inspect(result, { showHidden: false, depth: null, colors: true })),
  )
  .catch((error) => console.error("Couldn't do what you asked 😢", error));
