import YiviCore from '@privacybydesign/yivi-core';
import Console from '@privacybydesign/yivi-console/node';
import Client from '@privacybydesign/yivi-client';

import { inspect } from 'util';

const yivi = new YiviCore({
  debugging: true,

  session: {
    // Point this to your Yivi server:
    url: 'http://localhost:8088',

    // Define your disclosure request:
    start: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        '@context': 'https://irma.app/ld/request/disclosure/v2',
        disclose: [[['pbdf.pbdf.email.email'], ['pbdf.sidn-pbdf.email.email']]],
      }),
    },
  },
});

yivi.use(Console);
yivi.use(Client);

yivi
  .start()
  .then((result) =>
    console.log('Successful disclosure!', inspect(result, { showHidden: false, depth: null, colors: true })),
  )
  .catch((error) => console.error("Couldn't do what you asked", error));
