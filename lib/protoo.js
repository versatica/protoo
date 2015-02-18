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
		get: function() {
			return pkg.version;
		}
	}
});


/**
 * Expose constructors.
 */
protoo.Router = Router;


debug('%s version %s', pkg.name, pkg.version);
