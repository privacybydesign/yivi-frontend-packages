require('@privacybydesign/yivi-css');

const YiviCore = require('@privacybydesign/yivi-core');
const YiviWeb = require('@privacybydesign/yivi-web');
const Dummy = require('@privacybydesign/yivi-dummy');

const yivi = new YiviCore({
  debugging: true,
  dummy: 'happy path',
  element: '#yivi-qr',
  language: 'en',
  minimal: true,
  // Simulates a realistic Yivi session pointer payload
  qrPayload: {
    u: 'https://irma.example.com/irma/session/xJ3Fk9Rq7mNpLwB2vT8cYdGhKjWnZqAs',
    irmaqr: 'disclosing',
    continueOnSecondDevice: true,
    frontendRequest: { authorization: 'qGx9f3Lk2mNpRwYz' },
  },
});

yivi.use(YiviWeb);
yivi.use(Dummy);

yivi
  .start()
  .then((result) => console.log('Successful disclosure!', result))
  .catch((error) => {
    if (error === 'Aborted') {
      console.log('We closed it ourselves, so no problem');
      return;
    }
    console.error("Couldn't do what you asked", error);
  });
