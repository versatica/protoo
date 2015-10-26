var debug = require('debug')('protoo');

var Application = require('./Application');
var Router = require('./Router');
var Route = require('./Router/Route');

const PKG = require('../package.json');

module.exports = protoo;

/**
 * The exported function returning an Application instance.
 *
 *     var protoo = require('protoo');
 *     var app = protoo();
 */
function protoo()
{
	return new Application();
}

Object.defineProperties(protoo,
	{
		/**
		 * Expose version.
		 */
		version:
		{
			value: PKG.version
		},

		/**
		 * Expose middleware.
		 */
		middleware:
		{
			value:
			{
				messenger      : require('./middleware/messenger'),
				sessionHandler : require('./middleware/sessionHandler')
			}
		}
	});

/**
 * Add custom method.
 */
protoo.addMethod = function(method)
{
	if (Application.prototype[method])
	{
		throw new Error('protoo.addMethod() | method "' + method + '" already exists in Application prototype', method);
	}

	if (Router.prototype[method])
	{
		throw new Error('protoo.addMethod() | method "' + method + '" already exists in Router prototype', method);
	}

	if (Route.prototype[method])
	{
		throw new Error('protoo.addMethod() | method "' + method + '" already exists in Route prototype', method);
	}

	Application.addMethod(method);
	Router.addMethod(method);
	Route.addMethod(method);
};

debug('%s version %s', PKG.name, PKG.version);
