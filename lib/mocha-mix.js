var React = require('react/addons');
var helpers = require('./helpers');
var path = require('path');
var sinon = require('sinon');
var mockery = require('mockery');

/**
 * isString returns true if the given value is a string
 * @param   {any}       value     value to be evaluated
 * @return  {boolean}
 */
function isString(value) {
  return typeof value === 'string';
}

/**
 * isNotReactClass returns true if the given value's react field is false
 * @param    {any}        value    value to be evaluated
 * @return   {boolean}
 */
function isNotReactClass(value) {
  return value && value.react === false;
}

function hasModules(value) {
  return value && value.require && value.modules;
}

function isFunction(value) {
  return typeof value === 'function';
}

/**
 * createSubReactclass
 *
 * @param {string}    name    name to be a displayName
 * @return {ReactComponent}
 */
function createStubReactClass(name) {
  return React.createClass({
    displayName: (name || '') + ' stub',
    render: function () {
      return React.createElement('div');
    }
  });
}

/**
 * registerMocks traverses mockSpec and register mock instances
 * using mockery
 *
 * @method  registerMocks
 * @param   {MockSpec} mockSpec   mockSpec
 * @param   {Mocks}    mocks      mocks object create by createMocks
 */
function registerMocks(mockSpec, mocks) {
  mockSpec = mockSpec || {};
  mocks = mocks || {};
  Object.keys(mockSpec)
  .forEach(function (key) {
    var spec = mockSpec[key];
    if (isString(spec)) {
      mockery.registerMock(spec, mocks[key]);
      return;
    }
    mockery.registerMock(spec.require, mocks[key]);
  });
}

/**
 * createMocks traverses to the given mockSpec then
 * returns created stub tree.
 *
 * @method  createMocks
 * @param   {MockSpec}    mockSpec    MockSpec to be followed
 * @return  {Mocks}
 */
function createMocks(mockSpec) {
  var mocks = {};
  if (!mockSpec) {
    return mocks;
  }

  Object.keys(mockSpec)
  .forEach(function (key) {
    var spec = mockSpec[key];
    if (isString(spec)) {
      mocks[key] = createStubReactClass(key);
      return;
    }

    if (!hasModules(spec) && isNotReactClass(spec)) {
      mocks[key] = spec.mock || sinon.stub();
      return;
    }
    else if (!hasModules(spec)) {
      mocks[key] = createStubReactClass(key);
      return;
    }

    mocks[key] = require(spec.require) || {};
    Object.keys(spec.modules)
    .forEach(function (moduleKey) {
      if (spec.modules[moduleKey]) {
        mocks[key][moduleKey] = createStubReactClass(moduleKey);
      }
    });
  });
  return mocks;
}

/**
 * requireComponent returns a component as if
 * one is loading with `require('path-to-component')` as specified in the mix spec
 *
 * @param {MochaMixInstance}  mixed   A object created by MochaMix.mix
 * @return {ReactComponent}
 */
function requireComponent(mixed) {
  if (mixed._isRequired) {
    return mixed._isWrapped ?
      helpers.withContext(mixed._Component, mixed.spec.context()) :
      mixed._Component;
  }
  var requirePath = mixed.spec.require;
  var Component = require(path.join(process.cwd(), requirePath));
  mixed._Component = Component;
  mixed._isRequired = true;
  var context = mixed.spec.context;
  if (!context || !isFunction(context)) {
    return Component;
  }
  mixed._isWrapped = true;
  return helpers.withContext(Component, context());
}

/**
 * mix creates a delicious mocha-mix instance to drink!!!
 *
 * @param  {object}     spec   layout for testing Component.
 * @return {MochaMix}          MochaMix instance with helper methods
 */
function mix(spec) {
  if (isString(spec)) {
    spec = {
      require: spec
    };
  }
  var mochaMix = {
    spec: spec,
    mocks: createMocks(spec.mocks),
    _isMochaMix: true
  };
  Object.assign(mochaMix, {
    requireComponent: requireComponent.bind(null, mochaMix),
    renderComponent: helpers.renderMixedComponent.bind(null, mochaMix),
    registerMocks: registerMocks.bind(null, spec.mocks, mochaMix.mocks),
    before: function () {
      helpers.enableMockery();
      registerMocks(mochaMix.spec.mocks, mochaMix.mocks);
    },
    after: function () {
      helpers.disableMockery();
    }
  });
  return mochaMix;
}

/**
 * @module mocha-mix
 */
module.exports = {
  createMocks: createMocks,
  registerMocks: registerMocks,
  mix: mix
};
