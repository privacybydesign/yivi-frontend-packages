require('@privacybydesign/yivi-css');

const YiviCore = require('@privacybydesign/yivi-core');
const YiviWeb = require('@privacybydesign/yivi-web');
const YiviPopup = require('@privacybydesign/yivi-popup');
const YiviClient = require('@privacybydesign/yivi-client');

module.exports = {
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
