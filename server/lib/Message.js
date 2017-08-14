'use strict';

const logger = require('./logger')('Message');
const utils = require('./utils');

class Message
{
	static parse(raw)
	{
		let object;
		const message = {};

		try
		{
			object = JSON.parse(raw);
		}
		catch (error)
		{
			logger.error('parse() | invalid JSON: %s', error);

			return;
		}

		if (typeof object !== 'object' || Array.isArray(object))
		{
			logger.error('parse() | not an object');

			return;
		}

		if (typeof object.id !== 'number')
		{
			logger.error('parse() | missing/invalid id field');

			return;
		}

		message.id = object.id;

		// Request.
		if (object.request)
		{
			message.request = true;

			if (typeof object.method !== 'string')
			{
				logger.error('parse() | missing/invalid method field');

				return;
			}

			message.method = object.method;
			message.data = object.data || {};
		}
		// Response.
		else if (object.response)
		{
			message.response = true;

			// Success.
			if (object.ok)
			{
				message.ok = true;
				message.data = object.data || {};
			}
			// Error.
			else
			{
				message.errorCode = object.errorCode;
				message.errorReason = object.errorReason;
			}
		}
		// Invalid.
		else
		{
			logger.error('parse() | missing request/response field');

			return;
		}

		return message;
	}

	static requestFactory(method, data)
	{
		const request =
		{
			request : true,
			id      : utils.randomNumber(),
			method  : method,
			data    : data || {}
		};

		return request;
	}

	static successResponseFactory(request, data)
	{
		const response =
		{
			response : true,
			id       : request.id,
			ok       : true,
			data     : data || {}
		};

		return response;
	}

	static errorResponseFactory(request, errorCode, errorReason)
	{
		const response =
		{
			response : true,
			id       : request.id,
			code     : errorCode,
			reason   : errorReason
		};

		return response;
	}
}

module.exports = Message;
