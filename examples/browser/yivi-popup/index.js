import '@privacybydesign/yivi-css';

import YiviCore from '@privacybydesign/yivi-core';
import Popup from '@privacybydesign/yivi-popup';
import Dummy from '@privacybydesign/yivi-dummy';

document.getElementById('start-button').addEventListener('click', () => {
  const yivi = new YiviCore({
    debugging: true,
    dummy: 'happy path',
    language: 'en',
    translations: {
      header: 'Sign the agreement with <i class="yivi-web-logo">Yivi</i>',
      loading: 'Just one second please!',
    },
  });

  yivi.use(Popup);
  yivi.use(Dummy);

  yivi
    .start()
    .then((result) => console.log('Successful disclosure!', result))
    .catch((error) => console.error("Couldn't do what you asked", error));
});
