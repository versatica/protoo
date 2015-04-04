/**
 * Expose the Route class.
 */
module.exports = Route;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Router'),
	flatten = require('array-flatten'),
	Layer = require('./Layer'),
	methods = require('../methods'),


/**
 * Local variables.
 */
	slice = Array.prototype.slice;


function Route(path) {
	debug('new() | [path:%s]', path);

	this.path = path;
	this.stack = [];
	this.methods = {};
}


/**
 * Class methods.
 */


/**
 * Add custom method.
 */
Route.addMethod = function (method) {
	Route.prototype[method] = function () {
		var fns = flatten(slice.call(arguments));

		fns.forEach(function (fn) {
			var layer;

			if (typeof fn !== 'function') {
				throw new Error('protoo.Route.' + method + '() | requires callback functions');
			}

			debug('%s() | [path:%s]', method, this.path);

			layer = new Layer('/', {}, fn);
			layer.method = method;

			this.methods[method] = true;
			this.stack.push(layer);
		}, this);

		return this;
	};
};


/**
 * Public API.
 */


/**
 * Dispatch req into this route.
 */
Route.prototype.dispatch = function (req, done) {
	var idx = 0,
		stack = this.stack,
		method = req.method;

	if (stack.length === 0) {
		return done();
	}

	req.route = this;

	next();

	function next(err) {
		var layer,
			match;

		if (err && err === 'route') {
			debug('dispatch() | "route" error');
			return done();
		}

		// No more matching layers.
		if (idx >= stack.length) {
			debug('dispatch() | no more matching layers');
			return done(err);
		}

		while (match !== true && idx < stack.length) {
			layer = stack[idx++];
			match = !layer.method || layer.method === method;
		}

		// No match.
		if (match !== true) {
			debug('dispatch() | no match');
			return done(err);
		}

		if (!err) {
			layer.handleRequest(req, next);
		} else {
			layer.handleError(err, req, next);
		}
	}
};


Route.prototype.handlesMethod = function (method) {
	if (this.methods._all) {
		return true;
	}

	return Boolean(this.methods[method]);
};


/**
 * Add a handler for all Protoo verbs to this route.
 * @chainable
 */
Route.prototype.all = function () {
	var fns = flatten(slice.call(arguments));

	fns.forEach(function (fn) {
		var layer;

		if (typeof fn !== 'function') {
			throw new Error('protoo.Route.all() | requires callback functions');
		}

		debug('all() | [path:%s]', this.path);

		layer = new Layer('/', {}, fn);
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
methods.forEach(function (method) {
	Route.addMethod(method);
});
