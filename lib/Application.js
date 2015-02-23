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

	// The base Router.
	Object.defineProperty(this, 'router', {
		configurable: true,
		enumerable: true,
		get: function get_router() {
			if (router === null) {
				router = new Router({
					// TODO
					// caseSensitive: this.enabled('case sensitive routing'),
					// strict: this.enabled('strict routing')
				});
			}

			return router;
		}
	});
}

util.inherits(Application, EventEmitter);


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
 * Private API.
 */


function handleRequest(peer, req) {
	debug('handleRequest()');

	var self = this;

	var done = function final_handler(error) {
		if (! error) {
			debug('handleRequest() | final handler');
			// TODO
		}
		else {
			debugerror('handleRequest() | final handler called with error: %s', error.toString());

			self.emit('error:route', error);
		}
	};

	// Attach peer to the request.
	req.peer = peer;

	this.router.handle(req, done);
}
