/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var ws = require('ws');
var debug = require('debug')('protoo:WebSocketServer');
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
 * @constructor
 * @param {Application} app.
 * @param {http.Server|https.Server} httpServer A Node HTTP or HTTPS server.
 */

var WebSocketServer = function(app, httpServer) {
	debug('new');

	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The user provided HTTP/HTTPS server.
	this.httpServer = httpServer;

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

	// this.wsServer events.
	this.wsServer.on('connection', function(websocket) {
		this.onConnection(websocket);
	}.bind(this));
};

util.inherits(WebSocketServer, events.EventEmitter);


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

		debug('onAuthorize() acceptCb called [username:%s | uuid:%s]', username, uuid);

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

		debug('onAuthorize() rejectCb called [code:%s | reason:%s]', code, reason);
		cb(false);
	};

	// Event 'waitCb' callback.
	waitCb = function() {
		debug('onAuthorize() waitCb called');
		wait_called = true;
	};

	// Emit 'ws:connecting' event on app.
	if (! this.app.fire('ws:connecting', connectingInfo, acceptCb, rejectCb, waitCb)) {
		debug('error during "ws:connecting" event on app => 500 Application Error');

		cb(false, 500, 'Application Error');
		return;
	}

	// If the user did not invoke any callback then report it as error to the app.
	if (! done && ! wait_called) {
		debug('onAuthorize() error: no callback called during "ws:connecting" event on app => 500 Application Error');
		this.emit('error', new Error('no callback called during "ws:connecting" event on app'));

		cb(false, 500, 'Application Error');
	}
};


WebSocketServer.prototype.onHandleProtocols = function(protocols, cb) {
	// WebSocket protocol is validated on the onAuthorize callback.
	cb(true, C.WS_SUBPROTOCOL);
};


WebSocketServer.prototype.onConnection = function(websocket) {
	var transport;
	var peer;
	var peer_info;

	// Retrieve peer information from the HTTP request.
	peer_info = websocket.upgradeReq.__protoo_peer_info;
	delete websocket.upgradeReq.__protoo_peer_info;

	// Create a new Protoo WebSocket transport.
	transport = new WebSocketTransport(this.app, websocket);

	// Provide the PeerManager with the peer information.
	peer = this.app.peerManager.addPeer(
		peer_info.username,
		peer_info.uuid,
		peer_info.data,
		transport
	);

	// Attach the Peer to this transport.
	transport.attachPeer(peer);
};


/**
 * Expose the WebSocketServer class.
 */

Object.freeze(WebSocketServer);
module.exports = WebSocketServer;
