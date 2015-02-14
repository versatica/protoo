/**
 * Expose the Router class.
 */
module.exports = Router;


/**
 * Dependencies.
 */
// var debug = require('debug')('protoo:Router');
// var debugerror = require('debug')('protoo:ERROR:Router');  // TODO: enable when used.
// debugerror.log = console.warn.bind(console);


/**
 * Router.
 *
 * @class Router
 * @constructor
 */
function Router() {
	this.stack = [];
}
