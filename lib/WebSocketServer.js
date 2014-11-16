/**
 * Expose the WebSocketServer class.
 */
module.exports = WebSocketServer;


/**
 * Dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var ws = require('ws');
var debug = require('debug')('protoo:WebSocketServer');
var debugerror = require('debug')('protoo:ERROR:WebSocketServer');
var WebSocketTransport = require('./WebSocketTransport');


/**
 * Internal constants.
 */
var C = {
	WS_SUBPROTOCOL: 'protoo',
	REGEXP_SEC_WEBSOCKET_PROTOCOL: new RegExp('(^| |,)protoo($| |,)')
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

	EventEmitter.call(this);

	this.httpServer = httpServer;
	this.connectionListener = connectionListener;
	this.peerManager = peerManager;

	// Run a ws.Server server.
	this.wsServer = new ws.Server({
		server: this.httpServer,
		verifyClient: function(info, cb) {
			this.onAuthorize(info, cb);
		}.bind(this),
		handleProtocols: function(protocols, cb) {
			this.onHandleProtocols(protocols, cb);
		}.bind(this),
		clientTracking: false  // Don't take care of connections.
	});

	// this.wsServer events.
	this.wsServer.on('connection', function(websocket) {
		this.onConnection(websocket);
	}.bind(this));
}

util.inherits(WebSocketServer, EventEmitter);


WebSocketServer.prototype.close = function(closeServer) {
	debug('close()');

	// Remove the 'upgrade' event from the HTTP server.
	this.httpServer.removeAllListeners('upgrade');

	// Close the HTTP server if requested.
	if (closeServer) {
		try { this.httpServer.close(); }
		catch(error) {}
	}
};


WebSocketServer.prototype.onAuthorize = function(info, cb) {
	debug('onAuthorize() [origin:%s | url:%s]', info.origin, info.req.url);

	var protocols;
	var connectingInfo;
	var acceptCb, rejectCb, waitCb;
	var wait = false;
	var done = false;

	// Validate WebSocket sub-protocol.
	protocols = info.req.headers['sec-websocket-protocol'];
	if (! protocols || ! protocols.match(C.REGEXP_SEC_WEBSOCKET_PROTOCOL)) {
		debug('invalid Sec-WebSocket-Protocol');
		cb(false, 403, 'Invalid Sec-WebSocket-Protocol');
		return;
	}

	// Data for the 'ws:connecting' event.
	connectingInfo = {
		req: info.req,
		origin: info.origin,
		socket: info.req.socket
	};

	// Event 'acceptCb' callback.
	acceptCb = function(peerInfo, onPeerCb) {
		if (done) { return; }
		done = true;

		/// TODO: Should validate here provided peer fields.

		debug('onAuthorize() acceptCb called [username:%s | uuid:%s]', peerInfo.username, peerInfo.uuid);

		// Attach peerInfo and onPeerCb into the HTTP request so
		// they can be retrieved later in the 'connection' event.
		info.req.__protoo_peerInfo = peerInfo;
		info.req.__protoo_onPeerCb = onPeerCb;

		cb(true);
	};

	// Event 'rejectCb' callback.
	rejectCb = function(code, reason) {
		if (done) { return; }
		done = true;

		debug('onAuthorize() rejectCb called [code:%s | reason:%s]', code, reason);
		cb(false, code, reason);
	};

	// Event 'waitCb' callback.
	waitCb = function() {
		debug('onAuthorize() waitCb called');
		wait = true;
	};

	// Call the connection listener.
	this.connectionListener(connectingInfo, acceptCb, rejectCb, waitCb);

	// If the user did not invoke any callback then report it as error to the app.
	if (! done && ! wait) {
		debugerror('onAuthorize() no callback called on connectionListener');

		this.emit('error', new Error('no callback called on connectionListener'));
		cb(false, 500, 'Application Error');
	}
};


WebSocketServer.prototype.onHandleProtocols = function(protocols, cb) {
	// WebSocket protocol is validated on the onAuthorize callback.
	cb(true, C.WS_SUBPROTOCOL);
};


WebSocketServer.prototype.onConnection = function(websocket) {
	var transport;
	var peerInfo;
	var onPeerCb;

	// Retrieve peer information from the HTTP request.
	peerInfo = websocket.upgradeReq.__protoo_peerInfo;
	onPeerCb = websocket.upgradeReq.__protoo_onPeerCb;
	delete websocket.upgradeReq.__protoo_peerInfo;
	delete websocket.upgradeReq.__protoo_onPeerCb;

	// Create a new Protoo WebSocket transport.
	transport = new WebSocketTransport(websocket);

	// Provide the PeerManager with the peer information.
	this.peerManager.addPeer(peerInfo, onPeerCb, transport);

	// On transport close tell the PeerManager to remove the peer.
	transport.on('close', function(peer) {
		this.peerManager.removePeer(peer);
	}.bind(this));
};
