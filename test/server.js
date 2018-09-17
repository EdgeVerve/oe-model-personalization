/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
var oecloud = require('oe-cloud');
var loopback=require('loopback');

oecloud.observe('loaded', function (ctx, next) {
  oecloud.setBaseEntityAutoscope(["tenantId"]);
  oecloud.attachMixinsToBaseEntity("ModelPersonalizationMixin");
  oecloud.setModelDefinitionAutoscope(["tenantId"]);
  return next();
})

oecloud.boot(__dirname, function (err) {
  oecloud.start();
  oecloud.emit('test-start');
});

