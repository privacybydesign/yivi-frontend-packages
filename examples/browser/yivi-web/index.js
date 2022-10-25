require('@privacybydesign/yivi-css');

const YiviCore = require('@privacybydesign/yivi-core');
const YiviWeb = require('@privacybydesign/yivi-web');
const Dummy = require('@privacybydesign/yivi-dummy');

const yivi = new YiviCore({
  debugging: true,
  dummy: 'happy path',
  element: '#yivi-web-form',
  language: 'en',
  translations: {
    header: 'Continue with <i class="yivi-web-logo">Yivi</i>',
    loading: 'Just one second please!',
  },
});

yivi.use(YiviWeb);
yivi.use(Dummy);

yivi
  .start()
  .then((result) => console.log('Successful disclosure! 🎉', result))
  .catch((error) => {
    if (error === 'Aborted') {
      console.log('We closed it ourselves, so no problem 😅');
      return;
    }
    console.error("Couldn't do what you asked 😢", error);
  });

document.getElementById('abort-button').addEventListener('click', () => {
  yivi.abort();
});
