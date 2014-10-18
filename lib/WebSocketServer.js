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

var WebSocketServer = function(app, httpServer, options) {
	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The user provided HTTP/HTTPS server.
	this.httpServer = httpServer;

	// User provided options.
	this.options = options;

	// WebSocket connections.
	this.connections = [];

	// Run a WebSocket server.
	this.wsServer = new ws.Server({
		server: this.httpServer,
		verifyClient: function(info, cb) {
			this.onAuthorize(info, cb);
		}.bind(this),
		handleProtocols: function(protocols, cb) {
			this.onHandleProtocols(protocols, cb);
		}.bind(this),
		clientTracking: false,  // Don't take care of connections.
		path: options.path
	});

	this.wsServer.on('connection', function(socket) {
		this.onConnection(socket);
	}.bind(this));
};

util.inherits(WebSocketServer, events.EventEmitter);


WebSocketServer.prototype.close = function(options) {
	// Close connections.
	this.connections.forEach(function(connection) {
		connection.close(options.code, options.reason);
		// TODO: Must remove the WebSocketConnection from this.connections !
	});

	// Close the HTTP server if requested.
	if (options.closeServers) {
		this.httpServer.close();
	}
};


WebSocketServer.prototype.onAuthorize = function(info, cb) {
	var protocols;
	var data = {};
	var acceptCb, rejectCb, waitCb;
	var accept_or_reject_called = false;
	var wait_called = false;

	// Validate WebSocket sub-protocol.
	protocols = info.req.headers['sec-websocket-protocol'];
	if (! protocols || ! protocols.match(C.REGEXP_SEC_WEBSOCKET_PROTOCOL)) {
		cb(false, 403, 'Invalid Sec-WebSocket-Protocol');
		return;
	}

	// Event 'data' object.
	data = {
		req: info.req,
		origin: info.origin
	};

	// Event 'acceptCb' callback.
	acceptCb = function(user, uuid) {
		console.log('acceptCb() called: [user:%s | uuid:%s]', user, uuid);  // TMP

		// Attach the application provided user data into the HTTP request so
		// it can be retrieved later in the 'connection' event.
		info.req.__protoo_data = {
			user: user,
			uuid: uuid
		};

		cb(true);
		accept_or_reject_called = true;
	};

	// Event 'rejectCb' callback.
	rejectCb = function(code, reason) {
		console.log('rejectCb() called: [code:%s | reason:%s]', code, reason);  // TMP

		cb(false);
		accept_or_reject_called = true;
	};

	// Event 'waitCb' callback.
	waitCb = function() {
		console.log('waitCb() called');  // TMP

		wait_called = true;
	};

	// Emit 'ws:connection' and expect the user to call the provided one callback.
	this.app.emit('ws:connection', data, acceptCb, rejectCb, waitCb);

	// If the user did not invoke any callback then this is an error.
	if (! accept_or_reject_called && ! wait_called) {
		this.app.emit('error', Error('no call back called during a WebSocket connection'));
		cb(false, 500, 'Application Error');
	}
};


WebSocketServer.prototype.onHandleProtocols = function(protocols, cb) {
	// NOTE: WebSocket protocol is validated on the onAuthorize callback.
	cb(true, C.WS_SUBPROTOCOL);
};


WebSocketServer.prototype.onConnection = function(socket) {
	var connection = new WebSocketConnection(this.app, socket);

	// Add the WebSocketConnection to the list of connections.
	this.connections.push(connection);

	// Remove the WebSocketConnection from the list upon disconnection.
	socket.on('close', function() {
		var index = this.connections.indexOf(connection);
		if (index != -1) {
			this.connections.splice(index, 1);
		}
	}.bind(this));

	// Emit 'user:connected' event.
	this.app.emit('user:connected', socket.upgradeReq.__protoo_data.user, socket.upgradeReq.__protoo_data.uuid, this);
};


/**
 * Expose the WebSocketServer class.
 */

Object.freeze(WebSocketServer);
module.exports = WebSocketServer;
