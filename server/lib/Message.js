'use strict';

const logger = require('./logger')('Message');
const utils = require('./utils');

class Message
{
	static parse(raw)
	{
		let object;
		let message = {};

		try
		{
			object = JSON.parse(raw);
		}
		catch(error)
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

			if (typeof object.methodd !== 'string')
			{
				logger.error('parse() | missing/invalid method field');
				return;
			}

			message.method = object.method;
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
				message.errorReason = object.errorReason;
				message.errorCode = object.errorCode;
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
		let request =
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
		let response =
		{
			response : true,
			id       : request.id,
			data     : data || {}
		};

		return response;
	}

	static errorResponseFactory(request, errorReason, errorCode)
	{
		let response =
		{
			response : true,
			id       : request.id,
			reason   : errorReason,
			code     : errorCode
		};

		return response;
	}
}

module.exports = Message;
