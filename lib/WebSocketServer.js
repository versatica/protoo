/**
 * Expose the WebSocketServer class.
 */
module.exports = WebSocketServer;


/**
 * Dependencies.
 */
var websocket = require('websocket');
var debug = require('debug')('protoo:WebSocketServer');
// var debugerror = require('debug')('protoo:ERROR:WebSocketServer');
var WebSocketTransport = require('./WebSocketTransport');


/**
 * Internal constants.
 */
var C = {
	WS_SUBPROTOCOL: 'protoo'
};


/**
 * WebSocket server.
 *
 * @class WebSocketServer
 * @private
 * @constructor
 * @param {http.Server|https.Server} httpServer
 * @param {Function} connectionListener
 * @param {PeerManager} peerManager
 */
function WebSocketServer(httpServer, connectionListener, peerManager) {
	debug('new');

	var self = this;

	if (typeof connectionListener !== 'function' || connectionListener.length !== 3) {
		throw new Error('connectionListener must be a function with 3 arguments');
	}

	this.httpServer = httpServer;
	this.connectionListener = connectionListener;
	this.peerManager = peerManager;

	// Run a ws.Server server.
	this.wsServer = new websocket.server({
		httpServer: this.httpServer,
		closeTimeout: 2000
	});

	// this.wsServer events.
	this.wsServer.on('request', function(request) { self.onRequest(request); });
}


WebSocketServer.prototype.close = function(closeServer) {
	debug('close()');

	this.wsServer.unmount();

	// Close the HTTP server if requested.
	if (closeServer) {
		try { this.httpServer.close(); }
		catch(error) {}
	}
};


WebSocketServer.prototype.onRequest = function(request) {
	debug('onRequest() [origin:%s | path:%s]', request.origin, request.resource);

	var self = this;
	var info;
	var acceptCb, rejectCb;
	var done = false;
	var connection;

	// Validate WebSocket sub-protocol.
	if (request.requestedProtocols.indexOf(C.WS_SUBPROTOCOL) === -1) {
		debug('invalid Sec-WebSocket-Protocol');
		request.reject(403, 'Invalid Sec-WebSocket-Protocol');
		return;
	}

	// Data for the connectionListener event.
	info = {
		req: request.httpRequest,
		origin: request.origin,
		socket: request.httpRequest.socket
	};

	// 'acceptCb' callback.
	acceptCb = function(peerInfo, onPeerCb) {
		if (done) { return; }
		done = true;

		/// TODO: Should validate here provided peer fields.

		debug('onRequest() acceptCb called [username:%s | uuid:%s]', peerInfo.username, peerInfo.uuid);
		connection = request.accept(C.WS_SUBPROTOCOL, request.origin);

		// Call to onConnection() by passing all the needed data.
		self.onConnection(connection, peerInfo, onPeerCb);
	};

	// 'rejectCb' callback.
	rejectCb = function(code, reason) {
		if (done) { return; }
		done = true;

		debug('onRequest() rejectCb called [code:%s | reason:%s]', code, reason);
		request.reject(code, reason);
	};

	// Call the connection listener.
	this.connectionListener(info, acceptCb, rejectCb);
};


WebSocketServer.prototype.onConnection = function(connection, peerInfo, onPeerCb) {
	var transport;

	// Create a new Protoo WebSocket transport.
	transport = new WebSocketTransport(connection);

	// Provide the PeerManager with the peer information.
	this.peerManager.addPeer(peerInfo, onPeerCb, transport);
};
