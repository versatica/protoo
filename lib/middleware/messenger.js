'use strict';

const logger = require('../logger')('middleware:messenger');
const utils = require('../utils');

function messenger(app, options)
{
	options = utils.cloneObject(options);

	// Create a Router to be returned by the function
	let router = app.Router();
	let path = options.path || '/:username/:uuid?';

	router.route(path)
		.message((req) =>
		{
			let username = req.params.username;
			let uuid = req.params.uuid;

			logger.debug('target peer: [username:%s, uuid:%s]', username, uuid);

			let found = app.peers(username, uuid, (peerB) =>
			{
				logger.debug('sending message request to %s', peerB);

				peerB.send(req);
			});

			if (found === 1)
			{
				req.on('incomingResponse', (res) =>
				{
					req.reply(res);
				});
			}
			else if (found > 1)
			{
				req.reply(200, 'message sent to ' + found + ' peers');
			}
			else
			{
				req.reply(404, 'peer not found');
			}
		});

	return router;
}

module.exports = messenger;
