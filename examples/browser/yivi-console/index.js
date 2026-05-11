import YiviCore from '@privacybydesign/yivi-core';
import Console from '@privacybydesign/yivi-console/web';
import Dummy from '@privacybydesign/yivi-dummy';

const yivi = new YiviCore({
  debugging: true,
  dummy: 'happy path',
});

yivi.use(Console);
yivi.use(Dummy);

yivi
  .start()
  .then((result) => console.log('Successful disclosure!', JSON.stringify(result, null, 2)))
  .catch((error) => console.error("Couldn't do what you asked", error));
