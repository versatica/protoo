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
var init = require('./middleware/init');
var Utils = require('./Utils');


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

	var self = this;

	// The PeerManager instance.
	this.peerManager = new PeerManager({
		online: function(peer) {
			self.emit('online',  peer);
		},

		offline: function(peer) {
			self.emit('offline', peer);
		},

		request: function(peer, req) {
			handleRequest.call(self, req, peer);
		}
	});

	// The servers container.
	this.servers = [];

	// The base Router.
	this.router = new Router({
		// caseSensitive: this.enabled('case sensitive routing'),
		// strict: this.enabled('strict routing')
	});

	this.router.use(init());
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
 * @param {Function} onConnection.accept.onPeer  Callback called upon peer
 * creation and before the "peer:online" event.
 * @param {Peer} onConnection.accept.onPeer.peer  The Peer instance.
 * @param {Function} onConnection.reject  Function the user must invoke
 * to reject the connection.
 * @param {Number} onConnection.reject.code  Rejection cause code.
 * @param {String} onConnection.reject.reason  Rejection description.
 * @chainable
 */
Application.prototype.websocket = function(httpServer, onConnection) {
	debug('websocket()');

	var self = this,
		wsServer;

	if (! httpServer instanceof(http.Server) && ! httpServer instanceof(https.Server)) {
		throw new Error('protoo.Application.websocket() | httpServer must be an instance of http.Server or https.Server');
	}

	if (typeof onConnection !== 'function') {
		throw new Error('protoo.Application.websocket() | onConnection must be a function with 3 arguments');
	}

	wsServer = new WebSocketServer(httpServer, {
		connection: onConnection,

		accepted: function(username, uuid, data, onPeer, transport) {
			// Provide the PeerManager with the peer information.
			self.peerManager.addPeer(username, uuid, data, onPeer, transport);
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
Application.prototype.close = function(closeServers) {
	debug('close()');

	// Disconnect all the peers.
	this.peerManager.close();

	// Dissable/close the servers.
	this.servers.forEach(function(server) {
		server.close(closeServers);
	});
};


Application.prototype.use = function(fn) {
	var offset = 0,
		path = '/';

	// Default path to '/'.
	// Disambiguate router.use([fn])
	if (typeof fn !== 'function') {
		var arg = fn;

		while (Array.isArray(arg) && arg.length !== 0) {
			arg = arg[0];
		}

		// First arg is the path.
		if (typeof arg !== 'function') {
			offset = 1;
			path = fn;
		}
	}

	var fns = Utils.flatten(slice.call(arguments, offset));

	if (fns.length === 0) {
		throw new TypeError('protoo.Application.use() | requires middleware functions');
	}

	fns.forEach(function(fn) {
		return this.router.use(path, fn);
	}, this);

	return this;
};


/**
 * Private API.
 */


function handleRequest(req, peer) {
	debug('handleRequest()');

	var self = this;

	var done = function(error) {
		if (! error) {
			debug('handleRequest() | final handler !!!');
		}
		else {
			debugerror('handleRequest() | final handler called with error: %s', error);

			self.emit('error', error);
		}
	};

	// Attach peer to the request.
	req.peer = peer;

	this.router.handle(req, done);

	global.router = this.router;  // TODO: tmp
}
