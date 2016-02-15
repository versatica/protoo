'use strict';

const logger = require('./logger')('finalHandler');

module.exports = function(req, onerror)
{
	return function(error)
	{
		logger.debug('%s for %s', req.method, req.originalPath || req.path);

		let status;
		let msg;

		// Schedule onerror callback
		if (error && onerror)
			setImmediate(onerror, error, req);

		// Unhandled error
		if (error)
		{
			// Respect error.status
			status = error.status || 500;

			// 'production' env gets a basic error message
			msg = error.toString();
		}
		// No error
		else
		{
			status = 404;

			msg = `no handler for ${req.method} at ${req.originalPath || req.path}`;
		}

		logger.debug('[status:%d, msg:"%s"]', status, msg);

		// If the request is already replied don't reply a final response
		if (req.ended)
			return;

		// Reply
		req.reply(status, msg);
	};
};
