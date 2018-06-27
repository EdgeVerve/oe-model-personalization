var oecloud = require('oe-cloud');
var loopback=require('loopback');

oecloud.observe('loaded', function (ctx, next) {
  oecloud.setModelDefinitionAutoscope(["tenantId"]);
  return next();
})

oecloud.boot(__dirname, function (err) {
  oecloud.start();
  oecloud.emit('test-start');
});

