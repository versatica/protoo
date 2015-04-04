/**
 * Expose the protoo module.
 */
module.exports = protoo;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo'),
	pkg = require('../package.json'),
	Application = require('./Application'),
	Router = require('./Router'),
	Route = require('./Router/Route');


/**
 * The exported function returning an Application instance.
 *
 *     var protoo = require('protoo');
 *     var app = protoo();
 */
function protoo() {
	return new Application();
}


Object.defineProperties(protoo, {
	/**
	 * Expose version.
	 */
	version: {
		value: pkg.version
	},

	/**
	 * Expose middleware.
	 */
	middleware: {
		value: {
			messenger: require('./middleware/messenger'),
			sessionHandler: require('./middleware/sessionHandler')
		}
	}
});


/**
 * Add custom method.
 */
protoo.addMethod = function (method) {
	if (Application.prototype[method]) {
		throw new Error('protoo.addMethod() | method "' + method + '" already exists in Application prototype', method);
	}

	if (Router.prototype[method]) {
		throw new Error('protoo.addMethod() | method "' + method + '" already exists in Router prototype', method);
	}

	if (Route.prototype[method]) {
		throw new Error('protoo.addMethod() | method "' + method + '" already exists in Route prototype', method);
	}

	Application.addMethod(method);
	Router.addMethod(method);
	Route.addMethod(method);
};


debug('%s version %s', pkg.name, pkg.version);
