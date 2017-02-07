'use strict';

const EventEmitter = require('events').EventEmitter;
const path = require('path');

const logger = require('./logger')('Room');
const Request = require('./Request');

// Map of Rooms
let rooms = new Map();

class Room extends EventEmitter
{
	static add(data)
	{
		let room = new Room(data);

		// Add the new room to the rooms container
		rooms.set(data.roomId, room);

		return room;
	}

	static get(roomId)
	{
		return rooms.get(roomId);
	}

	constructor(data)
	{
		super();
		this.setMaxListeners(Infinity);

		this._roomId = data.roomId;

		// The protoo app
		this._app = data.app;

		// Complete path of the room
		this._path = path.join(data.basePath, data.roomId);

		logger.debug('constructor() [path:%s]', this._path);

		// Set of Peers
		this._peers = new Set();

		// Closed flag
		this._closed = false;
	}

	close()
	{
		if (this._closed)
			return;

		logger.debug('close()');

		this._closed = true;

		// Send "end" request to all the peers
		for (let peer of this._peers)
		{
			peer.send(Request.factory(
				{
					method : 'end',
					data   :
					{
						sessionPath : this._path
					}
				}));
		}

		// Empty the set of peers
		this._peers.clear();

		// Remove from the map.
		rooms.delete(this._roomId);

		// Emit event.
		this.emit('close');
	}

	get closed()
	{
		return this._closed;
	}

	get roomId()
	{
		return this._roomId;
	}

	get peers()
	{
		return Array.from(this._peers);
	}

	hasPeer(peer)
	{
		return this._peers.has(peer);
	}

	removePeer(peer)
	{
		if (this._closed)
			return;

		logger.debug('removePeer() [username:%s, uuid:%s]', peer.username, peer.uuid);

		if (!this._peers.has(peer))
		{
			logger.warn('removePeer() | peer does not exist in this room [username:%s, uuid:%s]', peer.username, peer.uuid);

			return;
		}

		// Rmove the Peer from the set
		this._peers.delete(peer);

		// Generate a "end" request and send it to the peer
		peer.send(Request.factory(
			{
				method : 'end',
				data   :
				{
					sessionPath : this._path
				}
			}));

		this.emit('removepeer', peer);
	}

	send(toPeer, method, data)
	{
		logger.debug('send() [username:%s, uuid:%s, method:%s]', toPeer.username, toPeer.uuid, method);

		if (this._closed)
		{
			logger.error('room closed');

			return;
		}

		if (!this._peers.has(toPeer))
		{
			logger.error('peer does not exist in the room');

			return;
		}

		data = data || {};

		// Add .sessionPath to data
		data.sessionPath = this._path;

		let req = Request.factory(
			{
				method : method,
				data   : data
			});

		setImmediate(() => toPeer.send(req));

		return req;
	}

	sendToAll(fromPeer, method, data)
	{
		logger.debug('sendToAll() [username:%s, uuid:%s, method:%s]', fromPeer.username, fromPeer.uuid, method);

		if (this._closed)
		{
			logger.error('room closed');

			return;
		}

		let reqs = [];

		// Send request to all the peers
		for (let peer of this._peers)
		{
			if (peer === fromPeer)
				continue;

			data = data || {};
			data.sessionPath = this._path;

			let req = Request.factory(
				{
					method : method,
					data   : data,
					sender :
					{
						username : fromPeer.username,
						uuid     : fromPeer.uuid
					}
				});

			reqs.push({ peer: peer, req: req });

			send(peer, req);
		}

		function send(peer, req)
		{
			setImmediate(() => peer.send(req));
		}

		return reqs;
	}

	handleSessionRequest(req)
	{
		logger.debug('handleSessionRequest()');

		let peer = req.peer;
		let done = false;

		if (this._peers.has(peer))
		{
			logger.warn('handleSessionRequest() | peer already exists in the room');

			req.reply(500, 'peer already exits in the room');
			return;
		}

		this.emit('joinrequest', peer, req.data,
			// Accept function
			(data) =>
			{
				if (done)
					return;

				done = true;

				logger.debug('"joinrequest" event | accept() called [username:%s | uuid:%s]', peer.username, peer.uuid);

				// Add the Peer to the set
				this._peers.add(peer);

				data = data || {};

				// Add .sessionPath to data
				data.sessionPath = this._path;

				req.reply(200, 'OK', data);

				// Handle peer abrupt disconnection
				peer.on('offline', () =>
				{
					if (this._peers.has(peer))
						this.removePeer(peer);
				});

				// Emit "addpeer"
				this.emit('addpeer', peer);
			},
			// Reject function
			(status, reason) =>
			{
				if (done)
					return;

				done = true;

				status = status || 403;
				reason = reason || 'rejected';

				logger.debug('"joinrequest" event | reject() called [username:%s | uuid:%s]', peer.username, peer.uuid);

				req.reply(status, reason);
			});
	}

	handleInSessionRequest(req)
	{
		logger.debug('handleInSessionRequest()');

		let peer = req.peer;

		if (!this._peers.has(peer))
		{
			logger.warn('handleInSessionRequest() | peer does not exist in the room');

			req.reply(481, 'peer does not exist in the room');
			return;
		}

		switch (req.method)
		{
			case 'end':
			{
				// Rmove the Peer from the set
				this._peers.delete(peer);

				req.reply(200, 'OK');

				this.emit('removepeer', peer);

				break;
			}

			case 'private':
			{
				let toPeer = this._app.peer(req.data.peer.username, req.data.peer.uuid);

				if (!toPeer)
				{
					logger.warn('handleInSessionRequest() | destination peer does not exist [username:"%s", peer:"%s"]',
						req.data.peer.username, req.data.peer.uuid);

					req.reply(404, 'destination peer does not exist');
					return;
				}

				req.data = req.data || {};
				req.data.sessionPath = this._path;
				req.data.sender =
				{
					username : req.peer.username,
					uuid     : req.peer.uuid
				};

				toPeer.send(req);

				req.on('incomingResponse', (res) =>
				{
					req.reply(res);
				});

				break;
			}

			default:
			{
				req.reply(405, 'method not implemented');
			}
		}
	}
}

module.exports = Room;
