import '../yivi-css';

import YiviCore from '../yivi-core';
import YiviWeb from '../plugins/yivi-web';
import YiviPopup from '../plugins/yivi-popup';
import YiviClient from '../plugins/yivi-client';

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