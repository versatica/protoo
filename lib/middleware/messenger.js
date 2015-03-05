/**
 * Expose the messenger function.
 */
module.exports = messenger;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:messenger');
// var debugerror = require('debug')('protoo:ERROR:messenger');


function messenger(app, options) {
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
