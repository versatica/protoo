/**
 * Expose the protoo module.
 */
module.exports = protoo;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo');
var pkg = require('../package.json');
var Application = require('./Application');
var Router = require('./Router');
var Route = require('./Router/Route');


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
protoo.addMethod = function(method) {
	if (Application.prototype[method]) {
		debug('addMethod() | method "%s" already exists in Application prototype', method);
		return;
	}

	if (Router.prototype[method]) {
		debug('addMethod() | method "%s" already exists in Router prototype', method);
		return;
	}

	if (Route.prototype[method]) {
		debug('addMethod() | method "%s" already exists in Route prototype', method);
		return;
	}

	Application.addMethod(method);
	Router.addMethod(method);
	Route.addMethod(method);
};


debug('%s version %s', pkg.name, pkg.version);
