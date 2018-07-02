var oecloud = require('oe-cloud');
var loopback=require('loopback');
oecloud.observe('loaded', function (ctx, next) {
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
var url = basePath + '/Customers';

var models = oecloud.models;



function deleteAllUsers(done) {
  var userModel = loopback.findModel("User");
  userModel.destroyAll({}, {}, function (err, results) {
    console.log(results);
    return done(err);
  });
}

var globalCtx = {
  ignoreAutoScope: true,
  ctx: { tenantId : '/default'}
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
      deleteAllUsers(function (err) {
        if(err) return done(err);
        createEmployeeModels(function (err) {
          return done(err);
        });
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
    { username: "bpouser", password: "bpouser", email: "infyuser@infyuser.com" }])
    .end(function (err, response) {

      var result = response.body;
      expect(result[0].id).to.be.defined;
      expect(result[1].id).to.be.defined;
      expect(result[2].id).to.be.defined;
      expect(result[3].id).to.be.defined;
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
});






