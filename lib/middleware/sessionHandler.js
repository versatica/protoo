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


function sessionHandler(app, options) {
	options = options || {};

	// Create a Router to be returned by the function.
	var router = app.Router(),
		path = options.path || '/:username/:uuid';

	/**
	 * Initial "session" request handler.
	 */
	router.route(path)
		.session(function(req) {
			var targetUsername = req.params.username,
				targetUuid = req.params.uuid,
				sessionId = randomString({length: 16}),
				sessionPath = req.basePath + '/sessions/' + sessionId,
				found;

			// TODO: Must ensure that both username and uuid are given. No forking for sessions.

			debug('target peer: [username:%s, uuid:%s]', targetUsername, targetUuid);

			// TODO: May be sessionPath should not be in .data but be an official req/res field.
			req.data.sessionPath = sessionPath;

			found = app.peers(targetUsername, targetUuid, function(peer) {
				debug('sending session request to %s', peer);

				peer.send(req);
			});

			if (found) {
				req.reply(100, 'connecting', {
					sessionPath: sessionPath
				});
			}
			else {
				req.reply(404, 'peer not found');
			}
		});

	/**
	 * "insession" request handler.
	 */
	router.route('/sessions/:sessionId')
		.insession(function(req) {
			debug('insession request for sessionId "%s": %s', req.params.sessionId, req);
		});

	return router;
}
