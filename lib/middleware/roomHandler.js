'use strict';

const logger = require('../logger')('middleware:roomHandler');
const utils = require('../utils');
const Room = require('../Room');

function roomHandler(app, options)
{
	options = utils.cloneObject(options);

	// Create a Router to be returned by the function
	let router = app.Router();
	let onroom = options.onroom;

	// Initial "session" request handler
	router.route('/rooms/:roomId')
		.session((req) =>
		{
			let roomId = req.params.roomId;
			let room = Room.get(roomId);

			// New Room
			if (!room)
			{
				logger.debug('creating new room [roomId:%s]', roomId);

				room = Room.add(
					{
						app      : app,
						roomId   : roomId,
						basePath : req.basePath + '/rooms'
					});

				// Emit "onroom" event
				if (onroom)
					onroom(room, req);
			}
			// Existing Room
			else
			{
				logger.debug('joining existing room [roomId:%s]', roomId);
			}

			room.handleSessionRequest(req);
		});

	// in-session requests handler
	router.route('/rooms/:roomId')
		.all((req) =>
		{
			let roomId = req.params.roomId;
			let room = Room.get(roomId);

			if (room)
			{
				logger.debug('in-session request for existing room [roomId:%s]', roomId);

				room.handleInSessionRequest(req);
			}
			else
			{
				logger.debug('no room found [roomId:%s]', roomId);

				req.reply(404, 'room not found');
			}
		});

	return router;
}

module.exports = roomHandler;
