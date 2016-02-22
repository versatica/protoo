'use strict';

const EventEmitter = require('events').EventEmitter;

const logger = require('./logger')('Room');
const Request = require('./Request');

const REJECT_CODE = { status: 403, reason: 'Rejected' };

// Set of Rooms
let rooms = new Map();

class Room extends EventEmitter
{
	constructor(app, path)
	{
		logger.debug('constructor() [path:"%s"]', path);

		super();
		this.setMaxListeners(Infinity);

		// Complete path of the room
		this._path = path;

		// Closed flag
		this._closed = false;

		// Set of Peers
		this._peers = new Set();

		// Store the Room in the set
		rooms.add(this);

		let router = app.Router();

		// Initial "session" request handler
		router.route('*')
			.session((req) =>
			{
				// TODO: pending issue: https://github.com/ibc/protoo/issues/5
				if (this._closed)
				{
					req.reply(404, 'closed');

					return;
				}

				let peer = req.peer;
				let done = false;

				req.reply(100, 'connecting',
					{
						sessionPath : this._path
					});

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

						// Emit "addpeer"
						this.emit('addpeer', peer);
					},
					// Reject function
					(status, reason) =>
					{
						if (done)
							return;

						done = true;

						status = status || REJECT_CODE.status;
						reason = reason || REJECT_CODE.reason;

						logger.debug('"joinrequest" event | reject() called [username:%s | uuid:%s]', peer.username, peer.uuid);

						req.reply(status, reason);
					});
			});
	}

	close()
	{
		logger.debug('close()');

		if (this._closed)
			return;

		this._closed = true;

		// Remove the Room from the set
		rooms.delete(this);

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

		this.emit('close');
	}

	get path()
	{
		return this._path;
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
		logger.debug('removePeer() [username:%s, uuid:%s]', peer.username, peer.uuid);

		if (this._closed)
			return;

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

	send(peer, method, data)
	{
		logger.debug('send() [username:%s, uuid:%s, method:%s]', peer.username, peer.uuid, method);

		if (this._closed)
			throw new Error('room closed');

		if (!this._peers.has(peer))
			throw new Error('peer does not exist in the room');

		data = data || {};

		// Add .sessionPath to data
		data.sessionPath = this._path;

		let req = Request.factory(
			{
				method : method,
				data   : data
			});

		peer.send(req);

		return req;
	}
}

module.exports = Room;
