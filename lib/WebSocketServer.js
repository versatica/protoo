/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var ws = require('ws');
var WebSocketConnection = require('./WebSocketConnection');


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
 * _class WebSocketServer
 * _private
 */

var WebSocketServer = function(app, httpServer) {
	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The user provided HTTP/HTTPS server.
	this.httpServer = httpServer;

	// Status.
	this.closed = false;

	// Run a WebSocket server.
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

	this.wsServer.on('connection', function(websocket) {
		this.onConnection(websocket);
	}.bind(this));
};

util.inherits(WebSocketServer, events.EventEmitter);


WebSocketServer.prototype.close = function(closeServer) {
	if (this.closed) { return; }
	this.closed = true;

	// Remove the 'upgrade' event from the HTTP server.
	this.httpServer.removeAllListeners('upgrade');

	// Close the HTTP server if requested.
	if (closeServer) {
		try {
			this.httpServer.close();
		}
		catch(error) {}
	}
};


WebSocketServer.prototype.onAuthorize = function(info, cb) {
	var protocols;
	var connectingInfo;
	var acceptCb, rejectCb, waitCb;
	var wait_called = false;
	var done = false;

	// Validate WebSocket sub-protocol.
	protocols = info.req.headers['sec-websocket-protocol'];
	if (! protocols || ! protocols.match(C.REGEXP_SEC_WEBSOCKET_PROTOCOL)) {
		cb(false, 403, 'Invalid Sec-WebSocket-Protocol');
		return;
	}

	// Data for the 'ws:connecting' event.
	connectingInfo = {
		req: info.req,
		origin: info.origin,
		socket: info.req.socket
	};
	Object.freeze(connectingInfo);

	// Event 'acceptCb' callback.
	acceptCb = function(username, uuid, data) {
		if (done) { return; }
		done = true;

		/// TODO: Should validate here provided peer fields.

		console.log('acceptCb() called: [username:%s | uuid:%s]', username, uuid);  // TMP

		// Attach the peer info into the HTTP request so
		// it can be retrieved later in the 'connection' event.
		info.req.__protoo_peer_info = {
			username: username,
			uuid: uuid,
			data: data
		};

		cb(true);
	};

	// Event 'rejectCb' callback.
	rejectCb = function(code, reason) {
		if (done) { return; }
		done = true;

		console.log('rejectCb() called: [code:%s | reason:%s]', code, reason);  // TMP

		cb(false);
	};

	// Event 'waitCb' callback.
	waitCb = function() {
		console.log('waitCb() called');  // TMP

		wait_called = true;
	};

	// Emit 'ws:connecting' and expect the user to call one of the provided callbacks.
	this.app.emit('ws:connecting', connectingInfo, acceptCb, rejectCb, waitCb);

	// If the user did not invoke any callback then this is an error.
	if (! done && ! wait_called) {
		this.app.emit('error', Error('no call back was called during a WebSocket connection'));
		cb(false, 500, 'Application Error');
	}
};


WebSocketServer.prototype.onHandleProtocols = function(protocols, cb) {
	// NOTE: WebSocket protocol is validated on the onAuthorize callback.
	cb(true, C.WS_SUBPROTOCOL);
};


WebSocketServer.prototype.onConnection = function(websocket) {
	var connection;
	var peer;
	var peer_info;

	// Retrieve user information from the HTTP request.
	peer_info = websocket.upgradeReq.__protoo_peer_info;
	delete websocket.upgradeReq.__protoo_peer_info;

	// Create a new WebSocket connection.
	connection = new WebSocketConnection(this.app, websocket);

	// Provide the PeerManager with the peer information.
	peer = this.app.peerManager.addPeer(
		peer_info.username,
		peer_info.uuid,
		peer_info.data,
		connection
	);

	// Attach the Peer to this connection.
	connection.attachPeer(peer);
};


/**
 * Expose the WebSocketServer class.
 */

Object.freeze(WebSocketServer);
module.exports = WebSocketServer;
