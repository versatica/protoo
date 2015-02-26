/**
 * Expose the Application class.
 */
module.exports = Application;


/**
 * Dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var http = require('http');
var https = require('https');
var util = require('util');
var debug = require('debug')('protoo:Application');
var debugerror = require('debug')('protoo:ERROR:Application');
var PeerManager = require('./PeerManager');
var WebSocketServer = require('./WebSocketServer');
var Router = require('./Router');
var methods = require('./methods');
var finalHandler = require('./finalHandler');


/**
 * Local variables.
 */
var slice = Array.prototype.slice;


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
 * 'error:route'
 *
 * Emitted when an error throws in runtime while routing/dispathing a request.
 *
 * @event 'error:route'
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

	// Settings.
	this.settings = {};

	// The PeerManager instance.
	this.peerManager = new PeerManager({
		online: function(peer) {
			self.emit('online',  peer);
		},

		offline: function(peer) {
			self.emit('offline', peer);
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
 * @param {Function} onConnection
 * @param {Object} onConnection.info
 * @param {http.IncomingRequest} onConnection.info.req  The HTTP request
 * of the client handshake.
 * @param {String} onConnection.info.origin  The Origin header value in the
 * client request (may be null).
* @param {net.Socket} onConnection.info.socket  The Node net.Socket instance.
 * @param {Function} onConnection.accept  Function the user must invoke
 * to accept the connection by providing information about the connected peer.
 * @param {String} onConnection.accept.username  Username of
 * the peer.
 * @param {String} onConnection.accept.uuid  UUID of the peer.
 * @param {Object} onConnection.accept.data  Custom data for
 * this peer.
 * @param {Function} onConnection.reject  Function the user must invoke
 * to reject the connection.
 * @param {Number} onConnection.reject.code  Rejection cause code.
 * @param {String} onConnection.reject.reason  Rejection description.
 * @chainable
 */
Application.prototype.websocket = function app_websocket(httpServer, onConnection) {
	debug('websocket()');

	var self = this,
		wsServer;

	if (! httpServer instanceof(http.Server) && ! httpServer instanceof(https.Server)) {
		throw new TypeError('protoo.Application.websocket() | httpServer must be an instance of http.Server or https.Server');
	}

	if (typeof onConnection !== 'function') {
		throw new TypeError('protoo.Application.websocket() | onConnection must be a function with 3 arguments');
	}

	wsServer = new WebSocketServer(httpServer, {
		connection: onConnection,

		accepted: function(username, uuid, data, transport) {
			// Provide the PeerManager with the peer information.
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
 * Delegate `.VERB(...)` calls to `Router#VERB(...)`.
 */
methods.concat('all').forEach(function(method) {
  Application.prototype[method] = function(path) {
  	debug('%s() | [path:%s]', method, path);

    var route = this.route(path);

    route[method].apply(route, slice.call(arguments, 1));
    return this;
  };
});


/**
 * Return the number of found peers and run the given handler for of all them.
 * @param  {String} username          Peer's username.
 * @param  {String} [null] uuid       Peer's uuid (optional, and can be omitted).
 * @param  {Funcion} handler handler  Function to be called with each forun Peer.
 * @return {Number}  Number of peers found.
 */
Application.prototype.peers = function(username, uuid, handler) {
	return this.peerManager.peers(username, uuid, handler);
};


/**
 * Private API.
 */


function setDefaultSettings() {
	debug('setDefaultSettings()');

	var env = process.env.NODE_ENV || 'development';
	this.set('env', env);
}


function handleRequest(peer, req) {
	debug('handleRequest()');

	// Attach the app and the peer to the request.
	req.app = this;
	req.peer = peer;

	var self = this;
	var done = done || finalHandler(req, {
		env: this.get('env'),
		onerror: onerror
	});

	function onerror(error) {
		var msg = error.stack || error.toString();

		debugerror('handleRequest() | finalHandler got error:', error);
		if (self.get('env') !== 'test') {
			console.error('finalHandler got error: ' + msg);
		}

		self.emit('error:route', error);
	}

	this.router.handle(req, done);
}
