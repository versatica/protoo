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
	 		p2pMessenger: require('./middleware/p2pMessenger')
		}
	}
});


debug('%s version %s', pkg.name, pkg.version);
