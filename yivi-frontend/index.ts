import '@privacybydesign/yivi-css';

import YiviCore from '@privacybydesign/yivi-core';
import YiviWeb from '@privacybydesign/yivi-web';
import YiviPopup from '@privacybydesign/yivi-popup';
import YiviClient from '@privacybydesign/yivi-client';

const YiviFrontend = {
  newWeb: (options) => {
    const core = new YiviCore(options);
    core.use(YiviWeb);
    core.use(YiviClient);
    return {
      start: core.start.bind(core),
      abort: core.abort.bind(core),
    };
  },

  newPopup: (options) => {
    const core = new YiviCore(options);
    core.use(YiviPopup);
    core.use(YiviClient);
    return {
      start: core.start.bind(core),
      abort: core.abort.bind(core),
    };
  },
};

export default YiviFrontend