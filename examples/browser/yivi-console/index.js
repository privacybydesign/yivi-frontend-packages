import { YiviCore } from '@privacybydesign/yivi-core';
import { YiviConsole } from '@privacybydesign/yivi-console/web';
import { YiviDummy } from '@privacybydesign/yivi-dummy';

const yivi = new YiviCore({
  debugging: true,
  dummy: 'happy path',
});

yivi.use(YiviConsole);
yivi.use(YiviDummy);

yivi
  .start()
  .then((result) => console.log('Successful disclosure!', JSON.stringify(result, null, 2)))
  .catch((error) => console.error("Couldn't do what you asked", error));
