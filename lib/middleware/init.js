/**
 * Expose the init function.
 */
module.exports = init;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:middleware:init');


function init() {
	return function init(req, next) {
		debug('called');

		req.next = next;

		next();
	};
}
