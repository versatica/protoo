/**
 * Expose the p2pMessenger function.
 */
module.exports = p2pMessenger;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:p2pMessenger');
// var debugerror = require('debug')('protoo:ERROR:p2pMessenger');


function p2pMessenger(app, options) {
	options = options || {};

	// Create a Router to be returned by the function.
	var router = app.Router();

	// Handle messages to /username/uuid (uuid is optional).
	router.route('/:username/:uuid?')
		.message(function(req) {
			var username = req.params.username,
				uuid = req.params.uuid;

			debug('message target peer: [username:%s, uuid:%s]', username, uuid);

			var numPeers = app.peers(username, uuid, function(peer) {
				debug('sending message to %s', peer);

				// Add "From" header.  // TODO
				req.from = {
					username: peer.username,
					uuid: peer.uuid
				};

				peer.send(req);
			});

			if (numPeers) {
				req.reply(200, 'chat sent to ' + numPeers + ' peers');
			}
			else {
				req.reply(404, 'peer not found');
			}
		});

	return router;
}
