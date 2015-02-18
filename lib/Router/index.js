/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Router');
// var debugerror = require('debug')('protoo:ERROR:Router');
var Route = require('./Route');
var Layer = require('./Layer');
// var Utils = require('./Utils');


/**
 * Expose a function that returns a callable instance of Router.
 */
module.exports = function() {
	function fn(req, res, next) {
		fn.handle(req, res, next);
	}

	// Mixin Router class methods.
	fn.__proto__ = new Router();

	// List of routes.
	fn.stack = [];

	return fn;
};


function Router() {
	debug('new()');
}


// Router.prototype.


// Router.prototype.handle = function(req, res, done) {
// 	debug('handle() | dispatching %s [id:%s]', req.method, req.id);

// 	// manage inter-router variables
// 	var parentParams = req.params;
// 	var parentUrl = req.baseUrl || '';

// 	done = restore(done, req, 'baseUrl', 'next', 'params');

// };
