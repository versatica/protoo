'use strict';

const EventEmitter = require('events').EventEmitter;
const logger = require('./logger')('Room');
const Peer = require('./Peer');

class Room extends EventEmitter
{
	constructor()
	{
		logger.debug('constructor()');

		super();
		this.setMaxListeners(Infinity);

		// Closed flag.
		this._closed = false;

		// Map of peers indexed by peerId.
		this._peers = new Map();
	}

	get closed()
	{
		return this._closed;
	}

	close()
	{
		logger.debug('close()');

		if (this._closed)
			return;

		this._closed = true;

		// Close all the peers.
		this._peers.forEach((peer) => peer.close());

		// Emit 'close' event.
		this.emit('close');
	}

	createPeer(peerId, transport)
	{
		logger.debug('createPeer() [peerId:"%s", transport:%s]', peerId, transport);

		if (this._peers.has(peerId))
			throw new Error('there is already a peer with same peerId [peerId:"${peerId}"]');

		// Create the Peer instance.
		let peer = new Peer(peerId, transport);

		// Store it in the map.
		this._peers.set(peer.id, Peer);

		// Handle peer.
		this._handlePeer(peer);

		return peer;
	}

	_handlePeer(peer)
	{
		peer.on('close', () =>
		{
			// Remove from the map.
			this._peers.delete(peer.id);
		})
	}
}

module.exports = Room;
