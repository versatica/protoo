'use strict';

const process = require('process');
const EventEmitter = require('events').EventEmitter;

const logger = require('./logger')('Application');
const	Peer = require('./Peer');
const	WebSocketServer = require('./WebSocketServer');
const	Router = require('./Router');
const	methods = require('./methods');
const	finalHandler = require('./finalHandler');

const	C =
{
	CLOSE_CODES:
	{
		SHUTTING_DOWN    : { code: 1001, reason: 'shutting down' },
		ONLINE_ELSEWHERE : { code: 3000, reason: 'online elsewhere' }
	}
};

/**
 * Application emitted events
 *
 *
 * 'online'
 *
 * Emitted when a peer becomes online
 *
 * @event 'online'
 * @param {Peer} peer  The online peer
 *
 *
 * 'offline'
 *
 * Emitted when a peer becomes offline
 *
 * @event 'offline'
 * @param {Peer} peer  The offline peer
 *
 *
 * 'routingerror'
 *
 * Emitted when an error throws in runtime while routing/dispatching a request
 *
 * @event 'routingerror'
 * @param {Error} error
 */
class Application extends EventEmitter
{
	static addMethod(method)
	{
		Application.prototype[method] = function()
		{
			// app.get(setting)
			if (method === 'get' && arguments.length === 1)
				return this.set(arguments[0]);

			this.router[method](...arguments);
		};
	}

	constructor()
	{
		logger.debug('constructor()');

		super();
		this.setMaxListeners(Infinity);

		/**
		 * Settings map
		 * - 'env' {String}: Environment mode, by default NODE_ENV environment variable or “development”
		 * - 'case sensitive routing' {Boolean}: Enable case sensitivity.	Default disabled
		 * - 'strict routing' {Boolean}: Enable strict routing.	Default disabled
		 * - 'disconnect grace period' {Number}: Milliseconds to wait for a peer to reconnect before emitting 'offline'
		 */
		this._settings = new Map();

		// Map of Peers
		// - key: Peer username
		// - value: Map of Peer instances
		//   - key: Peer uuid
		//   - value: Peer instance
		this._peers = new Map();

		// Set of Servers
		this._servers = new Set();

		// Base Router
		this._router = null;

		// Set default 'env'
		this.set('env', process.env.NODE_ENV || 'development');
	}

	// The base Router
	get router()
	{
		if (!this._router)
		{
			this._router = new Router(
				{
					caseSensitive : this.enabled('case sensitive routing'),
					strict        : this.enabled('strict routing')
				});
		}

		return this._router;
	}

	/**
	 * Close the application and disconnect peers
	 * @param {Boolean} [closeServers=false]  Close the server(s) instead of just
	 *                                        disabling them
	 */
	close(closeServers)
	{
		logger.debug('close()');

		// Disconnect all the peers
		for (let uuids of this._peers.values())
		{
			for (let peer of uuids.values())
			{
				peer.close(C.CLOSE_CODES.SHUTTING_DOWN.code, C.CLOSE_CODES.SHUTTING_DOWN.reason);
			}
		}

		// Dissable/close the servers
		for (let server of this._servers)
		{
			server.close(closeServers);
		}
	}

	set(setting, value)
	{
		// If a single argument is given the user wants app.get(setting)
		if (arguments.length === 1)
			return this._settings.get(setting);

		logger.debug('set() [setting:%s, value:%s]', setting, value);

		this._settings.set(setting, value);

		return this;
	}

	enable(setting)
	{
		this._settings.set(setting, true);

		return this;
	}

	disable(setting)
	{
		this._settings.set(setting, false);

		return this;
	}

	enabled(setting)
	{
		return !!this._settings.get(setting);
	}

	disabled(setting)
	{
		return !!this._settings.get(setting);
	}

	/**
	 * Creates a Router with same settings as the application
	 * ('case sensitive routing' and 'strict routing') unless overriden
	 * by the given options object
	 */
	Router(options)
	{
		logger.debug('Router() [options:%o]', options);

		options = options || {};

		if (!options.hasOwnProperty('caseSensitive'))
			options.caseSensitive = this.enabled('case sensitive routing');

		if (!options.hasOwnProperty('strict'))
			options.strict = this.enabled('strict routing');

		return new Router(options);
	}

	/**
	 * Handle WebSocket connections.
	 *
	 * @method websocket
	 * @param {http.Server|https.Server} httpServer  A Node HTTP or HTTPS server.
	 * @param {Object} [options]  Options for the WebSocket server.
	 * @param {Function} requestListener
	 * @param {Object} requestListener.info
	 * @param {http.IncomingRequest} requestListener.info.req  The HTTP request
	 * of the client handshake.
	 * @param {String} requestListener.info.origin  The Origin header value in the
	 * client request (may be null).
	* @param {net.Socket} requestListener.info.socket  The Node net.Socket instance.
	 * @param {Function} requestListener.accept  Function the user must invoke
	 * to accept the connection by providing information about the connected peer.
	 * @param {String} requestListener.accept.username  Username of
	 * the peer.
	 * @param {String} requestListener.accept.uuid  UUID of the peer.
	 * @param {Object} requestListener.accept.data  Custom data for
	 * this peer.
	 * @param {Function} requestListener.reject  Function the user must invoke
	 * to reject the connection.
	 * @param {Number} requestListener.reject.code  Rejection cause code.
	 * @param {String} requestListener.reject.reason  Rejection description.
	 * @chainable
	 */
	websocket(httpServer, options, requestListener)
	{
		logger.debug('websocket()');

		if (arguments.length === 2)
		{
			requestListener = options;
			options = {};
		}

		if (!httpServer || (typeof httpServer.listen !== 'function'))
			throw new TypeError('given httpServer does not implement the listen() method');

		if (typeof requestListener !== 'function')
			throw new TypeError('requestListener must be a function with 3 arguments');

		let wsServer = new WebSocketServer(httpServer, options,
			{
				connection : requestListener,
				accepted   : this._addPeer.bind(this)
			});

		this._servers.add(wsServer);

		return this;
	}

	/**
	 * Proxy `Router#use()` to add middleware to the app router
	 */
	use()
	{
		this.router.use(...arguments);

		return this;
	}

	/**
	 * Proxy to the app `Router#route()`
	 * Returns a new `Route` instance for the _path_
	 */
	route(path)
	{
		return this.router.route(path);
	}

	/**
	 * Proxy to `Router#param()` with one added api feature. The _name_ parameter
	 * can be an array of names
	 * @param {String|Array} name
	 * @param {Function} fn
	 */
	param(name, fn)
	{
		if (Array.isArray(name))
		{
			for (let p of name)
			{
				this.param(p, fn);
			}
		}
		else
		{
			this.router.param(name, fn);
		}

		return this;
	}

	/**
	 * Return the number of found peers and run the given handler for all of them
	 * @param  {String} username    Peer's username
	 * @param  {String} [uuid]      Peer's uuid (optional, and can be omitted)
	 * @param  {Funcion} [handler]  Function to be called with each Peer
	 * @return {Number}  Number of peers found
	 */
	peers(username, uuid, handler)
	{
		// First parameter is a function
		if (typeof username === 'function')
		{
			handler = username;
			uuid = undefined;
			username = undefined;
		}
		// Second parameter is a function
		else if (typeof uuid === 'function')
		{
			handler = uuid;
			uuid = undefined;
			username = username;
		}

		// Ensure uuid is not given if username is not given
		if (!username && uuid)
			throw new Error('cannot provide uuid without username');

		// Username given
		if (username)
		{
			let uuids = this._peers.get(username);

			// If no uuids is found with the given username just return 0
			if (!uuids)
			{
				return 0;
			}
			// If uuid is given return 1 or 0 and run the handler
			else if (uuid)
			{
				let peer = uuids.get(uuid);

				if (peer)
				{
					if (handler)
						handler(peer);

					return 1;
				}
				else
				{
					return 0;
				}
			}
			// Otherwise return the number of peers and run the handler for them
			else
			{
				if (handler)
				{
					for (let peer of uuids.values())
					{
						handler(peer);
					}
				}

				return uuids.size;
			}
		}
		// No username given, retrieve all
		else
		{
			let numPeers = 0;

			for (let uuids of this._peers.values())
			{
				if (handler)
				{
					for (let peer of uuids.values())
					{
						handler(peer);
					}
				}

				numPeers += uuids.size;
			}

			return numPeers;
		}
	}

	peer(username, uuid)
	{
		let uuids = this._peers.get(username);

		// If no user is found with the given username just return
		if (!uuids)
		{
			return;
		}

		return uuids.get(uuid);
	}

	// TMP
	dump()
	{
		logger.debug('dump()');

		logger.debug('- peers:');

		for (let uuids of this._peers.values())
		{
			for (let peer of uuids.values())
			{
				logger.debug('  - %s', peer);
			}
		}
	}

	_addPeer(username, uuid, data, transport)
	{
		// TODO: remove
		logger.debug('_addPeer() [username:%s, uuid:%s]', username, uuid);

		// Validate/normalize provided peer data

		if (!username || typeof username !== 'string')
			throw new Error('`username` must be a string');

		if (!uuid || typeof uuid !== 'string')
			throw new Error('`uuid` must be a string');

		data = data || {};

		let uuids = this._peers.get(username);

		if (!uuids)
		{
			uuids = new Map();
			this._peers.set(username, uuids);
		}

		// If the same peer already exists disconnect the existing one and
		// replace it with the new one, but don't emit 'online' nor
		// 'offline'
		let peer = uuids.get(uuid);

		if (peer)
		{
			logger.debug('_addPeer() | peer already exists, assigning new transport [peer:%s, transport:%s]', peer, transport);

			let wasOnline = peer.online;

			peer.attachTransport(transport, C.CLOSE_CODES.ONLINE_ELSEWHERE.code, C.CLOSE_CODES.ONLINE_ELSEWHERE.reason);

			// If the existing peer was not online it was due to the disconnect grace period, so emit 'reconnect'
			if (!wasOnline)
				peer.emit('reconnect');

			return;
		}

		// Create new Peer
		peer = new Peer(username, uuid, data,
			{
				close: () =>
				{
					let disconnectGracePeriod = this.get('disconnect grace period');

					if (!disconnectGracePeriod || peer.closed)
					{
						this._removePeer(peer);
					}
					else
					{
						// Emit 'disconnect' in behalf of the peer and wait for the grace period
						peer.emit('disconnect');

						setTimeout(() =>
						{
							if (!peer.online)
								this._removePeer(peer);
						}, disconnectGracePeriod);
					}
				},

				request: (req) =>
				{
					this._handleRequest(peer, req);
				}
			});

		// Attach the transport to the peer
		peer.attachTransport(transport);

		// Save the new peer
		uuids.set(uuid, peer);

		logger.debug('_addPeer() | peer added: %s', peer);

		// Emit 'online' event
		logger.debug('emitting "online" [peer:%s]', peer);

		this.emit('online', peer);
	}

	_removePeer(peer)
	{
		let uuids = this._peers.get(peer.username);

		if (!uuids)
		{
			// Should not happen
			logger.error('_removePeer() | no peer found [username:%s]', peer.username);

			return;
		}

		if (!uuids.get(peer.uuid))
		{
			// Should not happen
			logger.error('_removePeer() | no peer found [username:%s, uuid:"%s"]', peer.username, peer.uuid);

			return;
		}

		if (uuids.get(peer.uuid) !== peer)
		{
			// This may happens if the same peer connects from elsewhere. At the time
			// its 'close' event is fired its entry in the Peers container has already
			// been replaced by a new Peer instance
			return;
		}

		// Remove the Peer.
		uuids.delete(peer.uuid);

		logger.debug('_addPeer() | peer removed: %s', peer);

		// If no other peers remove the map entry
		if (uuids.size === 0)
			this._peers.delete(peer.username);

		// Set the offline flag in the peer
		// TODO: I don't like this at all
		peer.offline = true;

		// Emit 'offline' event
		this.emit('offline', peer);

		// Emit 'offline' in behalf of the peer
		peer.emit('offline');
	}

	_handleRequest(peer, req)
	{
		logger.debug('_handleRequest() | [peer:%s, request:%s]', peer, req);

		// Attach the app and the peer to the request
		req.app = this;
		req.peer = peer;

		// Add the .sender field.
		req.sender =
		{
			username : peer.username,
			uuid     : peer.uuid
		};

		let onerror = (error) =>
		{
			this._logError(error, 'finalHandler got error');

			this.emit('routingerror', error);
		};

		this.router.handle(req, finalHandler(req, onerror));
	}

	_logError(error, msg)
	{
		let formattedError;

		// 'production' environment gets a basic error message
		if (this.get('env') === 'production')
			formattedError = (msg ? msg + ': ' : '') + error.toString();
		else
			formattedError = (msg ? msg + ': ' : '') + (error.stack || error.toString());

		logger.error(formattedError);

		// Just log to stderr unless 'test' environment
		if (this.get('env') !== 'test')
			console.error(formattedError);
	}
}

/**
 * Delegate `.METHOD(...)` calls to `Router#METHOD(...)`
 */
methods.concat('all').forEach((method) => Application.addMethod(method));

module.exports = Application;
