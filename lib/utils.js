/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

function _checkModelWithPlural(server, plural) {
  var models = server.models();
  var res = models.find(function (ele) {
    return (ele.clientPlural && ele.clientPlural === plural) || ele.pluralModelName === plural;
  });
  return res ? res.clientPlural ? res.clientModelName : res.modelName : null;
}


function _isDefaultScope(autoscopeFields, ctx) {
  for (var i = 0; i < autoscopeFields.length; ++i) {
    if (ctx[autoscopeFields[i]] !== '/default') {
      return false;
    }
  }
  return true;
}

function getDefaultContext(autoscope) {
  var ctx = {};
  autoscope.forEach(function (item) {
    ctx[item] = '/default';
  });
  return ctx;
}

var modelCache = {};

function findMatching(baseModel, autoscope, context) {
  var contextScope = context[autoscope];
  var currentModel = baseModel;

  var temp = contextScope.split('/');
  var len = temp.length;

  for (var j = 0; j < len - 1; ++j) {
    var scope = temp.join('/');
    if (currentModel[autoscope + ':' + scope]) {
      return currentModel[autoscope + ':' + scope];
    }
    temp.pop();
  }
  return null;
}


function _getFromModelCache(autoscopeFields, modelName, options) {
  var context;
  if (!options) {
    context = getDefaultContext(autoscopeFields);
  }
  else {
    context = options.ctx || options;
  }
  console.log(context);

  var currentModel = modelCache[modelName];
  for (var i = autoscopeFields.length - 1; i >= 0; --i) {
    var currentScope = autoscopeFields[i];
    // var contextScope = context[currentScope];
    var matchedModel = findMatching(currentModel, currentScope, context);
    if (matchedModel) {
      currentModel = matchedModel;
    } else {
      return modelCache[modelName];
    }
  }
  return currentModel;
}


function _addToModelCache(autoscopeFields, modelName, options, model) {
  var context;
  if (!options) {
    context = getDefaultContext(autoscopeFields);
  }
  else {
    context = options.ctx || options;
  }
  var baseModel = modelCache[modelName];
  if (!baseModel) {
    modelCache[modelName] = {model};
    baseModel = modelCache[modelName];
  }
  var currentModel = baseModel;
  if (!context) {
    context = getDefaultContext(autoscopeFields);
  }

  for (var i = autoscopeFields.length - 1; i >= 0; --i) {
    var currentScope = autoscopeFields[i];
    var contextScope = context[currentScope];
    if (!currentModel[currentScope + ':' + contextScope]) {
      currentModel[currentScope + ':' + contextScope] = {};
    }
    currentModel = currentModel[currentScope + ':' + contextScope];
  }
  currentModel.model = model;
  return currentModel;
}


function _createModelId(modelName, autoscope, options) {
  var a = [modelName];
  for (var i = 0; i < autoscope.length; ++i) {
    var ctxVal = '';
    if (!options || !options.ctx) {
      ctxVal = 'default';
    } else {
      var context = options.ctx || options;
      ctxVal = context[autoscope[i]];
    }
    ctxVal = ctxVal.replace('/', '_');
    a.push(ctxVal);
  }
  return a.join('_');
}

// function _createModel(app, instance, options, cb) {

//  var modelDefinition = loopback.getModel('ModelDefinition', options);
//  var autoscopeFields = modelDefinition.definition.settings.autoscope;

//  var model = loopback.createModel(jsonifyModel, options);

//  var ds = model.getDataSource(options);
//  if (ds) {
//    // Mixins get attached at this step
//    ds.attach(model);
//  } else {
//    ds = jsonifyModel.datasource ? app.dataSources[jsonifyModel.datasource] : app.dataSources.db;
//    ds.attach(model);
//  }
//  app.model(model);
//  log.debug(options, 'DEBUG: lib/common/util.js: Model loaded from database : ', instance.name);
// }


// function getModel(autoscope, baseModelName, context, model) {

//  var baseModel = modelCache[baseModelName];
//  if (!baseModel) {
//    assert(baseModel === model.modelName)
//    modelCache[baseModelName] = { model: model };
//    return;
//  }

//  var currentModel = baseModel;
//  for (var i = 0; i < autoscope.length; ++i) {
//    var currentScope = autoscope[i];
//    var contextScope = context[currentScope];
//    var matchedModel = findMatching(currentModel, currentScope, context);
//    if (matchedModel) {
//      currentModel = matchedModel;
//    }
//  }
//  return currentModel.model;
// }


// function _getPersonalizedModel(modelName, ctx) {
//  let modelDefinition;

//  if (modelName === 'ModelDefinition') {
//    modelDefinition = loopback.getModel('ModelDefinition');
//  } else {
//    modelDefinition = loopback.getModel('ModelDefinition', { ctx: ctx });
//  }
//  const autoscopeFields = modelDefinition.definition.settings.autoscope;
//  const ctxStr = util.createContextString(autoscopeFields, ctx);
//  const model = app.personalizedModels[modelName] && app.personalizedModels[modelName][ctxStr] ? app.personalizedModels[modelName][ctxStr] : null;
//  if (model) {
//    return model;
//  }


//  return getDefaultPersonalizedModels(modelName, autoscopeFields, ctx);

// }


// module.exports.checkModelWithPlural = _checkModelWithPlural;

module.exports.addToModelCache = _addToModelCache;
module.exports.getFromModelCache = _getFromModelCache;
module.exports.createModelId = _createModelId;
module.exports.isDefaultScope = _isDefaultScope;
module.exports.checkModelWithPlural = _checkModelWithPlural;
