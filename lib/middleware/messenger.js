/**
 * Expose the messenger function.
 */
module.exports = messenger;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:messenger');
// var debugerror = require('debug')('protoo:ERROR:messenger');
// var sender = require('./sender');


function messenger(app, options) {
	options = options || {};

	// Create a Router to be returned by the function.
	var router = app.Router(),
		path = options.path || '/:username/:uuid?';

	router.param('username', function(req, next, username) {
		console.log('------------------- username: %s', username);
		req.reply(400);
	});

	router.route(path)
		.message(function(req) {
			var targetUsername = req.params.username,
				targetUuid = req.params.uuid,
				found;

			debug('target peer: [username:%s, uuid:%s]', targetUsername, targetUuid);

			found = app.peers(targetUsername, targetUuid, function(peer) {
				debug('sending message request to %s', peer);

				peer.send(req);
			});

			if (found) {
				req.reply(200, 'message sent to ' + found + ' peers');
			}
			else {
				req.reply(404, 'peer not found');
			}
		});

	return router;
}
