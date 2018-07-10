/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var wrapper = require('./lib/wrapper.js');
// const log = require('oe-logger')('oe-model-personalization');
module.exports = function (app) {
  wrapper(app);
  // log.info('Oe model-Personalization Loaded');
};
