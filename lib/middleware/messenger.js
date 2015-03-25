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
	var router = app.Router(),
		path = options.path || '/:username/:uuid?';

	router.route(path)
		.message(function(req) {
			var username = req.params.username,
				uuid = req.params.uuid,
				found;

			debug('target peer: [username:%s, uuid:%s]', username, uuid);

			found = app.peers(username, uuid, function(peerB) {
				debug('sending message request to %s', peerB);

				peerB.send(req);
			});

			if (found > 1) {
				req.reply(200, 'message sent to ' + found + ' peers');
			}
			else if (found === 1) {
				req.on('incomingResponse', function(res) {
					req.reply(res);
				});
			}
			else {
				req.reply(404, 'peer not found');
			}
		});

	return router;
}
