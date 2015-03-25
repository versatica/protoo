/**
 * Expose the Application class.
 */
module.exports = Application;


/**
 * Dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var https = require('https');
var debug = require('debug')('protoo:Application');
var debugerror = require('debug')('protoo:ERROR:Application');
var PeerManager = require('./PeerManager');
var WebSocketServer = require('./WebSocketServer');
var Router = require('./Router');
var methods = require('./methods');
var finalHandler = require('./finalHandler');


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
function Application() {
	debug('new()');

	EventEmitter.call(this);

	var self = this,
		router = null;

	/**
	 * Settings.
	 * - 'env' {String}: Environment mode, by default NODE_ENV environment variable or “development”.
	 * - 'case sensitive routing' {Boolean}: Enable case sensitivity.	Default disabled.
	 * - 'strict routing' {Boolean}: Enable strict routing.	Default disabled.
	 * - 'disconnect grace period' {Number}: Milliseconds to wait for a peer to reconnect before emitting 'offline'.
	 */
	this.settings = {};

	// The PeerManager instance.
	this.peerManager = new PeerManager(this, {
		online: function(peer) {
			debug('emitting "online" [peer:%s]', peer);
			self.emit('online',  peer);
		},

		offline: function(peer) {
			debug('emitting "offline" [peer:%s]', peer);
			self.emit('offline',  peer);
		},

		request: function(peer, req) {
			handleRequest.call(self, peer, req);
		}
	});

	// The servers container.
	this.servers = [];

	// Set default settings.
	setDefaultSettings.call(this);

	// The base Router.
	Object.defineProperty(this, 'router', {
		configurable: true,
		enumerable: true,
		get: function get_router() {
			if (router === null) {
				router = new Router({
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
Application.addMethod = function(method) {
	Application.prototype[method] = function() {
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
Application.prototype.close = function app_close(closeServers) {
	debug('close()');

	// Disconnect all the peers.
	this.peerManager.close();

	// Dissable/close the servers.
	this.servers.forEach(function(server) {
		server.close(closeServers);
	});
};


Application.prototype.set = function(setting, value) {
	debug('set() [setting:%s, value:%s]', setting, value);

	this.settings[setting] = value;

	return this;
};


Application.prototype.get = function(setting) {
	return this.settings[setting];
};


Application.prototype.enable = function(setting) {
	return this.set(setting, true);
};


Application.prototype.disable = function(setting) {
	return this.set(setting, false);
};


Application.prototype.enabled = function(setting) {
	return !!this.get(setting);
};


Application.prototype.disabled = function(setting) {
	return !this.get(setting);
};


/**
 * Creates a Router with same settings as the application
 * ('case sensitive routing' and 'strict routing') unless overriden
 * by the given options object.
 */
Application.prototype.Router = function(options) {
	debug('Router() [options:%o]', options);

	options = options || {};

	if (! options.hasOwnProperty('caseSensitive')) {
		options.caseSensitive = this.enabled('case sensitive routing');
	}

	if (! options.hasOwnProperty('strict')) {
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
Application.prototype.websocket = function app_websocket(httpServer, options, requestListener) {
	debug('websocket()');

	var self = this,
		wsServer;

	if (arguments.length === 2) {
		requestListener = options;
		options = {};
	}

	if (! httpServer instanceof(http.Server) && ! httpServer instanceof(https.Server)) {
		throw new TypeError('protoo.Application.websocket() | httpServer must be an instance of http.Server or https.Server');
	}

	if (typeof requestListener !== 'function') {
		throw new TypeError('protoo.Application.websocket() | requestListener must be a function with 3 arguments');
	}

	wsServer = new WebSocketServer(httpServer, options, {
		connection: requestListener,
		accepted: function(username, uuid, data, transport) {
			self.peerManager.addPeer(username, uuid, data, transport);
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
Application.prototype.use = function app_use() {
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
Application.prototype.route = function app_route(path) {
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
Application.prototype.param = function app_param(name, fn) {
	if (Array.isArray(name)) {
		for (var i=0; i<name.length; i++) {
			this.param(name[i], fn);
		}
	}
	else {
		this.router.param(name, fn);
	}

	return this;
};


/**
 * Delegate `.METHOD(...)` calls to `Router#METHOD(...)`.
 */
methods.concat('all').forEach(function(method) {
  Application.addMethod(method);
});


/**
 * Return the number of found peers and run the given handler for all of them.
 * @param  {String} username                 Peer's username.
 * @param  {String} [null] uuid              Peer's uuid (optional, and can be omitted).
 * @param  {Funcion} [null] handler handler  Function to be called with each forun Peer (optional).
 * @return {Number}  Number of peers found.
 */
Application.prototype.peers = function(username, uuid, handler) {
	return this.peerManager.peers(username, uuid, handler);
};


Application.prototype.peer = function(username, uuid) {
	return this.peerManager.peer(username, uuid);
};


/**
 * Private API.
 */


function setDefaultSettings() {
	debug('setDefaultSettings()');

	var env = process.env.NODE_ENV || 'development';
	this.set('env', env);
}


function handleRequest(peer, req, done) {
	debug('handleRequest() | [peer:%s, request:%s]', peer, req);

	var self = this;

	// Attach the app and the peer to the request.
	req.app = this;
	req.peer = peer;
	// Add the .sender field.
	req.sender = {
		username: peer.username,
		uuid: peer.uuid
	};

	done = done || finalHandler(req, onerror);

	function onerror(error) {
		logError.call(self, error, 'finalHandler got error');
		self.emit('routingError', error);
	}

	this.router.handle(req, done);
}


function logError(error, msg) {
	var formattedError;

	// 'production' environment gets a basic error message.
	if (this.env === 'production') {
		formattedError = (msg ? msg + ': ' : '') + error.toString();
	}
	else {
		formattedError = (msg ? msg + ': ' : '') + (error.stack || error.toString());
	}

	debugerror(formattedError);

	// Just log to stderr unless 'test' environment.
	if (this.get('env') !== 'test') {
		console.error(formattedError);
	}
}
