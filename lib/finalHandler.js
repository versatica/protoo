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
		var msg,
			statusCode = 500;

		// Unhandled error.
		if (error) {
			// Respect error.status.
			if (error.status) {
				statusCode = error.status;
			}

			// 'production' env gets a basic error message.
			msg = env === 'production' ?
				'internal error: ' + error.toString() :
				'internal error: ' + (error.stack || error.toString());
		}

		// No error.
		else {
			statusCode = 404;
			msg = 'cannot handle ' + req.method + ' for ' + (req.originalPath || req.path);
		}

		debug('[status:%d, msg:"%s"]', statusCode, msg);

		// Schedule onerror callback.
		if (error && onerror) {
			setImmediate(onerror, error, req);
		}

		// TODO: send the reponse :)
	};
}
