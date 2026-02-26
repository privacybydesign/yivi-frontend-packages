import YiviCore from '@privacybydesign/yivi-core';
import Console from '@privacybydesign/yivi-console/node';
import Dummy from '@privacybydesign/yivi-dummy';

import { inspect } from 'util';

const yivi = new YiviCore({
  debugging: true,
  dummy: 'happy path',
});

yivi.use(Console);
yivi.use(Dummy);

yivi
  .start()
  .then((result) =>
    console.log('Successful disclosure!', inspect(result, { showHidden: false, depth: null, colors: true })),
  )
  .catch((error) => console.error("Couldn't do what you asked", error));
