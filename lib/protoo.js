'use strict';

const logger = require('./logger')();

const Application = require('./Application');
const Router = require('./Router');
const Route = require('./Router/Route');
const Request = require('./Request');
const middleware = require('./middleware');

const PKG = require('../package.json');

function protoo()
{
	return new Application();
}

Object.defineProperties(protoo,
	{
		version:
		{
			value : PKG.version
		},

		request:
		{
			value : Request.factory
		},

		middleware:
		{
			value : middleware
		}
	});

protoo.addMethod = function(method)
{
	if (Application.prototype[method])
		throw new Error(`protoo.addMethod() | method "${method}" already exists in Application prototype`);

	if (Router.prototype[method])
		throw new Error(`protoo.addMethod() | method "${method}" already exists in Router prototype`);

	if (Route.prototype[method])
		throw new Error(`protoo.addMethod() | method "${method}" already exists in Route prototype`);

	Application.addMethod(method);
	Router.addMethod(method);
	Route.addMethod(method);
};

logger.debug('%s version %s', PKG.name, PKG.version);

module.exports = protoo;
