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

	get peers()
	{
		return Array.from(this._peers.values());
	}

	get closed()
	{
		return this._closed;
	}

	createPeer(peerId, transport)
	{
		logger.debug('createPeer() [peerId:"%s", transport:%s]', peerId, transport);

		if (!transport)
			return Promise.reject(new TypeError('no transport given'));

		if (!peerId || typeof peerId !== 'string')
		{
			transport.close();
			return Promise.reject(new TypeError('peerId must be a string'));
		}

		if (this._peers.has(peerId))
		{
			transport.close();
			return Promise.reject(new Error(`there is already a peer with same peerId [peerId:"${peerId}"]`));
		}

		// Create the Peer instance.
		let peer = new Peer(peerId, transport);

		// Store it in the map.
		this._peers.set(peer.id, peer);

		// Handle peer.
		this._handlePeer(peer);

		return Promise.resolve(peer);
	}

	hasPeer(peerId)
	{
		return this._peers.has(peerId);
	}

	getPeer(peerId)
	{
		return this._peers.get(peerId);
	}

	spread(method, data, excluded)
	{
		logger.debug('spread()');

		let excludedSet = new Set();

		if (excluded)
		{
			if (!Array.isArray(excluded))
				excluded = [ excluded ];

			for (let entry of excluded)
			{
				if (typeof entry === 'string')
				{
					let peer = this._peers.get(entry);

					if (peer)
						excludedSet.add(peer);
				}
				else
				{
					excludedSet.add(entry);
				}
			}
		}

		for (let peer of this._peers.values())
		{
			if (excludedSet.has(peer))
				continue;

			peer.send(method, data)
				.catch((error) =>
				{
					logger.warn('peer.send() failed, request could not be sent: %s', error);
				});
		}
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

	_handlePeer(peer)
	{
		peer.on('close', () =>
		{
			// Remove from the map.
			this._peers.delete(peer.id);
		});
	}
}

module.exports = Room;
