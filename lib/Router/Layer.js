/**
 * Expose the Layer class.
 */
module.exports = Layer;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Router:Layer');
var debugerror = require('debug')('protoo:ERROR:Router:Layer');
var pathRegexp = require('path-to-regexp');


/**
 * Local variables.
 */
var _hasOwnProperty = Object.prototype.hasOwnProperty;


function Layer(path, options, fn) {
	debug('new() | [path:%s]', path);

	options = options || {};

	this.handle = fn;
	this.name = fn.name || '<anonymous>';
	this.params = undefined;
	this.path = undefined;
	this.keys = [];
	this.regexp = pathRegexp(path, this.keys, options);

	if (path === '/' && options.end === false) {
		this.regexp.fast_slash = true;
	}
}


Layer.prototype.handleRequest = function layer_handle_request(req, next) {
	var fn = this.handle;

	if (fn.length > 2) {
		// Not a standard request handler.
		debugerror('handleRequest() | non a standard request handler, next');
		return next();
	}

	try {
		fn(req, next);
	} catch(err) {
		debugerror('handleRequest() | handle throws error: %o', err);
		next(err);
	}
};


Layer.prototype.handleError = function layer_handle_error(error, req, next) {
	var fn = this.handle;

	if (fn.length !== 3) {
		// Not a standard error handler.
		debugerror('handleRequest() | non a standard error handler, next');
		return next(error);
	}

	try {
		fn(error, req, next);
	} catch(err) {
		debugerror('handleError() | handle throws error: %o', err);
		next(err);
	}
};


/**
 * Check if this route matches `path`, if so
 * populate `.params`.
 */
Layer.prototype.match = function layer_match(path) {
	debug('match() | [regexp:%s, path:%s]', this.regexp, path);

	if (path === null) {
		debug('match() | no path, nothing matches');
		// No path, nothing matches.
		this.params = undefined;
		this.path = undefined;
		return false;
	}

	if (this.regexp.fast_slash) {
		debug('match() | fast_slash, everything matches');
		// Fast path non-ending match for / (everything matches).
		this.params = {};
		this.path = '';
		return true;
	}

	var m = this.regexp.exec(path);
	if (! m) {
		debug('match() | no match');
		this.params = undefined;
		this.path = undefined;
		return false;
	}

	// Store values.
	this.params = {};
	this.path = m[0];

	debug('match() | it matches: %s', this.path);

	var keys = this.keys;
	var params = this.params;
	var prop;
	var n = 0;
	var key;
	var val;

	for (var i=1, len=m.length; i<len; ++i) {
		key = keys[i - 1];
		prop = key ? key.name : n++;
		val = decodeParam(m[i]);

		if (val !== undefined || ! _hasOwnProperty.call(params, prop)) {
			params[prop] = val;
		}
	}

	return true;
};


function decodeParam(val){
	if (typeof val !== 'string') {
		return val;
	}

	try {
		return decodeURIComponent(val);
	} catch(e) {
		var err = new TypeError('Failed to decode param "' + val + '"');
		err.status = 400;  // TODO: use it.
		throw err;
	}
}
