'use strict';

const logger = require('../logger')('Router');
const utils = require('../utils');
const Route = require('./Route');
const Layer = require('./Layer');
const methods = require('../methods');

function Router(options)
{
	if (!(this instanceof Router))
	{
		return new Router(options);
	}

	logger.debug('new() [options:%o]', options);

	options = utils.cloneObject(options);

	this.params = {};
	this.stack = [];
	this.caseSensitive = options.caseSensitive;
	this.mergeParams = options.mergeParams;
	this.strict = options.strict;

	function router(req, next)
	{
		router.handle(req, next);
	}

	// Inherit from the correct prototype.
	router.__proto__ = this;

	return router;
}

/**
 * Router prototype inherits from a Function
 */
Router.prototype = function()
{};

/**
 * Class methods
 */

/**
 * Add custom method
 */
Router.addMethod = function(method)
{
	Router.prototype[method] = function(path)
	{
		let route = this.route(path);

		route[method].apply(route, utils.sliceArray(arguments, 1));

		return this;
	};
};

/**
 * Public API.
 */

Router.prototype.param = function(name, fn)
{
	logger.debug('param() [name:%s]', name);

	if (!name || typeof name !== 'string')
		throw new TypeError('argument name is required and must be a string');

	if (!fn || typeof fn !== 'function')
		throw new TypeError('argument fn is required and must be a function');

	let params = this.params[name];

	if (!params)
		params = this.params[name] = [];

	params.push(fn);

	return this;
};

Router.prototype.handle = function(req, done)
{
	if (!done)
		throw new TypeError('protoo.Router.handle() | argument done is required');

	let self = this;
	let idx = 0;
	let removed = '';
	let paramcalled = {};
	// Middleware and routes
	let stack = this.stack;
	// Manage inter-router variables
	let parentParams = req.params;
	let parentPath = req.basePath || '';

	done = restore(done, req, 'basePath', 'next', 'params');

	// Setup next layer
	req.next = next;

	// Setup basic req values
	req.basePath = parentPath;
	req.originalPath = req.originalPath || req.path;

	next();

	function next(err)
	{
		let layerError = err === 'route' ? null : err;
		let path;
		let layer;
		let match;
		let route;
		let layerPath;

		// Restore altered req.path
		if (removed.length !== 0)
		{
			req.basePath = parentPath;
			req.path = removed + req.path;
			removed = '';
		}

		// No more matching layers
		if (idx >= stack.length)
		{
			logger.debug('handle().next() | no more matching layers');

			setImmediate(done, layerError);
			return;
		}

		path = req.path;

		if (path === null)
		{
			logger.debug('handle().next() | no path');

			return done(layerError);
		}

		// Find next matching layer
		while (match !== true && idx < stack.length)
		{
			logger.debug('handle().next() | in stack [idx:%d/%d]', idx, stack.length);

			layer = stack[idx++];
			match = matchLayer(layer, path);
			route = layer.route;

			if (typeof match !== 'boolean')
			{
				logger.error('handle().next() | match is not a boolean');

				// Hold on to layerError.
				layerError = layerError || match;
			}

			if (match !== true)
			{
				logger.debug('handle().next() | no match');

				continue;
			}

			if (!route)
			{
				logger.debug('handle().next() | no route');

				// Process non-route handlers normally
				continue;
			}

			if (layerError)
			{
				logger.debug('handle().next() | layerError, continue');

				// Routes do not match with a pending error
				match = false;
				continue;
			}

			// Don't even bother matching route
			if (!route.handlesMethod(req.method))
			{
				logger.debug('handle().next() | does not handle this method');

				match = false;
				continue;
			}
		}

		// No match
		if (match !== true)
		{
			logger.debug('handle() | no match, done');

			return done(layerError);
		}

		// Store route for dispatch on change
		if (route)
			req.route = route;

		// Capture one-time layer values
		req.params = self.mergeParams ?
			mergeParams(layer.params, parentParams)	: layer.params;
		layerPath = layer.path;

		// This should be done for the layer
		self._processParams.call(self, layer, paramcalled, req, (err) =>
		{
			if (err)
			{
				logger.error('handle() | params processing failed: %s', err.toString());

				return next(layerError || err);
			}

			if (route)
				return layer.handleRequest(req, next);

			trimPrefix(layer, layerError, layerPath, path);
		});
	}

	function trimPrefix(layer, layerError, layerPath, path)
	{
		let c = path[layerPath.length];

		if (c && c !== '/')
		{
			logger.error('handle().trimPrefix() | path does not begin with "/"');

			return next(layerError);
		}

		// Trim off the part of the path that matches the route
		// middleware (.use stuff) needs to have the path stripped
		if (layerPath.length !== 0)
		{
			logger.debug('handle().trimPrefix() | trim prefix "%s" from path "%s"', layerPath, req.path);

			removed = layerPath;
			req.path = req.path.substr(removed.length);

			// Setup base path (no trailing slash)
			req.basePath = parentPath + (removed[removed.length - 1] === '/' ?
				removed.substring(0, removed.length - 1) : removed);
		}

		logger.debug('handle().trimPrefix() | [name:%s, layerPath:%s, reqPath:%s, reqOriginalPath:%s]',
			layer.name, layerPath, req.path, req.originalPath);

		if (layerError)
		{
			logger.debug('handle().trimPrefix() | layer error');

			layer.handleError(layerError, req, next);
		}
		else
		{
			layer.handleRequest(req, next);
		}
	}
};

Router.prototype.use = function(fn)
{
	let offset = 0;
	let path = '/';
	let arg;
	let fns;

	// Default path to '/'
	// Disambiguate router.use([fn])
	if (typeof fn !== 'function')
	{
		arg = fn;

		while (Array.isArray(arg) && arg.length !== 0)
			arg = arg[0];

		// First arg is the path
		if (typeof arg !== 'function')
		{
			offset = 1;
			path = fn;
		}
	}

	fns = utils.flattenArray(utils.sliceArray(arguments, offset));

	if (fns.length === 0)
		throw new TypeError('protoo.Router.use() | requires middleware functions');

	fns.forEach(function(fn)
	{
		let layer;

		if (typeof fn !== 'function')
			throw new TypeError('protoo.Router.use() | requires middleware functions');

		// Add the middleware
		logger.debug('use() [path:%s, fn:%s]', path, fn.name || '<anonymous>');

		layer = new Layer(path,
			{
				sensitive : this.caseSensitive,
				strict    : false,
				end       : false
			}, fn);

		layer.route = undefined;

		this.stack.push(layer);
	}, this);

	return this;
};

Router.prototype.route = function(path)
{
	logger.debug('route() [path:%s]', path);

	let route = new Route(path);
	let layer = new Layer(path,
		{
			sensitive : this.caseSensitive,
			strict    : this.strict,
			end       : true
		}, handle);

	function handle(req, next)
	{
		route.dispatch(req, next);
	}

	layer.route = route;
	this.stack.push(layer);

	return route;
};

Router.prototype._processParams = function(layer, called, req, done)
{
	let params = this.params;
	// Captured parameters from the layer, keys and values
	let keys = layer.keys;
	let i = 0;
	let name;
	let paramIndex = 0;
	let key;
	let paramVal;
	let paramCallbacks;
	let paramCalled;

	// Fast track
	if (!keys || keys.length === 0)
		return done();

	// Process params in order
	// Param callbacks can be async
	function param(err)
	{
		if (err)
			return done(err);

		if (i >= keys.length)
			return done();

		paramIndex = 0;
		key = keys[i++];

		if (!key)
			return done();

		name = key.name;
		paramVal = req.params[name];
		paramCallbacks = params[name];
		paramCalled = called[name];

		if (paramVal === undefined || !paramCallbacks)
			return param();

		// Param previously called with same value or error occurred
		if (paramCalled && (paramCalled.error || paramCalled.match === paramVal))
		{
			// Restore value
			req.params[name] = paramCalled.value;

			// Next param
			return param(paramCalled.error);
		}

		called[name] = paramCalled =
		{
			error : null,
			match : paramVal,
			value : paramVal
		};

		paramCallback();
	}

	// Single param callbacks
	function paramCallback(err)
	{
		let fn = paramCallbacks[paramIndex++];

		// Store updated value
		paramCalled.value = req.params[key.name];

		if (err)
		{
			// Store error
			paramCalled.error = err;
			param(err);

			return;
		}

		if (!fn)
			return param();

		try
		{
			fn(req, paramCallback, paramVal, key.name);
		}
		catch (error)
		{
			paramCallback(error);
		}
	}

	param();
};

/**
 * Create Router#VERB methods
 */
methods.concat('all').forEach((method) =>
{
	Router.addMethod(method);
});

/**
 * Helpers
 */

function matchLayer(layer, path)
{
	try
	{
		return layer.match(path);
	}
	catch(error)
	{
		return error;
	}
}

// Merge params with parent params
function mergeParams(params, parent)
{
	let obj;
	let i = 0;
	let o = 0;

	if (typeof parent !== 'object' || !parent)
		return params;

	// Make copy of parent for base
	obj = utils.cloneObject(parent);

	// Simple non-numeric merging
	if (!(0 in params) || !(0 in parent))
		return utils.mergeObject(obj, params);

	// Determine numeric gaps.
	while (i === o || o in parent)
	{
		if (i in params)
			i++;

		if (o in parent)
			o++;
	}

	// Offset numeric indices in params before merge
	for (i--; i >= 0; i--)
	{
		params[i + o] = params[i];

		// Create holes for the merge when necessary
		if (i < o)
			delete params[i];
	}

	return utils.mergeObject(parent, params);
}

// Restore obj props after function
function restore(fn, obj)
{
	let props = new Array(arguments.length - 2);
	let vals = new Array(arguments.length - 2);
	let i;
	let len;

	for (i = 0, len = props.length; i < len; i++)
	{
		props[i] = arguments[i + 2];
		vals[i] = obj[props[i]];
	}

	return function()
	{
		// Restore values
		for (i = 0, len = props.length; i < len; i++)
		{
			obj[props[i]] = vals[i];
		}

		return fn.apply(this, arguments);
	};
}

module.exports = Router;
