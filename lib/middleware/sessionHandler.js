'use strict';

const logger = require('../logger')('middleware:sessionHandler');
const utils = require('../utils');
const Session = require('../Session');

function sessionHandler(app, options)
{
	options = utils.cloneObject(options);

	// Create a Router to be returned by the function
	let router = app.Router();
	let path = options.path || '/:username/:uuid';
	let onsession = options.onsession;

	// Initial "session" request handler
	router.route(path)
		.session((req) =>
		{
			let username = req.params.username;
			let uuid = req.params.uuid;

			// Ensure that both username and uuid are given
			if (!username || !uuid)
			{
				logger.debug('both username and uuid must be given, replying 400');

				req.reply(400, 'no username and/or uuid given');
				return;
			}

			logger.debug('target peer: [username:%s, uuid:%s]', username, uuid);

			let peer = app.peer(username, uuid);

			if (peer)
			{
				logger.debug('remote peer found: %s', peer);

				// Create the session
				let session = Session.add(
					{
						req      : req,
						peerA    : req.peer,
						peerB    : peer,
						basePath : req.basePath + '/sessions'
					});

				// Emit "onsession" event
				if (onsession)
					onsession(session, req);

				// If not rejected by the app, send the request to the destination peer
				if (!req.ended)
					session.send();
			}
			else
			{
				req.reply(404, 'peer not found');

				return;
			}
		});

	// in-session requests handler
	router.route('/sessions/:id')
		.all((req) =>
		{
			let session = Session.get(req.params.id);

			if (session)
			{
				logger.debug('in-session request for session "%s": %s', req.params.id, req);

				session.handleRequest(req);
			}
			else
			{
				logger.debug('no session found with id "%s"', req.params.id);

				req.reply(404, 'session not found');
			}
		});

	return router;
}

module.exports = sessionHandler;
