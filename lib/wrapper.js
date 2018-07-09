/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

const loopback = require('loopback');
const _ = require('lodash');
const utils = require('./utils');
var uuidv4 = require('uuid/v4');
const utils2 = require('oe-multi-tenancy/lib/utils.js');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;


function getAutoscopeOfModelDefinition(app) {
  var modelDefinition;
  modelDefinition = loopback.getModel('ModelDefinition');
  var autoscope = modelDefinition.definition.settings.autoscope || modelDefinition.definition.settings.autoScope;
  return autoscope;
}

var newProperties = {
  properties: {
    'clientModelName': {
      'type': 'string'
    },
    'clientPlural': {
      'type': 'string'
    },
    'modelId': {
      'type': 'string'
    },
    'autoscope': {
      'type': [
        'string'
      ]
    },
    'mongodb': {
      'type': 'object'
    },
    'variantOf': {
      'type': 'string'
    }
  },
  autoscope: [],
  mixins: {
    ModelPersonalizationMixin: true
  },
  upward: true,
  depth: '*'
};

module.exports = function (app) {
  app.addSettingsToModelDefinition(newProperties);
  app.setModelDefinitionAutoscope = function (autoscopeFields) {
    var obj = {
      autoscope: autoscopeFields
    };
    app.addSettingsToModelDefinition(obj);
  };

  const _findModel = loopback.findModel;
  const _getModel = loopback.getModel;
  loopback.findModel = function (modelName, options) {
    if (!options) {
      return _findModel.call(loopback, modelName);
    }
    var autoscope = getAutoscopeOfModelDefinition(app);
    var model = utils.getFromModelCache(autoscope, modelName, options);
    if (!model) {
      return _findModel.call(loopback, modelName);
    }
    return model;
  };

  loopback.getModel = function (modelName, options) {
    if (!options) {
      return _getModel.call(loopback, modelName);
    }
    var autoscope = getAutoscopeOfModelDefinition(app);
    var model = utils.getFromModelCache(autoscope, modelName, options);
    if (!model) {
      return _getModel.call(loopback, modelName);
    }
    return model;
  };

  const _createModel = loopback.createModel;
  loopback.createModel = function (instance, options) {
    var m = JSON.parse(JSON.stringify(instance.__data));
    m = _.pickBy(m);
    var context;
    if (!options) {
      context = instance._autoScope;
    } else {
      context = options.ctx || options;
    }

    var autoscopeFields = getAutoscopeOfModelDefinition(app);

    // if options still undefined, meaning it is regular model creation from boot
    // else it is created by oe-cloud framework
    if (context && !utils2.isDefaultContext(autoscopeFields, context) && !m.filebased) {
      m.name = m.modelId;
      m.filebased = false;
      // handling model relations - what if related model is personalized.
      if (m.relations) {
        Object.keys(m.relations).forEach(function (item) {
          var r = m.relations[item];
          r.clientModel = r.model;
          if (!app.models[r.clientModel]) {
            r.model = utils.createModelId(r.clientModel, autoscopeFields, context);
          }
        });
      }
      let typeList = ['string', 'String', 'number', 'Number', 'date', 'Date', 'DateString', 'boolean', 'Boolean', 'object', 'Object', 'email', 'Email', 'timestamp', 'Timestamp', 'buffer', 'GeoPoint', 'any', 'array', null];
      // handling property itself is another model
      if (m.properties) {
        Object.keys(m.properties).forEach(function (p) {
          if (typeList.indexOf(m.properties[p].type) === -1 && typeof (m.properties[p].type) === 'string') {
            var embeddedModelName = m.properties[p].type;
            if (app.models[embeddedModelName]) {
              m.properties[p].type = utils.createModelId(m.properties[p].type, autoscopeFields, context);
            }
          } else if (typeList.indexOf(m.properties[p].type) === -1 && Array.isArray(m.properties[p].type)) {
            var embeddedType = m.properties[p].type[0];
            if (typeList.indexOf(embeddedType) === -1 && app.models[embeddedType]) {
              m.properties[p].type[0] = utils.createModelId(m.properties[p].type[0], autoscopeFields, context);
            }
          }
        });
      }
    }
    var model;
    if (!m.filebased) {
      model = _createModel.call(this, m);
    } else {
      model = loopback.findModel(m.name);
    }
    model.updateId = uuidv4();
    model.variantOf = m.variantOf;
    model.clientPlural = m.clientPlural || m.plural;
    model.clientModelName = m.clientModelName || m.name;
    model.settings = model.settings || {};
    model.settings._dynamicModel = true;
    utils.addToModelCache(autoscopeFields, model.clientModelName, context, model);
    return model;
  };


  function callRealFn(fn, self, args, optionsIndex) {
    var fnLen = optionsIndex + 2;
    if (!self.definition.settings.mixins || !self.definition.settings.mixins.ModelPersonalizationMixin || (self.definition.settings.overridingMixins && self.settings.overridingMixins.ModelPersonalizationMixin)) {return fn.apply(self, args);}
    if ((args[optionsIndex] && typeof args[optionsIndex] === 'object' && args[optionsIndex].skipModelPersonalization === true) || (args.length > fnLen && args[args.length - 1] === true)) {
      return fn.apply(self, args);
    }
    var self2 = loopback.findModel(self.clientModelName || self.modelName, args[optionsIndex]);
    return fn.apply(self2, [].slice.call(args));
  }

  // this function is called for PUT by ID request
  const _replaceById = DataAccessObject.replaceById;
  DataAccessObject.replaceById = function replaceById(id, data, options, cb) {
    return callRealFn(_replaceById, this, arguments, 2);
  };

  const _replaceOrCreate = DataAccessObject.replaceOrCreate;
  DataAccessObject.replaceOrCreate = function replaceOrCreate(data, options, cb) {
    return callRealFn(_replaceOrCreate, this, arguments, 1);
  };

  const _findOrCreate = DataAccessObject.findOrCreate;
  DataAccessObject.findOrCreate = function findOrCreate(query, data, options, cb) {
    return callRealFn(_findOrCreate, this, arguments, 2);
  };


  const _exists = DataAccessObject.exists;
  DataAccessObject.exists = function exists(id, options, cb) {
    return callRealFn(_exists, this, arguments, 1);
  };

  const _count = DataAccessObject.count;
  DataAccessObject.count = function count(where, options, cb) {
    return callRealFn(_count, this, arguments, 1);
  };

  const _destroyAll = DataAccessObject.destroyAll;
  DataAccessObject.remove =
  DataAccessObject.deleteAll =
  DataAccessObject.destroyAll = function destroyAll(where, options, cb) {
    return callRealFn(_destroyAll, this, arguments, 1);
  };

  var _updateAll = DataAccessObject.updateAll;
  DataAccessObject.update =
  DataAccessObject.updateAll = function updateAll(where, data, options, cb) {
    return callRealFn(_updateAll, this, arguments, 2);
  };

  const _removeById = DataAccessObject.removeById;
  DataAccessObject.removeById =
  DataAccessObject.destroyById =
  DataAccessObject.deleteById = function removeById(where, options, cb) {
    return callRealFn(_removeById, this, arguments, 1);
  };

  const _find = DataAccessObject.find;
  DataAccessObject.find = function find(where, options, cb) {
    callRealFn(_find, this, arguments, 1);
  };

  const _create = DataAccessObject.create;
  DataAccessObject.create = function create(data, options, cb) {
    return callRealFn(_create, this, arguments, 1);
  };

  const _updateOrCreate = DataAccessObject.updateOrCreate;
  DataAccessObject.updateOrCreate =
  DataAccessObject.patchOrCreate =
  DataAccessObject.upsert = function updateOrCreate(data, options, cb) {
    return callRealFn(_updateOrCreate, this, arguments, 1);
  };

  const _updateWithWhere = DataAccessObject.upsertWithWhere;
  DataAccessObject.patchOrCreateWithWhere =
  DataAccessObject.upsertWithWhere = function upsertWithWhere(where, data, options, cb) {
    return callRealFn(_updateWithWhere, this, arguments, 2);
  };
};

// const utils = require('./utils');
// utils.addToModelCache(["tenantId", "region"], "Customer", { tenantId: "/default", region: "/default" }, { modelName: "Customer" });
// utils.addToModelCache(["tenantId", "region"], "Customer", { tenantId: "/default/t1", region: "/default" }, { modelName: "Customer-t1" });
// //utils.addToCache(["tenantId", "region"], "Customer", { tenantId: "/default/t1/t2", region: "/default" }, { modelName: "Customer-t1-t2" });
// utils.addToModelCache(["tenantId", "region"], "Customer", { tenantId: "/default/t1/t2", region: "/default/r1/r2" }, { modelName: "Customer-t1-t2-r1-r2" });
// utils.addToModelCache(["tenantId", "region"], "Customer", { tenantId: "/default/t1/t2/t3", region: "/default/r1/r2/r3" }, { modelName: "Customer-t1-t2-t3-r1-r2-r3" });
// utils.addToModelCache(["tenantId", "region"], "Customer", { tenantId: "/default", region: "/default/r1/r2" }, { modelName: "Customer-r1-r2" });

// console.log(utils.getFromModelCache(["tenantId", "region"], "Customer", { tenantId: "/default", region: "/default" }));
// console.log(utils.getFromModelCache(["tenantId", "region"], "Customer", { tenantId: "/default/t1", region: "/default" }));
// console.log(utils.getFromModelCache(["tenantId", "region"], "Customer", { tenantId: "/default/t1/t2", region: "/default" }));
// console.log(utils.getFromModelCache(["tenantId", "region"], "Customer", { tenantId: "/default/t1/t2", region: "/default/r1/r2" }));
// console.log(utils.getFromModelCache(["tenantId", "region"], "Customer", { tenantId: "/default/t1/t2/t3", region: "/default" }));
// console.log(utils.getFromModelCache(["tenantId", "region"], "Customer", { tenantId: "/default", region: "/default/r1/r2" }));


