'use strict';

const logger = require('../logger')('Router:Route');
const utils = require('../utils');
const Layer = require('./Layer');
const methods = require('../methods');

function Route(path)
{
	logger.debug('new() [path:%s]', path);

	this.path = path;
	this.stack = [];
	this.methods = {};
}

/**
 * Class methods
 */

/**
 * Add custom method
 */
Route.addMethod = function(method)
{
	Route.prototype[method] = function()
	{
		let fns = utils.flattenArray(utils.sliceArray(arguments));

		fns.forEach(function(fn)
		{
			let layer;

			if (typeof fn !== 'function')
				throw new Error(`protoo.Route.${method}() requires callback functions`);

			logger.debug('%s() | [path:%s]', method, this.path);

			layer = new Layer('/', {}, fn);
			layer.method = method;
			this.methods[method] = true;
			this.stack.push(layer);
		}, this);

		return this;
	};
};

/**
 * Dispatch req into this route
 */
Route.prototype.dispatch = function(req, done)
{
	let idx = 0;
	let stack = this.stack;
	let method = req.method;

	if (stack.length === 0)
		return done();

	req.route = this;

	next();

	function next(err)
	{
		let layer;
		let match;

		if (err && err === 'route')
		{
			logger.debug('dispatch() | "route" error');

			return done();
		}

		// No more matching layers
		if (idx >= stack.length)
		{
			logger.debug('dispatch() | no more matching layers');

			return done(err);
		}

		while (match !== true && idx < stack.length)
		{
			layer = stack[idx++];
			match = !layer.method || layer.method === method;
		}

		// No match
		if (match !== true)
		{
			logger.debug('dispatch() | no match');

			return done(err);
		}

		if (!err)
			layer.handleRequest(req, next);
		else
			layer.handleError(err, req, next);
	}
};

Route.prototype.handlesMethod = function(method)
{
	if (this.methods._all)
		return true;

	return Boolean(this.methods[method]);
};

/**
 * Add a handler for all Protoo verbs to this route
 */
Route.prototype.all = function()
{
	let fns = utils.flattenArray(utils.sliceArray(arguments));

	fns.forEach(function(fn)
	{
		let layer;

		if (typeof fn !== 'function')
			throw new Error('protoo.Route.all() requires callback functions');

		logger.debug('all() [path:%s]', this.path);

		layer = new Layer('/', {}, fn);
		layer.method = undefined;
		this.methods._all = true;
		this.stack.push(layer);
	}, this);

	return this;
};

/**
 * Add each Protoo method as a prototype method
 */
methods.forEach(function(method)
{
	Route.addMethod(method);
});

module.exports = Route;
