var	debug = require('debug')('protoo:Application');
var	debugerror = require('debug')('protoo:ERROR:Application');
var EventEmitter = require('events').EventEmitter;
var	util = require('util');

var	Peer = require('./Peer');
var	WebSocketServer = require('./WebSocketServer');
var	Router = require('./Router');
var	methods = require('./methods');
var	finalHandler = require('./finalHandler');

const	C =
{
	CLOSE_CODES:
	{
		SHUTTING_DOWN    : { code: 1001, reason: 'shutting down' },
		ONLINE_ELSEWHERE : { code: 3000, reason: 'online elsewhere' }
	}
};

module.exports = Application;

/**
 * Application emitted events.
 *
 *
 * 'online'
 *
 * Emitted when a peer becomes online.
 *
 * @event 'online'
 * @param {Peer} peer  The online peer.
 *
 *
 * 'offline'
 *
 * Emitted when a peer becomes offline.
 *
 * @event 'offline'
 * @param {Peer} peer  The offline peer.
 *
 *
 * 'routingError'
 *
 * Emitted when an error throws in runtime while routing/dispatching a request.
 *
 * @event 'routingError'
 * @param {Error} error
 */

/**
 * The application the user is provided with.
 *
 * @class Application
 * @constructor
 */
function Application()
{
	debug('new()');

	var router = null;

	EventEmitter.call(this);

	/**
	 * Settings.
	 * - 'env' {String}: Environment mode, by default NODE_ENV environment variable or “development”.
	 * - 'case sensitive routing' {Boolean}: Enable case sensitivity.	Default disabled.
	 * - 'strict routing' {Boolean}: Enable strict routing.	Default disabled.
	 * - 'disconnect grace period' {Number}: Milliseconds to wait for a peer to reconnect before emitting 'offline'.
	 */
	this.settings = {};

	// The Peers container. Keys are username with uuids as subkeys.
	this.users = {};

	// The servers container.
	this.servers = [];

	// Set default settings.
	setDefaultSettings.call(this);

	// The base Router.
	Object.defineProperty(this, 'router',
		{
			configurable: true,
			enumerable: true,
			get: function()
			{
				if (router === null)
				{
					router = new Router(
						{
							caseSensitive: this.enabled('case sensitive routing'),
							strict: this.enabled('strict routing')
						});
				}

				return router;
			}
		});

	debug('booting in %s mode', this.get('env'));
}

util.inherits(Application, EventEmitter);

/**
 * Class methods.
 */

/**
 * Add custom method.
 */
Application.addMethod = function(method)
{
	Application.prototype[method] = function()
	{
		// app.get(setting)
		if (method === 'get' && arguments.length === 1)
		{
			return this.set(arguments[0]);
		}

		this.router[method].apply(this.router, arguments);
	};
};

/**
 * Public API.
 */

/**
 * Close the application and disconnect peers.
 *
 * @method close
 * @param {Boolean} [closeServers=false]  Close the server(s) instead of just
 * disabling them.
 */
Application.prototype.close = function(closeServers)
{
	debug('close()');

	var username;
	var user;
	var uuid;
	var peer;

	// Disconnect all the peers.
	for (username in this.users)
	{
		user = this.users[username];
		for (uuid in user)
		{
			peer = user[uuid];
			peer.close(C.CLOSE_CODES.SHUTTING_DOWN.code, C.CLOSE_CODES.SHUTTING_DOWN.reason);
		}
	}

	// Dissable/close the servers.
	this.servers.forEach(function(server)
	{
		server.close(closeServers);
	});
};

Application.prototype.set = function(setting, value)
{
	// If a single argument is given the user wants app.get(setting).
	if (arguments.length === 1)
	{
		return this.settings[setting];
	}

	debug('set() [setting:%s, value:%s]', setting, value);

	this.settings[setting] = value;
	return this;
};

Application.prototype.enable = function(setting)
{
	return this.set(setting, true);
};

Application.prototype.disable = function(setting)
{
	return this.set(setting, false);
};

Application.prototype.enabled = function(setting)
{
	return !!this.get(setting);
};

Application.prototype.disabled = function(setting)
{
	return !this.get(setting);
};

/**
 * Creates a Router with same settings as the application
 * ('case sensitive routing' and 'strict routing') unless overriden
 * by the given options object.
 */
Application.prototype.Router = function(options)
{
	debug('Router() [options:%o]', options);

	options = options || {};

	if (!options.hasOwnProperty('caseSensitive'))
	{
		options.caseSensitive = this.enabled('case sensitive routing');
	}

	if (!options.hasOwnProperty('strict'))
	{
		options.strict = this.enabled('strict routing');
	}

	return new Router(options);
};

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
Application.prototype.websocket = function(httpServer, options, requestListener)
{
	debug('websocket()');

	var self = this;
	var wsServer;

	if (arguments.length === 2)
	{
		requestListener = options;
		options = {};
	}

	if (!httpServer || (typeof httpServer.listen !== 'function'))
	{
		throw new TypeError('protoo.Application.websocket() | given httpServer does not implement the listen() method');
	}

	if (typeof requestListener !== 'function')
	{
		throw new TypeError('protoo.Application.websocket() | requestListener must be a function with 3 arguments');
	}

	wsServer = new WebSocketServer(httpServer, options,
		{
			connection: requestListener,
			accepted: function()
			{
				addPeer.apply(self, arguments);
			}
		});

	this.servers.push(wsServer);
	return this;
};

/**
 * Proxy `Router#use()` to add middleware to the app router.
 *
 * @method use
 * @chainable
 */
Application.prototype.use = function()
{
	this.router.use.apply(this.router, arguments);
	return this;
};

/**
 * Proxy to the app `Router#route()`
 * Returns a new `Route` instance for the _path_.
 *
 * @method use
 * @chainable
 */
Application.prototype.route = function(path)
{
	return this.router.route(path);
};

/**
 * Proxy to `Router#param()` with one added api feature. The _name_ parameter
 * can be an array of names.
 *
 * @param {String|Array} name
 * @param {Function} fn
 * @chainable
 */
Application.prototype.param = function kk(name, fn)
{
	var i;

	if (Array.isArray(name))
	{
		for (i = 0; i < name.length; i++)
		{
			this.param(name[i], fn);
		}
	}
	else
	{
		this.router.param(name, fn);
	}

	return this;
};

/**
 * Delegate `.METHOD(...)` calls to `Router#METHOD(...)`.
 */
methods.concat('all').forEach(function(method)
{
	Application.addMethod(method);
});

/**
 * Return the number of found peers and run the given handler for all of them.
 * @param  {String} username                 Peer's username.
 * @param  {String} [null] uuid              Peer's uuid (optional, and can be omitted).
 * @param  {Funcion} [null] handler handler  Function to be called with each forun Peer (optional).
 * @return {Number}  Number of peers found.
 */
Application.prototype.peers = function(username, uuid, handler)
{
	var user;
	var peer;
	var numPeers = 0;

	// Fix optional params usage.

	// First parameter is a function.
	if (typeof username === 'function')
	{
		handler = username;
		uuid = undefined;
		username = undefined;
	}
	// Second parameter is a function.
	else if (typeof uuid === 'function')
	{
		handler = uuid;
		uuid = undefined;
		username = username;
	}

	// Ensure uuid is not given if username is not given.
	if (!username && uuid)
	{
		throw new Error('cannot provide uuid without username');
	}

	// Username given.
	if (username)
	{
		user = this.users[username];

		// If no user is found with the given username just return 0.
		if (!user)
		{
			return 0;
		}
		// If uuid is given return 1 or 0 and run the handler.
		else if (uuid)
		{
			peer = user[uuid];

			if (peer)
			{
				if (handler)
				{
					handler(peer);
				}
				return 1;
			}
			else
			{
				return 0;
			}
		}
		// Otherwise return the number of peers and run the handler for them.
		else
		{
			if (handler)
			{
				for (uuid in user)
				{
					handler(user[uuid]);
				}
			}
			return Object.keys(user).length;
		}
	}
	// No username given, retrieve all.
	else
	{
		for (username in this.users)
		{
			user = this.users[username];
			if (handler)
			{
				for (uuid in user)
				{
					handler(user[uuid]);
				}
			}
			numPeers += Object.keys(user).length;
		}
		return numPeers;
	}
};

Application.prototype.peer = function(username, uuid)
{
	var user = this.users[username];

	// If no user is found with the given username just return 0.
	if (!user)
	{
		return undefined;
	}

	return user[uuid];
};

// TODO: TMP
Application.prototype.dump = function()
{
	debug('dump()');

	var username;
	var user;
	var uuid;
	var peer;

	for (username in this.users)
	{
		user = this.users[username];
		for (uuid in user)
		{
			peer = user[uuid];
			debug('- %s', peer);
			debug('  [num client transactions: %d]', Object.keys(peer.clientTransactions).length);
			debug('  [num response senders: %d]', Object.keys(peer.responseSenders).length);
		}
	}
};

/**
 * Private API.
 */

function setDefaultSettings()
{
	debug('setDefaultSettings()');

	var env = process.env.NODE_ENV || 'development';

	this.set('env', env);
}

function addPeer(username, uuid, data, transport)
{
	var self = this;
	var user;
	var peer;
	var wasOnline;

	data = data || {};

	// Validate/normalize provided peer data.
	if (typeof username !== 'string')
	{
		throw new Error('protoo.PeerManager.addPeer() | username must be a string');
	}
	if (typeof uuid !== 'string')
	{
		throw new Error('protoo.PeerManager.addPeer() | uuid must be a string');
	}
	if (typeof data !== 'object')
	{
		throw new Error('protoo.PeerManager.addPeer() | data must be an object');
	}

	user = this.users[username] || (this.users[username] = {});

	// If the same peer already exists disconnect the existing one and
	// replace it with the new one, but don't emit 'online' nor
	// 'offline'.
	if ((peer = user[uuid]))
	{
		debug('addPeer() | peer already exists: %s, assigning new transport: %s', peer, transport);

		wasOnline = peer.online;

		peer.attachTransport(transport, C.CLOSE_CODES.ONLINE_ELSEWHERE.code, C.CLOSE_CODES.ONLINE_ELSEWHERE.reason);
		// TODO: sure? middlewares may have inserted useful info into peer's data...
		// Better a merge?
		peer.data = data;

		// If the existing peer was not online it was due to the disconnect grace period.
		// If so, emit 'reconnect'.
		if (!wasOnline)
		{
			peer.emit('reconnect');
		}

		return;
	}

	// Create new Peer.
	peer = new Peer(username, uuid, data,
		{
			close: function()
			{
				var disconnectGracePeriod = self.get('disconnect grace period');

				if (!disconnectGracePeriod || peer.closed)
				{
					removePeer.call(self, peer);
				}
				else
				{
					// Emit 'disconnect' in behalf of the peer and wait for the grace period.
					peer.emit('disconnect');

					setTimeout(function()
					{
						if (!peer.online)
						{
							removePeer.call(self, peer);
						}
					}, disconnectGracePeriod);
				}
			},

			request: function(req)
			{
				handleRequest.call(self, peer, req);
			}
		});

	// Attach the transport to the peer.
	peer.attachTransport(transport);

	// Save the new peer.
	user[uuid] = peer;
	debug('addPeer() | peer added %s', peer);

	// Emit 'online' event.
	debug('emitting "online" [peer:%s]', peer);
	this.emit('online',  peer);
}

function removePeer(peer)
{
	var user = this.users[peer.username];

	if (!user)
	{
		// Should not happen.
		debugerror('removePeer() | no peer with username "%s"', peer.username);
		return;
	}

	if (!user[peer.uuid])
	{
		// Should not happen.
		debugerror('removePeer() | no peer with username "%s" and uuid "%s"', peer.username, peer.uuid);
		return;
	}

	if (user[peer.uuid] !== peer)
	{
		// This may happens if the same peer connects from elsewhere. At the time
		// its 'close' event is fired its entry in the Peers container has already
		// been replaced by a new Peer instance.
		return;
	}

	// Remove the Peer.
	delete user[peer.uuid];
	debug('removePeer() | peer removed %s', peer);

	// If no other peers remove the 'user' entry.
	if (Object.keys(user).length === 0)
	{
		delete this.users[peer.username];
	}

	// Set the offline flag in the peer.
	peer.offline = true;
	// Emit 'offline' event.
	this.emit('offline', peer);
	// Emit 'offline' in behalf of the peer.
	peer.emit('offline');
}

function handleRequest(peer, req)
{
	debug('handleRequest() | [peer:%s, request:%s]', peer, req);

	var self = this;

	// Attach the app and the peer to the request.
	req.app = this;
	req.peer = peer;
	// Add the .sender field.
	req.sender =
	{
		username: peer.username,
		uuid: peer.uuid
	};

	function onerror(error)
	{
		logError.call(self, error, 'finalHandler got error');
		self.emit('routingError', error);
	}

	this.router.handle(req, finalHandler(req, onerror));
}

function logError(error, msg)
{
	var formattedError;

	// 'production' environment gets a basic error message.
	if (this.env === 'production')
	{
		formattedError = (msg ? msg + ': ' : '') + error.toString();
	}
	else
	{
		formattedError = (msg ? msg + ': ' : '') + (error.stack || error.toString());
	}

	debugerror(formattedError);

	// Just log to stderr unless 'test' environment.
	if (this.get('env') !== 'test')
	{
		console.error(formattedError);
	}
}
