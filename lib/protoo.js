/**
 * Dependencies.
 */

var Application = require('./Application');
var pkg = require('../package.json');


/**
 * The exposed module.
 * When calling as a function it returns an Application instance.
 */

var protoo = createApplication;


/**
 * Create a protoo application.
 *
 * @return {Application}
 * @api public
 */

function createApplication() {
	var app = new Application();

	return app;
}


/**
 * Expose `version` property.
 *
 * @return {String}
 * @api public
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
