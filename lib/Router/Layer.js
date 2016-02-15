'use strict';

const pathRegexp = require('path-to-regexp');

const logger = require('../logger')('Router:Layer');
const utils = require('../utils');

function Layer(path, options, fn)
{
	logger.debug('new() [path:%s]', path);

	options = utils.cloneObject(options);

	this.handle = fn;
	this.name = fn.name || '<anonymous>';
	this.params = undefined;
	this.path = undefined;
	this.keys = [];
	this.regexp = pathRegexp(path, this.keys, options);

	if (path === '/' && options.end === false)
		this.regexp.fast_slash = true;  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
}

Layer.prototype.handleRequest = function(req, next)
{
	let fn = this.handle;

	if (req.ended)
	{
		logger.error('handleRequest() | request.ended, no more routing');

		return;
	}

	if (fn.length > 2)
	{
		// Not a request handler
		return next();
	}

	try
	{
		fn(req, next);
	}
	catch(error)
	{
		logger.error('handleRequest() | handle throws error: %s', error.toString());

		next(error);
	}
};

Layer.prototype.handleError = function(error, req, next)
{
	let fn = this.handle;

	if (fn.length !== 3)
	{
		// Not an error handler.
		return next(error);
	}

	try
	{
		fn(error, req, next);
	}
	catch(error)
	{
		logger.error('handleError() | handle throws error: %s', error);

		next(error);
	}
};

/**
 * Check if this route matches `path`, if so populate `.params`
 */
Layer.prototype.match = function(path)
{
	logger.debug('match() [regexp:%s, path:%s]', this.regexp, path);

	let m;
	let keys;
	let params;
	let prop;
	let n = 0;
	let key;
	let val;

	if (path === null)
	{
		logger.debug('match() | no path, nothing matches');

		// No path, nothing matches
		this.params = undefined;
		this.path = undefined;

		return false;
	}

	if (this.regexp.fast_slash)  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	{
		logger.debug('match() | fast_slash, everything matches');

		// Fast path non-ending match for / (everything matches)
		this.params = {};
		this.path = '';

		return true;
	}

	m = this.regexp.exec(path);
	if (!m)
	{
		logger.debug('match() | no match');

		this.params = undefined;
		this.path = undefined;

		return false;
	}

	// Store values
	this.params = {};
	this.path = m[0];

	logger.debug('match() | it matches: %s', this.path);

	keys = this.keys;
	params = this.params;

	for (let i = 1, len = m.length; i < len; ++i)
	{
		key = keys[i - 1];
		prop = key ? key.name : n++;
		val = decodeParam(m[i]);

		if (val !== undefined || params.hasOwnProperty(prop))
			params[prop] = val;
	}

	return true;
};

function decodeParam(val)
{
	if (typeof val !== 'string')
		return val;

	try
	{
		return decodeURIComponent(val);
	}
	catch(error)
	{
		let err = new TypeError(`Failed to decode param "${val}"`);

		err.status = 400;  // TODO: use it
		throw err;
	}
}

module.exports = Layer;
