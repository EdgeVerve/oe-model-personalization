var wrapper = require('./lib/wrapper.js');
// const log = require('oe-logger')('oe-model-personalization');
module.exports = function (app) {
  wrapper(app);
  // log.info('Oe model-Personalization Loaded');
};
