/**
 * Expose the protoo module.
 */
module.exports = protoo;


/**
 * Dependencies.
 */
var Application = require('./Application');
var pkg = require('../package.json');


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
	version: { get: function() { return pkg.version; } }
});
