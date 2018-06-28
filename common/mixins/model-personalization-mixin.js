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

  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.ModelPersonalizationMixin) || !Model.definition.settings.mixins.ModelPersonalizationMixin) {
    Model.evRemoveObserver('before save', beforeSave);
  } else {
    Model.evObserve('before save', beforeSave);
  }
};

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


