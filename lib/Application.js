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
var PeerManager = require('./PeerManager');
var WebSocketServer = require('./WebSocketServer');
var Router = require('./Router');
var Utils = require('./Utils');


/**
 * Application emitted events.
 *
 *
 * 'online'
 *
 * Emitted when a peer becomes online. In case of WebSocket access this means
 * that first a 'ws:connecting' event was fired and that the application
 * called `acceptCb` on it.
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
	debug('new');

	EventEmitter.call(this);

	var self = this;

	// The PeerManager instance.
	this.peerManager = new PeerManager(
		function(peer) { self.emit('online',  peer); },
		function(peer) { self.emit('offline', peer); }
	);

	// The servers container.
	this.servers = [];

	// The base Router.
	this.router = new Router();
}

util.inherits(Application, EventEmitter);


/**
 * Handle WebSocket connections.
 *
 * @method websocket
 * @param {http.Server|https.Server} httpServer  A Node HTTP or HTTPS server.
 * @param {Function} connectionListener
 * @param {Object} connectionListener.info
 * @param {http.IncomingRequest} connectionListener.info.req  The HTTP request
 * of the client handshake.
 * @param {String} connectionListener.info.origin  The Origin header value in the
 * client request (may be null).
 * @param {Function} connectionListener.acceptCb  Callback the user must invoke
 * to accept the connection by providing information about the connected peer.
 * @param {Object} connectionListener.acceptCb.peerInfo
 * @param {String} connectionListener.acceptCb.peerInfo.username  Username of
 * the peer.
 * @param {String} connectionListener.acceptCb.peerInfo.uuid  UUID of the peer.
 * @param {Object} connectionListener.acceptCb.peerInfo.data  Custom data for
 * this peer.
 * @param {Function} connectionListener.acceptCb.onPeerCb  Callback to be called
 * upon peer creation and after the listeners into the "peer:online" event. // TODO
 * @param {Peer} connectionListener.acceptCb.onPeerCb.peer  The Peer instance.
 * @param {Function} connectionListener.rejectCb  Callback the user must invoke
 * to reject the connection.
 * @param {Number} connectionListener.rejectCb.code  Rejection cause code.
 * @param {String} connectionListener.rejectCb.reason  Rejection description.
 * @param {Function} connectionListener.waitCb  Callback the user must invoke to
 * announce that `acceptCb` or `rejectCb` will be called later.
 * @chainable
 */
Application.prototype.websocket = function(httpServer, connectionListener) {
	debug('websocket()');

	if (! httpServer instanceof(http.Server) && ! httpServer instanceof(https.Server)) {
		throw new Error('httpServer must be an instance of http.Server or https.Server');
	}

	var wsServer = new WebSocketServer(httpServer, connectionListener, this.peerManager);

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
	var offset = 0;
	var path = '/';

	// Default path to '/'. Disambiguate app.use([fn]).
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

	var fns = Utils.flatten(Utils.slice.call(arguments, offset));

	if (fns.length === 0) {
		throw new TypeError('Application#use() requires middleware functions');
	}

	fns.forEach(function(fn) {
		return this.router.use(path, fn);
	}, this);

	return this;
};


/**
 * Private API
 */


/**
 * Dispatch a request and source Peer into the application.
 *
 * If no _done_ callback is provided, then default error handlers will respond
 * in the event of an error bubbling through the stack.
 *
 * @method handleRequest
 * @param {Request} req  The request.
 * @param {Peer} peer  The source peer.
 * @param {Function} done  Callback.
 * @private
 */
Application.prototype.handleRequest = function(req, peer, done) {
	this.router.handleRequest(req, peer, done);
};
