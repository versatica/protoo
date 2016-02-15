'use strict';

const logger = require('./logger')('parse');
const isPositiveInteger = require('./utils').isPositiveInteger;
const Request = require('./Request');
const Response = require('./Response');

// TODO: Validate lenght of .method, .path, .id, etc etc etc !!!

module.exports = function(raw)
{
	// TODO: uncomment
	// logger.debug('parse()');

	let msg;
	let isRequest;
	let isResponse;
	let id;
	let method;
	let path;
	let status;
	let reason;
	let data = {};
	let key;

	/**
	 * Basic syntax check
	 */

	try
	{
		msg = JSON.parse(raw);
	}
	catch(error)
	{
		logger.error('invalid JSON: %s', error);

		return;
	}

	if (typeof msg !== 'object')
	{
		logger.error('not an object');

		return;
	}

	if (Array.isArray(msg))
	{
		logger.error('cannot be an array');

		return;
	}

	if (!msg.id)
	{
		logger.error('missing .id field');
		return;
	}

	/**
	 * Detect request or response
	 */

	if (msg.method && msg.path)
	{
		isRequest = true;
	}
	else if (msg.status)
	{
		isResponse = true;
	}
	else
	{
		logger.error('not a request nor a response');

		return;
	}

	/**
	 * Filter unknown keys and validate known keys' value
	 */

	for (key in msg)
	{
		switch (key)
		{
			case 'id':
			{
				id = msg.id;
				if (!isPositiveInteger(id))
				{
					logger.error('.id must be a positive integer');

					return;
				}

				break;
			}

			case 'method':
			{
				if (isResponse)
				{
					delete msg.method;

					break;
				}

				method = msg.method;
				if (typeof method !== 'string' || !method)
				{
					logger.error('.method must be a string');

					return;
				}

				break;
			}

			case 'path':
			{
				if (isResponse)
				{
					delete msg.path;

					break;
				}

				path = msg.path;
				if (typeof path !== 'string')
				{
					logger.error('.path must be a string');

					return;
				}
				if (path[0] !== '/')
				{
					logger.error('.path must start with /');

					return;
				}

				break;
			}

			case 'status':
			{
				if (isRequest)
				{
					delete msg.status;

					break;
				}

				status = msg.status;
				if (!isPositiveInteger(status) || status < 100 || status > 699)
				{
					logger.error('invalid .status');

					return;
				}

				break;
			}

			case 'reason':
			{
				if (isRequest)
				{
					delete msg.reason;

					break;
				}

				reason = msg.reason;
				if (typeof reason !== 'string')
				{
					logger.error('.reason must be a string');

					return;
				}

				break;
			}

			case 'data':
			{
				data = msg.data;
				if (typeof data !== 'object')
				{
					logger.error('.data must be a object');

					return;
				}

				break;
			}

			default:
				logger.error('deleting unknown field .%s', key);
				delete msg[key];
		}
	}

	/**
	 * Create a Request or Response instance
	 */

	if (isRequest)
		return Request.factory(msg);
	else
		return Response.factory(msg);
};
