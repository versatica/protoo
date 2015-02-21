/**
 * Expose the Route class.
 */
module.exports = Route;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Router:Route');
// var debugerror = require('debug')('protoo:ERROR:Router:Route');
var Layer = require('./Layer');
var Utils = require('../Utils');
var methods = require('../methods');


function Route(path) {
	debug('new() | [path:%s]', path);

	this.path = path;
	this.stack = [];
	this.methods = {};
}


/**
 * Dispatch req into this route.
 */
Route.prototype.dispatch = function(req, done) {
	var idx = 0,
		stack = this.stack,
		method = req.method;

	if (stack.length === 0) {
		return done();
	}

	req.route = this;

	next();

	function next(err) {
		if (err && err === 'route') {
			return done();
		}

		var layer = stack[idx++];
		if (! layer) {
			return done(err);
		}

		if (layer.method && layer.method !== method) {
			return next(err);
		}

		if (! err) {
			layer.handle_request(req, next);
		} else {
			layer.handle_error(err, req, next);
		}
	}
};


/**
 * Add a handler for all Protoo verbs to this route.
 * @chainable
 */
Route.prototype.all = function(req, next) {  // jshint ignore:line
	var callbacks = Utils.flatten([].slice.call(arguments));

	callbacks.forEach(function(fn) {
		if (typeof fn !== 'function') {
			var type = {}.toString.call(fn);

			throw new Error('protoo.Route.all() | requires callback functions but got a ' + type);
		}

		debug('all() | [path:%s]', this.path);

		var layer = new Layer('/', {}, fn);
		layer.method = undefined;

		this.methods._all = true;
		this.stack.push(layer);
	}, this);

	return this;
};


/**
 * Add each Protoo method as a prototype method.
 * @chainable
 */
methods.forEach(function(method) {
	Route.prototype[method] = function() {
		var callbacks = Utils.flatten([].slice.call(arguments));

		callbacks.forEach(function(fn) {
			if (typeof fn !== 'function') {
				var type = {}.toString.call(fn);

				throw new Error('protoo.Route.' + method + '() | requires callback functions but got a ' + type);
			}

			debug('%s() | [path:%s]', method, this.path);

			var layer = new Layer('/', {}, fn);
			layer.method = method;

			this.methods[method] = true;
			this.stack.push(layer);
		}, this);

		return this;
	};
});


/**
 * Private API.
 */


Route.prototype._handles_method = function(method) {
	if (this.methods._all) {
		return true;
	}

	return Boolean(this.methods[method]);
};


Route.prototype._options = function() {
	return Object.keys(this.methods);
};
