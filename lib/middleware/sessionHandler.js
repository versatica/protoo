/**
 * Expose the sessionHandler function.
 */
module.exports = sessionHandler;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:sessionHandler');
// var debugerror = require('debug')('protoo:ERROR:sessionHandler');
var randomString = require('random-string');
var sender = require('./sender');


function sessionHandler(app, options) {
	options = options || {};

	// Create a Router to be returned by the function.
	var router = app.Router(),
		path = options.path || '/:username/:uuid';

	/**
	 * Initial "session" request handler.
	 */
	router.route(path)
		.session(sender(), function(req) {
			var targetUsername = req.params.username,
				targetUuid = req.params.uuid,
				sessionId = randomString({length: 16}),
				sessionPath,
				found;

			debug('target peer: [username:%s, uuid:%s]', targetUsername, targetUuid);

			sessionPath = req.basePath + '/sessions/' + sessionId;

			req.data.sessionPath = sessionPath;

			var found = app.peers(targetUsername, targetUuid, function(peer) {
				debug('sending session request to %s', peer);

				peer.send(req);
			});

			if (! found) {
				req.reply(404, 'peer not found');
			}

			req.reply(100, 'connecting', {
				sessionPath: sessionPath
			});
		});

	/**
	 * "insession" request handler.
	 */
	router.route('/sessions/:sessionId')
		.insession(sender(), function(req) {
			debug('insession request for sessionId "%s": %s', req.params.sessionId, req);
		});

	return router;
}
