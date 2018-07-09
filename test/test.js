/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */


var oecloud = require('oe-cloud');
var loopback = require('loopback');

oecloud.observe('loaded', function (ctx, next) {
  oecloud.setBaseEntityAutoscope(["tenantId"]);
  oecloud.attachMixinsToBaseEntity("ModelPersonalizationMixin");
  oecloud.setModelDefinitionAutoscope(["tenantId"]);
  return next();
})

oecloud.addContextField('tenantId', {
  type: "string"
});

oecloud.boot(__dirname, function (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  var accessToken = loopback.findModel('AccessToken');
  accessToken.observe("before save", function (ctx, next) {
    var userModel = loopback.findModel("User");
    var instance = ctx.instance;
    userModel.find({ where: { id: instance.userId } }, {}, function (err, result) {
      if (err) {
        return next(err);
      }
      if (result.length != 1) {
        return next(new Error("No User Found"));
      }
      var user = result[0];
      if (user.username === "admin") {
        instance.tenantId = '/default';
      }
      else if (user.username === "evuser") {
        instance.tenantId = '/default/infosys/ev';
      }
      else if (user.username === "infyuser") {
        instance.tenantId = '/default/infosys';
      }
      else if (user.username === "bpouser") {
        instance.tenantId = '/default/infosys/bpo';
      }
      else if (user.username === "iciciuser") {
        instance.tenantId = '/default/icici';
      }
      else if (user.username === "citiuser") {
        instance.tenantId = '/default/citi';
      }
      return next(err);
    });
  });
  oecloud.start();
  oecloud.emit('test-start');
});



var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));

var expect = chai.expect;

var app = oecloud;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var Customer;
var api = defaults(supertest(app));
var basePath = app.get('restApiRoot');
var url = basePath + '/Employees';

var models = oecloud.models;



function deleteAllUsers(done) {
  var userModel = loopback.findModel("User");
  userModel.destroyAll({}, {}, function (err) {
    if (err) {
      return done(err);
    }
    userModel.find({}, {}, function (err2, r2) {
      if (err2) {
        return done(err2);
      }
      if (r2 && r2.length > 0) {
        return done(new Error("Error : users were not deleted"));
      }
    });
    return done(err);
  });
}

var globalCtx = {
  ignoreAutoScope: true,
  ctx: { tenantId : '/default'}
};

var iciciCtx = {
  ctx: { tenantId : '/default/icici'}
};

var citiCtx = {
  ctx: { tenantId: '/default/citi' }
};

var defaultContext = {
  ctx: { tenantId: '/default' }
};

function createEmployeeModels(done) {
  models.ModelDefinition.create({
    'name': 'Employee',
    'idInjection': false,
    'base': 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    'relations': {
      'address': {
        'type': 'hasMany',
        'model': 'EmployeeAddress',
        'foreignKey': 'EmployeeId'
      }
    },
    mongodb: {
      collection: 'employee'
    },
    'filebased': false,
    'acls': [{
      'principalType': 'ROLE',
      'principalId': '$everyone',
      'permission': 'ALLOW',
      'accessType': '*'
    }]
  }, globalCtx, function (err, model) {
    if (err) {
      return done(err);
    }
    models.ModelDefinition.create({
      name: 'EmployeeAddress',
      'idInjection': false,
      base: 'BaseEntity',
      properties: {
        'city': {
          'type': 'string',
          'required': true
        }
      },
      'relations': {},
      filebased: false
    }, globalCtx, function (err2, model2) {
      expect(err2).to.be.not.ok;
      done(err2);
    });
  });
}

describe(chalk.blue('Model Personalization Test Started'), function (done) {
  this.timeout(10000);
  before('wait for boot scripts to complete', function (done) {
    app.on('test-start', function () {
      Customer = loopback.findModel("Customer");
      deleteAllUsers(function () {
        createEmployeeModels(function (err, result) {
          console.log(err, result)
          return done();
        });
        //return done();
      });
    });
  });

  afterEach('destroy context', function (done) {
    done();
  });

  it('t1 create user admin/admin with /default tenant', function (done) {
    var url = basePath + '/users';
    api.set('Accept', 'application/json')
    .post(url)
    .send([{ username: "admin", password: "admin", email: "admin@admin.com" },
    { username: "evuser", password: "evuser", email: "evuser@evuser.com" },
    { username: "infyuser", password: "infyuser", email: "infyuser@infyuser.com" },
    { username: "bpouser", password: "bpouser", email: "bpouser@bpouser.com" },
    { username: "iciciuser", password: "iciciuser", email: "iciciuser@iciciuser.com" },
    { username: "citiuser", password: "citiuser", email: "citiuser@citiuser.com" }
    ])
    .end(function (err, response) {

      var result = response.body;
      expect(result[0].id).to.be.defined;
      expect(result[1].id).to.be.defined;
      expect(result[2].id).to.be.defined;
      expect(result[3].id).to.be.defined;
      expect(result[4].id).to.be.defined;
      expect(result[5].id).to.be.defined;
      done();
    });
  });

  var adminToken;
  it('t2 Login with admin credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "admin", password: "admin" })
    .end(function (err, response) {
      var result = response.body;
      adminToken = result.id;
      expect(adminToken).to.be.defined;
      done();
    });
  });


  var infyToken;
  it('t3 Login with infy credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "infyuser", password: "infyuser" })
    .end(function (err, response) {
      var result = response.body;
      infyToken = result.id;
      expect(infyToken).to.be.defined;
      done();
    });
  });

  var evToken;
  it('t4 Login with ev credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "evuser", password: "evuser" })
    .end(function (err, response) {
      var result = response.body;
      evToken = result.id;
      expect(evToken).to.be.defined;
      done();
    });
  });


  var bpoToken;
  it('t5 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "bpouser", password: "bpouser" })
    .end(function (err, response) {
      var result = response.body;
      bpoToken = result.id;
      expect(bpoToken).to.be.defined;
      done();
    });
  });


  var icicitoken;
  it('t5 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "iciciuser", password: "iciciuser" })
    .end(function (err, response) {
      var result = response.body;
      icicitoken = result.id;
      expect(bpoToken).to.be.defined;
      done();
    });
  });


  var cititoken;
  it('t5 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "citiuser", password: "citiuser" })
    .end(function (err, response) {
      var result = response.body;
      cititoken = result.id;
      expect(bpoToken).to.be.defined;
      done();
    });
  });

  it('t6 clean up Employee and EmployeeAddress models', function (done) {
    var Employee = loopback.getModel('Employee', defaultContext);
    Employee.destroyAll({}, { ignoreAutoScope: true }, function (err) {
      if (err)
        return done(err);
      var EmployeeAddress = loopback.getModel('EmployeeAddress', defaultContext);
      EmployeeAddress.destroyAll({}, { ignoreAutoScope: true }, function (err) {
        return done(err);
      });
    });
  });

  it('t7 Populate data as Icicic - 2 Employee record should be created and 2 address records each should be created', function (done) {
    var Employee = loopback.getModel('Employee', defaultContext);
    Employee.create([{
      'name': 'Tom',
      'id': 1,
      'address': [{
        'city': 'Denver',
        'id': 11
      }, {
        'id': 12,
        'city': 'Frankfort'
      }]
    }, {
      'name': 'Harry',
      'id': 2,
      'address': [{
        'city': 'London',
        'id': 21
      }, {
        'id': 22,
        'city': 'Paris'
      }]
    }], iciciCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0].__data).to.have.property('address');
      expect(results[0].name).to.equal('Tom');
      expect(results[0].__data.address[0]).to.have.property('city');
      expect(results[0].__data.address[0].city).to.equal('Denver');
      expect(results[0].__data.address[1].city).to.equal('Frankfort');
      expect(results[1]).to.have.property('name');
      expect(results[1]).to.have.property('id');
      expect(results[1].__data).to.have.property('address');
      expect(results[1].name).to.equal('Harry');
      expect(results[1].__data.address[0]).to.have.property('city');
      expect(results[1].__data.address[0].city).to.equal('London');
      expect(results[1].__data.address[1].city).to.equal('Paris');
      done();
    });
  });

  it('t8 Populate data as Citi - 1 Employee record should be created and 2 address records should be created', function (done) {
    var Employee = loopback.getModel('Employee', defaultContext);
    Employee.create([{
      'name': 'John',
      'id': 11,
      'address': [{
        'city': 'Mumbai',
        'id': 111
      }, {
        'id': 112,
        'city': 'Delhi'
      }]
    }
    ], citiCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0].__data).to.have.property('address');
      expect(results[0].name).to.equal('John');
      expect(results[0].__data.address[0]).to.have.property('city');
      expect(results[0].__data.address[0].city).to.equal('Mumbai');
      expect(results[0].__data.address[1].city).to.equal('Delhi');
      done();
    });
  });



  it('t9 - Fetch data as Citi - should return ONE Employees and two addresses for it', function (done) {
    var Employee = loopback.getModel('Employee', citiCtx);
    Employee.find({
      include: 'address'
    }, citiCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      //console.log(JSON.stringify(results));
      expect(results.length).to.equal(1);
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('address');
      expect(results[0].name).to.equal('John');
      expect(results[0].__data.address[0]).to.have.property('city');
      expect(results[0].__data.address[0].city).to.equal('Mumbai');

      done();
    });
  });


  it('t10 - Fetch data as Icici - should return TWO Employees and ONE addresses for each', function (done) {
    var Employee = loopback.getModel('Employee', iciciCtx);
    Employee.find({
      include: 'address'
    }, iciciCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      //console.log(JSON.stringify(results));
      expect(results.length).to.equal(2);
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('address');
      expect(results[0].name).to.equal('Tom');
      expect(results[0].__data.address[0]).to.have.property('city');
      expect(results[0].__data.address[0].city).to.equal('Denver');
      done();
    });
  });


  it('t11 - Personalized Employee model for icici', function (done) {
    // new Employee model will b created in mongo
    // mongo:true is set so that new collection will be used
    models.ModelDefinition.create({
      'name': 'Employee',
      'variantOf': 'Employee',
      'idInjection': false,
      'base': 'Employee',
      mongodb: {
        collection: 'employee-icici'
      },
      properties: {
        'age': {
          'type': 'number'
        }
      },
      'acl': []
    }, iciciCtx, function (err, m) {
      if (err) {
        console.log(err);
        return done(err);
      }
      var Employee = loopback.getModel('Employee', iciciCtx);
      Employee.create([{
        'name': 'Icici Tom',
        'age': 10,
        'id': 31,
        'address': [{
          'city': 'Bangalore',
          'id': 311
        }]
      }], iciciCtx, function (err, results) {
        if (err) {
          //console.log(JSON.stringify(err));
          return done(err);
        }

        expect(results.length).to.equal(1);
        expect(results[0]).to.have.property('name');
        expect(results[0]).to.have.property('id');
        expect(results[0].__data).to.have.property('address');
        expect(results[0].name).to.equal('Icici Tom');
        expect(results[0].__data.address[0]).to.have.property('city');
        expect(results[0].__data.address[0].city).to.equal('Bangalore');
        // previous records for icici are still retain  as new records are will use same collection
        // user can have new collection if he/she wants
        Employee.find({
          include: 'address'
        }, iciciCtx, function (err, results) {
          expect(results.length).to.equal(3);
          expect(results[0]).to.have.property('name');
          expect(results[0]).to.have.property('id');
          expect(results[0].__data).to.have.property('address');
          //expect(results[0]).to.have.property('age');
          var doneFlag = false;
          for (var i = 0; i < results.length && !doneFlag; ++i) {
            if (results[i].name === 'Icici Tom') {
              for (var j = 0; j < results[i].__data.address.length; ++j) {
                if (results[i].__data.address[j].city === 'Bangalore') {
                  expect(results[i].age).to.equal(10);
                  doneFlag = true;
                  break;
                }
              }
            }
          }
          expect(doneFlag).to.be.true;
          done();
        });
      });
    });
  });


  it('t12 - Address is not personalized and it should return 5 records for icici', function (done) {
    // two records from 1st testcase and other is just when we personalized
    var address = loopback.getModel('EmployeeAddress', iciciCtx);

    address.find({}, iciciCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      expect(results.length).to.equal(5);
      expect(results[0].city).to.equal('Denver');
      done();
    });
  });


  it('t13 - Fetch data as Citi - should still return ONE Employees and two addresses for it', function (done) {
    // demonstrating that for citi - nothing yet affected
    var Employee = loopback.getModel('Employee', citiCtx);
    Employee.find({
      include: 'address'
    }, citiCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      //console.log(JSON.stringify(results));
      expect(results.length).to.equal(1);
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('address');
      expect(results[0].name).to.equal('John');
      expect(results[0].__data.address[0]).to.have.property('city');
      expect(results[0].__data.address[0].city).to.equal('Mumbai');

      done();
    });
  });

  it('t14 - Personalized Address model for citi', function (done) {
    //EmployeeAddress model is personalized and new model with random number will be created
    //mongodb: true is set thus it will create new collection
    models.ModelDefinition.create({
      'name': 'EmployeeAddress',
      'variantOf': 'EmployeeAddress',
      'idInjection': false,
      'base': 'EmployeeAddress',
      mongodb: {
        collection: 'employeeaddress-citi'
      },
      properties: {
        'zip': {
          'type': 'string'
        }
      },
      'filebased': false
    }, citiCtx, function (err, m) {
      if (err) {
        console.log(err);
        return done(err);
      }
      var Employee = loopback.getModel('Employee', citiCtx);
      Employee.create([{
        'name': 'Citi Tom',
        'age': 10,
        'id': 51,
        'address': [{
          'city': 'Citi Bangalore',
          'zip': '560001',
          'id': 511
        }]
      }], citiCtx, function (err, results) {
        if (err) {
          console.log(JSON.stringify(err));
          return done(err);
        }
        // will see this new record of address is created in newly created address collection
        // while Employee will be in same old collection
        expect(results.length).to.equal(1);
        Employee.find({
          include: 'address'
        }, citiCtx, function (err, results) {
          expect(results.length).to.equal(2);
          var doneFlag = false;
          for (var i = 0; i < results.length && !doneFlag; ++i) {
            if (results[i].name === 'Citi Tom') {
              for (var j = 0; j < results[i].__data.address.length; ++j) {
                if (results[i].__data.address[j].city === 'Citi Bangalore') {
                  expect(results[i]).to.have.property('name');
                  expect(results[i]).to.have.property('id');
                  expect(results[i]).to.have.property('address');
                  expect(results[i].__data.address[j]).to.have.property('zip');
                  expect(results[i].name).to.equal('Citi Tom');
                  doneFlag = true;
                  break;
                }
              }
            }
          }
          expect(doneFlag).to.be.true;
          done();
        });
      });
    });
  });

  it('t14 - Personalized Address model for citi should return 1 record from personalized address model collection and 2 records from original address collection', function (done) {
    var address = loopback.getModel('EmployeeAddress', citiCtx);
    address.find({}, citiCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      expect(results.length).to.equal(3);
      var doneFlag = false;
      for (var i = 0; i < results.length; ++i) {
        if (results[i].city === 'Citi Bangalore') {
          doneFlag = true;
          break;
        }
      }
      expect(doneFlag).to.be.true;
      done();
    });
  });


  it('t15 - Personalized Employee model for citi using HTTP REST', function (done) {

    var Employeemodel = {
      'name': 'Employee',
      'variantOf': 'Employee',
      'idInjection': false,
      'mongodb': {},
      properties: {
        'firstName': {
          'type': 'string'
        }
      }
    };

    api
      .set('Accept', 'application/json')
      .post(basePath + '/ModelDefinitions' + '?access_token=' + cititoken)
      .send(Employeemodel)
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        //var results = res.body;
        done();
      });
  });

  it('t16 - Personalized Employee model for citi should return 0 record from personalized address model(using HTTP REST)', function (done) {
    api
      .set('Accept', 'application/json')
      .get(basePath + '/Employees?access_token=' + cititoken)
      .send()
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        var results = res.body;
        expect(results.length).to.equal(2);
        done();
      });
  });

  // following test cases shows that two different tenants creating model with same name
  // both can have different properties
  it('t17-1 - icici tenant is creating Model Pen where name is property (using HTTP REST)', function (done) {
    var penModel = {
      'name': 'Pen',
      properties: {
        'name': {
          'type': 'string',
          'require' : true
        }
      }
    };

    api
      .set('Accept', 'application/json')
      .post(basePath + '/ModelDefinitions' + '?access_token=' + icicitoken)
      .send(penModel)
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        //var results = res.body;
        done();
      });
  });

  it('t17-2 - citi tenant is creating Model Pen where color is property (using HTTP REST)', function (done) {
    var penModel = {
      'name': 'Pen',
      properties: {
        'color': {
          'type': 'string',
          'require': true
        }
      }
    };

    api
      .set('Accept', 'application/json')
      .post(basePath + '/ModelDefinitions' + '?access_token=' + cititoken)
      .send(penModel)
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        //var results = res.body;
        done();
      });
  });

  it('t18-1 - icici tenant is creating data in Pen Model(using HTTP REST)', function (done) {
    var penData = {
      'name': 'Reynolds'
    };

    api
      .set('Accept', 'application/json')
      .post(basePath + '/Pens' + '?access_token=' + icicitoken)
      .send(penData)
      .end(function (err, res) {
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        expect(res.status).to.be.equal(200);
        var result = res.body;
        expect(result.id).not.to.be.undefined;
        expect(result.name).to.be.equal('Reynolds');
        //var results = res.body;
        done();
      });
  });
  it('t18-2 - icici tenant is creating data in Pen Model with wrong column name(using HTTP REST)', function (done) {
    var penData = {
      'color': 'red'
    };

    api
      .set('Accept', 'application/json')
      .post(basePath + '/Pens' + '?access_token=' + icicitoken)
      .send(penData)
      .end(function (err, res) {
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        expect(res.status).to.be.equal(200);
        var result = res.body;
        expect(result.id).not.to.be.undefined;
        // as color was not inserted in for icici pen
        expect(result.color).to.be.undefined;
        done();
      });
  });

  it('t18-2 - citi tenant is creating data in Pen Model (using HTTP REST)', function (done) {
    var penData = {
      'color': 'red'
    };
    api
      .set('Accept', 'application/json')
      .post(basePath + '/Pens' + '?access_token=' + cititoken)
      .send(penData)
      .end(function (err, res) {
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        expect(res.status).to.be.equal(200);
        var result = res.body;
        expect(result.id).not.to.be.undefined;
        // as color was inserted in for citi pen
        expect(result.color).to.be.equal('red');
        done();
      });
  });

  it('t18-3 - icici tenant is accessing Pen Model data - it should recieve data of it\'s version of Pen model (using HTTP REST)', function (done) {
    api
      .set('Accept', 'application/json')
      .get(basePath + '/Pens' + '?access_token=' + icicitoken)
      .send()
      .end(function (err, res) {
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        expect(res.status).to.be.equal(200);
        var result = res.body;
        expect(result.length).be.equal(2);
        var foundpen = false;
        var foundempty=false;
        for (var i = 0; i < result.length; ++i) {
          if (!foundpen && result[i].name === 'Reynolds' && !result[i].color) {
            foundpen = true;
          }
          else if (!foundempty && result[i].id && !result[i].name) {
            foundempty=true;
          }
        }
        if (!foundempty || !foundpen) {
          return done(new Error("Didn't find Pen record for icici tenant"));
        }
        done();
      });
  });

  it('t18-3 - citi tenant is accessing Pen Model data - it should recieve data of it\'s version of Pen model (using HTTP REST)', function (done) {
    api
      .set('Accept', 'application/json')
      .get(basePath + '/Pens' + '?access_token=' + cititoken)
      .send()
      .end(function (err, res) {
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        expect(res.status).to.be.equal(200);
        var result = res.body;
        expect(result.length).be.equal(1);
        expect(result[0].color).to.equal('red');
        expect(result[0].name).to.be.undefined;
        done();
      });
  });


});



