/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Router');
var debugerror = require('debug')('protoo:ERROR:Router');
var merge = require('utils-merge');
var Route = require('./Route');
var Layer = require('./Layer');
var Utils = require('../Utils');
var methods = require('../methods');


/**
 * Local variables.
 */
var objectRegExp = /^\[object (\S+)\]$/;
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;


/**
 * Expose a function that returns a callable instance of Router.
 */
module.exports = function(options) {
	function fn(req, next) {
		fn.handle(req, next);
	}

	options = options || {};

	// Mixin Router class methods.
	fn.__proto__ = new Router(options);

	return fn;
};


function Router(options) {
	debug('new() | [options:%o]', options);

	this.params = {};
	this._params = [];
	this.caseSensitive = options.caseSensitive;
	this.mergeParams = options.mergeParams;
	this.strict = options.strict;
	this.stack = [];
}


Router.prototype.param = function(name, fn) {
	debug('param() | [name:%s]', name);

	// Apply param functions.
	var params = this._params,
		len = params.length,
		ret;

	for (var i=0; i<len; ++i) {
		if ((ret = params[i](name, fn))) {
			fn = ret;
		}
	}

	// Ensure we end up with a middleware function.
	if (typeof fn !== 'function') {
		throw new Error('protoo.Router.param() | got "' + fn + '" for param name "' + name + '"');
	}

	(this.params[name] = this.params[name] || []).push(fn);
	return this;
};


Router.prototype.handle = function(req, done) {
	debug('handle() | [method:%s, url:%s]', req.method, req.url);

	var self = this,
		idx = 0,
		removed = '',
		paramcalled = {},
		stack = this.stack;  // Middleware and routes.

	// Manage inter-router variables
	var parentParams = req.params,
		parentUrl = req.baseUrl || '';

	done = restore(done, req, 'baseUrl', 'next', 'params');

	// Setup next layer.
	req.next = next;

	// Setup basic req values.
	req.baseUrl = parentUrl;
	req.originalUrl = req.originalUrl || req.url;

	next();

	function next(err) {
		var layerError = err === 'route' ? null : err;

		// Restore altered req.url.
		if (removed.length !== 0) {
			req.baseUrl = parentUrl;
			req.url = removed + req.url;
			removed = '';
		}

		// No more matching layers.
		if (idx >= stack.length) {
			debug('handle().next() | no more matching layers');
			setImmediate(done, layerError);
			return;
		}

		var path = req.url;
		debug('handle().next() | path: %s', path);

		if (path === null) {
			debug('handle().next() | path === null, done');
			return done(layerError);
		}

		// Find next matching layer.
		var layer,
			match,
			route;

		while (match !== true && idx < stack.length) {
			debug('handle().next() | in while [idx:%d]', idx);

			layer = stack[idx++];
			match = matchLayer(layer, path);
			route = layer.route;

			if (typeof match !== 'boolean') {
				debugerror('handle().next() | match is not a boolean');
				// Hold on to layerError.
				layerError = layerError || match;
			}

			if (match !== true) {
				debug('handle().next() | match !== true, continue');
				continue;
			}

			if (! route) {
				debug('handle().next() | ! route, continue [match:%s, idx:%d, stack.len:%d]', match, idx, stack.length);
				// Process non-route handlers normally.
				continue;
			}

			if (layerError) {
				debug('handle().next() | layerError, continue');
				// Routes do not match with a pending error.
				match = false;
				continue;
			}

			var method = req.method,
				has_method = route._handles_method(method);

			// Don't even bother matching route.
			if (! has_method) {
				debug('handle().next() | ! has method, continue');
				match = false;
				continue;
			}
		}

		// No match.
		if (match !== true) {
			debug('handle() | match !== true, done');
			return done(layerError);
		}

		// Store route for dispatch on change.
		if (route) {
			req.route = route;
		}

		// Capture one-time layer values.
		req.params = self.mergeParams	?
			mergeParams(layer.params, parentParams)	: layer.params;
		var layerPath = layer.path;

		// This should be done for the layer.
		process_params.call(self, layer, paramcalled, req, function(err) {
			if (err) {
				debugerror('handle() | process_params calls next(error): %s', err);
				return next(layerError || err);
			}

			if (route) {
				debugerror('handle() | there is route, process_params calls layer.handle_request()');
				return layer.handle_request(req, next);
			}

			trim_prefix(layer, layerError, layerPath, path);
		});
	}

	function trim_prefix(layer, layerError, layerPath, path) {
		var c = path[layerPath.length];
		if (c && '/' !== c && '.' !== c) {
			debugerror('handle().trim_prefix() | exiting at the beginning');
			return next(layerError);
		}

		 // Trim off the part of the url that matches the route
		 // middleware (.use stuff) needs to have the path stripped.
		if (layerPath.length !== 0) {
			debug('handle().trim_prefix() | trim prefix "%s" from url "%s"', layerPath, req.url);
			removed = layerPath;
			req.url = req.url.substr(removed.length);

			// Setup base URL (no trailing slash).
			req.baseUrl = parentUrl + (removed[removed.length - 1] === '/' ?
				removed.substring(0, removed.length - 1) : removed);
		}

		debug('handle().trim_prefix() | [name:%s, layerPath:%s, reqUrl:%s, reqOriginalUrl:%s]', layer.name, layerPath, req.url, req.originalUrl);

		if (layerError) {
			debug('handle().trim_prefix() | trim_prefix | layerError');
			layer.handle_error(layerError, req, next);
		} else {
			layer.handle_request(req, next);
		}
	}
};


Router.prototype.use = function(fn) {
	var offset = 0,
		path = '/';

	// Default path to '/'.
	// Disambiguate router.use([fn])
	if (typeof fn !== 'function') {
		var arg = fn;

		while (Array.isArray(arg) && arg.length !== 0) {
			arg = arg[0];
		}

		// First arg is the path.
		if (typeof arg !== 'function') {
			offset = 1;
			path = fn;
		}
	}

	var fns = Utils.flatten(slice.call(arguments, offset));

	if (fns.length === 0) {
		throw new TypeError('protoo.Router.use() | requires middleware functions');
	}

	fns.forEach(function(fn) {
		if (typeof fn !== 'function') {
			throw new TypeError('protoo.Router.use() | requires middleware function but got a ' + gettype(fn));
		}

		// Add the middleware.
		debug('use() | [path:%s, fn:%s]', path, fn.name || '<anonymous>');

		var layer = new Layer(path, {
			sensitive: this.caseSensitive,
			strict: false,
			end: false
		}, fn);

		layer.route = undefined;

		this.stack.push(layer);
	}, this);

	return this;
};


Router.prototype.route = function(path) {
	debug('route() | [path:%s]', path);

	var route = new Route(path);

	var layer = new Layer(path, {
		sensitive: this.caseSensitive,
		strict: this.strict,
		end: true
	}, route.dispatch.bind(route));

	layer.route = route;

	this.stack.push(layer);
	return route;
};


// Create Router#VERB methods.
methods.concat('all').forEach(function(method) {
	Router.prototype[method] = function(path) {
		debug('%s() | [path:%s]', method, path);

		var route = this.route(path);

		route[method].apply(route, slice.call(arguments, 1));
		return this;
	};
});


/**
 * Private API.
 */


function process_params(layer, called, req, done) {
	var params = this.params;

	// Captured parameters from the layer, keys and values.
	var keys = layer.keys;

	// Fast track.
	if (! keys || keys.length === 0) {
		return done();
	}

	var i = 0;
	var name;
	var paramIndex = 0;
	var key;
	var paramVal;
	var paramCallbacks;
	var paramCalled;

	// Process params in order.
	// Param callbacks can be async.
	function param(err) {
		if (err) {
			return done(err);
		}

		if (i >= keys.length ) {
			return done();
		}

		paramIndex = 0;
		key = keys[i++];

		if (! key) {
			return done();
		}

		name = key.name;
		paramVal = req.params[name];
		paramCallbacks = params[name];
		paramCalled = called[name];

		if (paramVal === undefined || ! paramCallbacks) {
			return param();
		}

		// Param previously called with same value or error occurred.
		if (paramCalled && (paramCalled.error || paramCalled.match === paramVal)) {
			// Restore value.
			req.params[name] = paramCalled.value;

			// Next param.
			return param(paramCalled.error);
		}

		called[name] = paramCalled = {
			error: null,
			match: paramVal,
			value: paramVal
		};

		paramCallback();
	}

	// Single param callbacks.
	function paramCallback(err) {
		var fn = paramCallbacks[paramIndex++];

		// Store updated value.
		paramCalled.value = req.params[key.name];

		if (err) {
			// Store error.
			paramCalled.error = err;
			param(err);
			return;
		}

		if (! fn) {
			return param();
		}

		try {
			fn(req, paramCallback, paramVal, key.name);
		} catch(e) {
			paramCallback(e);
		}
	}

	param();
}


// Get type for error message.
function gettype(obj) {
	var type = typeof obj;

	if (type !== 'object') {
		return type;
	}

	// Inspect [[Class]] for objects
	return toString.call(obj).replace(objectRegExp, '$1');
}


function matchLayer(layer, path) {
	try {
		return layer.match(path);
	} catch(error) {
		return error;
	}
}


// Merge params with parent params.
function mergeParams(params, parent) {
	if (typeof parent !== 'object' || ! parent) {
		return params;
	}

	// Make copy of parent for base.
	var obj = merge({}, parent);

	// Simple non-numeric merging.
	if (!(0 in params) || !(0 in parent)) {
		return merge(obj, params);
	}

	var i = 0;
	var o = 0;

	// Determine numeric gaps.
	while (i === o || o in parent) {
		if (i in params) { i++; }
		if (o in parent) { o++; }
	}

	// Offset numeric indices in params before merge.
	for (i--; i >= 0; i--) {
		params[i + o] = params[i];

		// Create holes for the merge when necessary.
		if (i < o) {
			delete params[i];
		}
	}

	return merge(parent, params);
}


// Restore obj props after function.
function restore(fn, obj) {
	var props = new Array(arguments.length - 2),
		vals = new Array(arguments.length - 2);

	for (var i=0, len=props.length; i<len; i++) {
		props[i] = arguments[i + 2];
		vals[i] = obj[props[i]];
	}

	return function() {
		// Restore values.
		for (var i=0, len=props.length; i<len; i++) {
			obj[props[i]] = vals[i];
		}

		return fn.apply(this, arguments);
	};
}
