require('../../../src/inboxsdk-js/loading/platform-implementation-loader')
  ._loadScript =
    require('../../../src/inboxsdk-js/loading/load-platform-implementation-DEV')(0);

module.exports = require('../../../src/inboxsdk-js/inboxsdk.js');
