const Logger = require('./Logger');
const EnhancedEventEmitter = require('./EnhancedEventEmitter');
const Peer = require('./Peer');

const logger = new Logger('Room');

class Room extends EnhancedEventEmitter
{
	/**
	 * @emits close
	 */
	constructor()
	{
		super(logger);

		logger.debug('constructor()');

		// Closed flag.
		// @type {Boolean}
		this._closed = false;

		// Map of Peers indexed by id.
		// @type {Map<String, Peer>}
		this._peers = new Map();
	}

	/**
	 * Whether the Room is closed.
	 *
	 * @returns {Boolean}
	 */
	get closed()
	{
		return this._closed;
	}

	/**
	 * Get the list of conneted Peers.
	 *
	 * @returns {Array<Peer>}
	 */
	get peers()
	{
		return Array.from(this._peers.values());
	}

	/**
	 * Clsoe the Room.
	 */
	close()
	{
		if (this._closed)
			return;

		logger.debug('close()');

		this._closed = true;

		// Close all Peers.
		for (const peer of this._peers.values())
		{
			peer.close();
		}

		// Emit 'close' event.
		this.safeEmit('close');
	}

	/**
	 * Create a Peer.
	 *
	 * @param {String} peerId
	 * @param {protoo.Transport} transport
	 *
	 * @returns {Peer}
	 * @throws {TypeError} if wrong parameters.
	 * @throws {Error} if Peer with same peerId already exists.
	 */
	createPeer(peerId, transport)
	{
		logger.debug(
			'createPeer() [peerId:%s, transport:%s]', peerId, transport);

		if (!transport)
			throw new TypeError('no transport given');

		if (typeof peerId !== 'string' || !peerId)
		{
			transport.close();

			throw new TypeError('peerId must be a string');
		}

		if (this._peers.has(peerId))
		{
			transport.close();

			throw new Error(
				`there is already a Peer with same peerId [peerId:"${peerId}"]`);
		}

		// Create the Peer instance.
		const peer = new Peer(peerId, transport);

		// Store it in the map.
		this._peers.set(peer.id, peer);
		peer.on('close', () => this._peers.delete(peerId));

		return peer;
	}

	/**
	 * Whether the Room has a Peer with given peerId.
	 *
	 * @returns {Booelan}
	 */
	hasPeer(peerId)
	{
		return this._peers.has(peerId);
	}

	/**
	 * Retrieve the Peer with  given peerId.
	 *
	 * @returns {Peer|Undefined}
	 */
	getPeer(peerId)
	{
		return this._peers.get(peerId);
	}
}

module.exports = Room;
