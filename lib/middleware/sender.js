/**
 * Expose the sender function.
 */
module.exports = sender;


/**
 * Dependencies.
 */
// var debug = require('debug')('protoo:sender');
// var debugerror = require('debug')('protoo:ERROR:sender');


function sender(options) {
	options = options || {};

	return function(req, next) {
		var peer = req.peer;

		// Remove the .path field.
		delete req.path;

		if (peer) {
			req.sender = {
				username: peer.username,
				uuid: peer.uuid
			};
		}

		next();
	};
}
