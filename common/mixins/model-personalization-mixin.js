/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
const inflection = require('inflection');
const utils = require('../../lib/utils.js');
const utils2 = require('oe-multi-tenancy/lib/utils.js');
const loopback = require('loopback');
const _ = require('lodash');
const log = require('oe-logger')('Model-Personalization-Mixin');

// var ModelDefinition;
log.info('Model Personalization Mixin Loaded.');

module.exports = Model => {
  // ModelDefinition = Model;

  if (Model.modelName !== 'ModelDefinition') {
    if (Model.modelName === 'BaseEntity') {
      Model.evObserve('after access', getVariantData);
    }
    return;
  }

  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.ModelPersonalizationMixin) || !Model.definition.settings.mixins.ModelPersonalizationMixin) {
    Model.evRemoveObserver('before save', beforeSave);
  } else {
    Model.evObserve('before save', beforeSave);
  }
};

/**
 * This function is used to find whether whether variant model use same collection.
 *
 * @param {object}settings1 - settings of first model
 * @param {object}settings2 - settings of second model
 * @returns {boolean} - returns true for same collection.
 * @function
 */
const isSameCollection = function isSameCollection(settings1, settings2) {
  if (!settings1.mongodb || !settings2.mongodb) {
    return false;
  }
  var collection1 = settings1.mongodb.collection;
  if (collection1) { collection1 = collection1.toLowerCase(); }
  var collection2 = settings2.mongodb.collection;
  if (collection2) { collection2 = collection2.toLowerCase(); }
  if (collection1 === collection2) { return true; }
  return false;
};

function getVariantData(ctx, next) {
  var Model = ctx.Model;

  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.ModelPersonalizationMixin) || !Model.definition.settings.mixins.ModelPersonalizationMixin) {
    return next();
  }

  let result = ctx.accdata || [];
  const modelSettings = ctx.Model.definition.settings;
  if (!modelSettings.variantOf) {
    return next();
  }
  var variantModel = loopback.findModel(modelSettings.variantOf);
  if (!variantModel) {
    return next();
  }


  var ds1 = ctx.Model.getDataSource(ctx.options);
  var ds2 = variantModel.getDataSource(ctx.options);

  if (ds1 === ds2 && (ds1.connector.name.indexOf('mongodb') >= 0 || ds1.connector.name.indexOf('memory') >= 0)) {
    if (isSameCollection(variantModel.definition.settings, modelSettings)) {
      return next();
    }
  }
  if (ctx.query && ctx.query.include) {
    if (_.isEmpty(variantModel.relations)) {
      log.warn(ctx.options, "Model %s didn't have any relation defined", variantModel.modelName);
      return next();
    }
    if (Array.isArray(ctx.query.include)) {
      for (var i = 0; i < ctx.query.include.length; ++i) {
        if (!variantModel.relations[ctx.query.include][i]) {
          log.warn(ctx.options, "Model %s didn't have relation with name %s", variantModel.modelName, ctx.query.include[i]);
          return next();
        }
      }
    } else if (typeof ctx.query.include === 'string') {
      if (!variantModel.relations[ctx.query.include]) {
        log.warn(ctx.options, "Model %s didn't have relation with name %s", variantModel.modelName, ctx.query.include[i]);
        return next();
      }
    }
  }

  variantModel.find(ctx.query, ctx.options, function (err, variantData) {
    if (err) {
      return next(err);
    }
    if (variantData && variantData.length) {
      result = result.concat(variantData);
      ctx.accdata = result;
    }
    return next();
  }, true);
}


function beforeSave(ctx, next) {
  const modelSettings = ctx.Model.definition.settings;
  if (modelSettings.mixins.ModelPersonalizationMixin === false) {
    return next();
  }
  try {
    var instance = ctx.instance || ctx.currentInstance || ctx.data;
    instance.clientModelName = instance.variantOf || instance.name;

    var autoscopeFields = modelSettings.autoscope;
    var options = ctx.options;
    if (!options || !options.ctx || _.isEmpty(options.ctx) && (ctx.options.ignoreAutoScope || ctx.options.fetchAllScopes)) {
      options = { ctx: instance._autoScope };
      if (!options.ctx || _.isEmpty(options.ctx)) {
        if (!instance.filebased) {
          return next(new Error('Invalid instance of Model Definition. Context not found.'));
        }
        options = { ctx: utils2.getDefaultContext(autoscopeFields) };
      }
    }
    var modelId;
    var defaultScoped = utils2.isDefaultContext(autoscopeFields, options.ctx);
    if (instance.filebased || defaultScoped) {
      modelId = instance.name;
      defaultScoped = true;
    } else {
      modelId = utils.createModelId(instance.clientModelName, autoscopeFields, options);
    }

    if (instance.variantOf) {
      instance.base = instance.variantOf;
    }

    if (!instance.filebased && !defaultScoped) {
      if (!instance.base) {
        instance.base = 'BaseEntity';
      }
      if (!instance.plural) {
        instance.plural = inflection.pluralize(instance.name);
        log.debug(options, 'Created plural ', instance.plural, 'for model', instance.name);
      }
      if (instance.variantOf) {
        var variantModel = loopback.findModel(instance.variantOf, options);
        if (variantModel.definition.settings.mongodb && variantModel.definition.settings.mongodb.collection) {
          instance.mongodb = variantModel.definition.settings.mongodb;
        }
        if (!instance.mongodb) {
          instance.mongodb = {
            collection: instance.variantOf
          };
        }
      }
      if (!instance.mongodb) {
        instance.mongodb = {
          collection: instance.name
        };
      }
    }
    instance.clientPlural = instance.plural;
    if (!instance.filebased && !defaultScoped) {
      delete instance.plural;
    }
    instance.modelId = modelId;
  } catch (exp) {
    return next(exp);
  }

  return next();
}


