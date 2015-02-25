/**
 * Expose the finalHandler function.
 */
module.exports = finalHandler;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:finalHandler');


function finalHandler(req, options) {
	options = options || {};

	var env = options.env || process.env.NODE_ENV || 'development',
		onerror = options.onerror;

	return function(error) {
		debug('%s for %s', req.method, req.originalPath || req.path);

		var status,
			msg;

		// Schedule onerror callback.
		if (error && onerror) {
			setImmediate(onerror, error, req);
		}

		// If the request is replied exit now.
		if (req.ended) { return; }

		// Unhandled error.
		if (error) {
			// Respect error.status.
			status = error.status || 500;

			// 'production' env gets a basic error message.
			msg = env === 'production' ?
				'internal error: ' + error.toString() :
				'internal error: ' + (error.stack || error.toString());
		}

		// No error.
		else {
			status = 404;
			msg = 'no handler for ' + req.method + ' at ' + (req.originalPath || req.path);
		}

		debug('[status:%d, msg:"%s"]', status, msg);

		// Reply.
		req.reply(status, msg);
	};
}
