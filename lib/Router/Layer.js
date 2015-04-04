/**
 * Expose the Layer class.
 */
module.exports = Layer;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Router:Layer'),
	debugerror = require('debug')('protoo:ERROR:Layer'),
	pathRegexp = require('path-to-regexp'),


/**
 * Local variables.
 */
	_hasOwnProperty = Object.prototype.hasOwnProperty;


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


Layer.prototype.handleRequest = function (req, next) {
	var fn = this.handle;

	if (req.ended) {
		debugerror('handleRequest() | request.ended, no more routing');
		return;
	}

	if (fn.length > 2) {
		// Not a request handler.
		return next();
	}

	try {
		fn(req, next);
	} catch (error) {
		debugerror('handleRequest() | handle throws error: %s', error.toString());
		next(error);
	}
};


Layer.prototype.handleError = function (error, req, next) {
	var fn = this.handle;

	if (fn.length !== 3) {
		// Not an error handler.
		return next(error);
	}

	try {
		fn(error, req, next);
	} catch (error) {
		debugerror('handleError() | handle throws error: %s', error);
		next(error);
	}
};


/**
 * Check if this route matches `path`, if so
 * populate `.params`.
 */
Layer.prototype.match = function (path) {
	debug('match() | [regexp:%s, path:%s]', this.regexp, path);

	var m,
		keys,
		params,
		prop,
		n = 0,
		key,
		val,
		i,
		len;

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

	m = this.regexp.exec(path);
	if (!m) {
		debug('match() | no match');
		this.params = undefined;
		this.path = undefined;
		return false;
	}

	// Store values.
	this.params = {};
	this.path = m[0];

	debug('match() | it matches: %s', this.path);

	keys = this.keys;
	params = this.params;

	for (i = 1, len = m.length; i < len; ++i) {
		key = keys[i - 1];
		prop = key ? key.name : n++;
		val = decodeParam(m[i]);

		if (val !== undefined || !_hasOwnProperty.call(params, prop)) {
			params[prop] = val;
		}
	}

	return true;
};


function decodeParam(val) {
	if (typeof val !== 'string') {
		return val;
	}

	try {
		return decodeURIComponent(val);
	} catch (error) {
		var err = new TypeError('Failed to decode param "' + val + '"');

		err.status = 400;  // TODO: use it.
		throw err;
	}
}
