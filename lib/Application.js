/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var debug = require('debug')('protoo:Application');
var logerror = require('debug')('protoo:ERROR:Application');
var PeerManager = require('./PeerManager');
var WebSocketServer = require('./WebSocketServer');
var Router = require('./Router');
var Utils = require('./Utils');


/**
 * Applicaiton emitted events.
 *
 *
 * 'error'
 *
 * Fired upon an usage or internal error. If the application does not install a
 * listener for the this event then the error is thrown.
 *
 * @event error
 * @param {Error} error.
 *
 *
 * 'ws:connecting'
 *
 * Fired upon a WebSocket connection attempt.
 *
 * @event ws:connecting
 * @param {Object} info
 * @param {http.IncomingRequest} info.req  The HTTP request of the client
 * handshake.
 * @param {String} info.origin  The Origin header value in the client
 * request (may be `null`).
 * @param {Function} acceptCb  Callback the user must invoke to accept the
 * connection by providing information about the connected peer.
 * @param {Object} acceptCb.peerInfo
 * @param {String} acceptCb.peerInfo.username  Username of the peer.
 * @param {String} acceptCb.peerInfo.uuid  UUID of the peer.
 * @param {Object} acceptCb.peerInfo.data  Custom data for this peer.
 * @param {Function} acceptCb.onPeerCb  Callback that will be called upon peer
 * creation and after the listeners into the "peer:online" event.
 * @param {Peer} acceptCb.onPeerCb.peer  The Peer instance.
 * @param {Function} rejectCb  Callback the user must invoke to reject the
 * connection.
 * @param {Number} rejectCb.code  Rejection cause code.
 * @param {String} rejectCb.reason  Rejection description.
 * @param {Function} waitCb  Callback the user must invoke to announce that it
 * will call `acceptCb` or `rejectCb` later (after an asynchronous operation).
 *
 *
 * 'peer:online'
 *
 * Emitted when a peer becomes online. In case of WebSocket access this means
 * that first a 'ws:connecting' event was fired and that the application
 * called `acceptCb` on it.
 *
 * @event 'peer:online'
 * @param {Peer} peer  The online peer.
*
*
* 'peer:offline'
*
* Emitted when a peer becomes offline.
*
* @event 'peer:offline'
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

	events.EventEmitter.call(this);

	// The PeerManager instance.
	this.peerManager = new PeerManager(this);

	this.peerManager.on('error', function(error) {
		logerror('PeerManager emits "error" event');
		this.error(error);
	}.bind(this));

	// The servers container.
	this.servers = [];

	// The base Router.
	this.router = new Router();
}

util.inherits(Application, events.EventEmitter);


/**
 * Handle WebSocket connections.
 *
 * @method handleWebSocket
 * @param {http.Server|https.Server} httpServer A Node HTTP or HTTPS server.
 * @chainable
 */

Application.prototype.handleWebSocket = function(httpServer) {
	debug('handleWebSocket()');

	var wsServer = new WebSocketServer(this, httpServer);

	wsServer.on('error', function(error) {
		logerror('WebSocketServer emits "error" event');
		this.error(error);
	}.bind(this));

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


/**
 * Make the application emit an event. Called by internal protoo modules.
 *
 * @method fire
 * @return {Boolean} `true` if no error raised, `false` otherwise.
 * @private
 */

Application.prototype.fire = function() {
	var event = arguments[0];

	try {
		debug('emitting "%s" event', event);
		this.emit.apply(this, arguments);
		return true;
	}
	catch(error) {
		logerror('error catched during "%s" event', event);
		this.error(error);
		return false;
	}
};


/**
 * Make the application emit an 'error' event or throw it if the application has
 * not an 'error' handler.
 *
 * @method error
 * @private
 */

Application.prototype.error = function(error) {
	logerror(error);

	if (this.listeners('error').length === 0) {
		debug('no "error" handler, throwing error');
		throw error;
	}

	debug('emitting "error" event');
	this.emit('error', error);
};


/**
 * Expose the Application class.
 */

Object.freeze(Application);
module.exports = Application;
