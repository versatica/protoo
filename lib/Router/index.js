/**
 * Dependencies.
 */

// var debug = require('debug')('protoo:Router');
// var logerror = require('debug')('protoo:ERROR:Router');  // TODO: enable when used.


/**
 * Router.
 *
 * @class Router
 * @constructor
 */

function Router() {
	this.stack = [];
}


/**
 * Expose the Router class.
 */

Object.freeze(Router);
module.exports = Router;
