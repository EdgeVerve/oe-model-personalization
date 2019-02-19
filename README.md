# oe-model-personalization

- [Introduction](#introduction)
- [Dependency on oe-multi-tenancy](#dependency-on-oe-multi-tenancy)
- [Facts of model personalization](#facts-of-model-personalization)
- [Getting Started](#getting-started)
  * [Dependency](#dependency)
  * [Testing and Code coverage](#testing-and-code-coverage)
  * [Installation](#installation)
    + [Attaching to Application](#attaching-to-application)
    + [Enabling or Disabling](#enabling-or-disabling)
- [Design](#design)
  * [ModelDefinition](#modeldefinition)
  * [findModel and getModel](#findmodel-and-getmodel)
  * [createModel](#createmodel)
  * [Memory Store](#memory-store)
  * [Wrapper](#wrapper)
- [API Documentation](#api-documentation)
  * [app.setModelDefinitionAutoscope](#appsetmodeldefinitionautoscope)
- [Tutorial](#tutorial)

# Introduction


In multi tenant application, where same application being shared by multiple tenants, there can be need where model requirements of tenant can be differed. For example, consider model **Employee**. Application is being used by several customers(tenants) across globe. US customer wants to add field like **ssn** to employee model. However, this field should not be visible to other tenant. It may happen that user wants to add several fields to the model to accommodate requirements. At that time, model personalization comes into picture. In above scenario, US Customer may personalized the Employee Model. Therefore, whenever US Customer access the model, framework ensures that, he gets only his **version** of model. And it also ensures that other tenant will not get US Customer's version of Employee model.

# Dependency on oe-multi-tenancy

This module is highly dependent on oe-multi-tenancy module. Therefore all documentation of oe-multi-tenancy is applicable for this module as well.

# Facts of model personalization

* It works only on autoscope fields.
* ModelDefinition Model must have oe-multi-tenancy mixin enabled. This is automatically done by this module
* Autoscope fields must be set for ModelDefinition.
* It keeps model hierarchy in memory for quicker access to decide to which model API should be redirected to.
* It can use same collection for **ONLY FOR** MongoDB and Memory DB
* For SQL Databases, it will create new table when Model is personalized
* Since datasource and collection can be different for Personalized model to that of regular model, data of both is retrieve separately and assembled and given to the caller.
* Since is is loading data from multiple tables or collection potentially across database, transaction management can be done ONLY with utmost care and it can be successful ONLY when all underlying tables exists in same transactional database.



# Getting Started

In this section, we will see how we can use install this module in our project. To use this feature in project from this module, you must install this module.


## Dependency
* oe-logger
* oe-cloud
* oe-multi-tenancy

## Testing and Code coverage

```sh
$ git clone http://evgit/oecloud.io/oe-model-personalization.git
$ cd oe-model-personalization
$ npm install --no-optional
$ npm run grunt-cover
```

you should see coverage report in coverage folder.


## Installation

To use oe-model-personalization in your project, you must include this package into your package.json as shown below. So when you do **npm install** this package will be made available. Please ensure the source of this package is right and updated. For now we will be using **evgit** as source. Also, please note that, to use this module, you project must be **oeCloud** based project.


```javascript
"oe-model-personalization": "git+http://evgit/oecloud.io/oe-model-personalization.git#master"
```

You can also install this mixin on command line using npm install.


```sh
$ npm install <git path oe-model-personalization> --no-optional
```


### Attaching to Application

Once you have included into package.json, this module will get installed as part of npm install. However you need to load this module. For that you need to create entry in **app-list.json** file of application.

app-list.json

```javascript

  {
    "path": "oe-multi-tenancy",
    "enabled": true
  },
  ...
  {
    "path": "oe-model-personalization",
    "enabled": true
  }
```

As shown above, oe-multi-tenancy must be enabled.

### Enabling or Disabling

There is some control given to enable or disable this functionality.
This module when loaded, it will attach functionality (mixin) on BaseEntity model. Therefore, by default, all models derived from BaseEntity will be affected when you include this module.
If you want to make this module work with specific Models, you need to change the way it is loaded. For that use following entry in your app-list.json


```javascript

  {
    "path": "oe-model-personalization",
    "ModelPersonalizationMixin" : false,
    "enabled": true
  }
```

And then you will have to enable the mixin explicitely on those model which require multi tenancy by adding following in Model's JSON (definition).


```javascript
"mixins" : {
    "ModelPersonalizationMixin" : true
}

```

# Design

## ModelDefinition

Model Personalization module uses oe-multi-tenancy module to achieve multi tenancy for ModelDefinition. **ModelDefinition** model is core of this module. ModelDefinition model is defined in oe-cloud project. This model is used to store all models and its schema. This way, any models which are dynamically created can be persisted and be loaded again when application starts.

oe-model-personalization module actually make this model as multi-tenant model by applying oe-multi-tenancy. Therefore, when user queries this model, data is returned based on his/her context. All models are **default** tenant based and hence by default, all users can see all the models.

But when model is personalized by specific tenant, then new entry gets created in ModelDefinition model tagged with specific tenant context. And hence if user belongs to other tenant queries ModelDefinition, that user will not able to see personalized model.

## findModel and getModel

These two functions are defined and overriden in this module - originally these functions were implemented in loopback. These two functions takes additional parameter **options**. **options** typically contains context, which in turn can be used by these functions to return actual model based on context. Therefore, whenever programmer makes call to findModel(), he/she must send context to these functions otherwise model with default context will be returned. This is exactly same way, programmer calls model.find(), model.crate() functions.

## createModel

This function is overridden - which was again originally implemented in loopback. This function changes internal model name based on context.

## Memory Store

Internal memory structure is maintains memory store in which all models and contexts are stored along with internal model name and user's model name. This is used so that everytime when application is calling findModel/getModel, it doesn't need to go to ModelDefinition. This is different implementation than 1.x version of oeCloud.

## Wrapper

All functions of DataAccessObject is overridden. That is, model.create(), model.find() etc are overriden. Each function makes internal call to findModel to get real model based on context and diver call to probable personalized model. Therefore, middle-ware to change URL to divert call to potential personalized model is not required. That was implemented in oecloud 1.x version.

# API Documentation

## app.setModelDefinitionAutoscope

This function can be used to explicitly set autoscope for model definition. Remember that multi-tenancy can be applied only to ModelDefinition model and in theory, you can only have model personalization without typical multi tenancy.

```javascript
oecloud.observe('loaded', function (ctx, next) {
  oecloud.setBaseEntityAutoscope(["tenantId"]);
  oecloud.attachMixinsToBaseEntity("ModelPersonalizationMixin");
  oecloud.setModelDefinitionAutoscope(["tenantId"]);
  return next();
})
```

# Tutorial

Follow test case


