/**
 * Dependencies.
 */

var Application = require('./Application');
var pkg = require('../package.json');



/**
 * The exported Node.js module.
 *
 * When calling it as a function it returns an Application instance.
 *
 *     var protoo = require('protoo');
 *     var app = protoo();  // get an Application instance
 */

var protoo = function() {
	return new Application();
};


/**
 * protoo version in format 'x.y.z'
 *
 * @property version
 * @static
 * @type String
 * @example
 *     console.log('protoo version: %s', protoo.version);
 *     // => protoo version: 0.1.0
 */

Object.defineProperties(protoo, {
	version: {
		get: function() { return pkg.version; }
	}
});


/**
 * Expose the protoo module.
 */

Object.freeze(protoo);
module.exports = protoo;
