/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var ws = require('ws');


/**
 * Internal constants.
 */

var C = {
	WS_SUBPROTOCOL: 'protoo',
	REGEXP_SEC_WEBSOCKET_PROTOCOL: new RegExp('(^| |,)protoo($| |,)')
};


/**
 * WebSocket server class.
 *
 * @class WebSocketServer
 * @api private
 */

var WebSocketServer = function(app, httpServer, path) {
	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// Run a WebSocket server.
	this.server = new ws.Server({
		server: httpServer,
		handleProtocols: this.onHandleProtocols,
		verifyClient: this.onAuthorize,
		clientTracking: false,  // Don't take care of connections.
		path: path
	});

	this.server.on('connection', function(socket) {
		this.onConnection(socket);
	}.bind(this));
};

util.inherits(WebSocketServer, events.EventEmitter);


WebSocketServer.prototype.onAuthorize = function(info, cb) {
	var req = info.req;
	var protocols;

	// Validate WebSocket sub-protocol.
	protocols = req.headers['sec-websocket-protocol'];
	if (! protocols || ! protocols.match(C.REGEXP_SEC_WEBSOCKET_PROTOCOL)) {
		cb(false, 403, 'Invalid Sec-WebSocket-Protocol');
		return;
	}

	cb(true);
};


WebSocketServer.prototype.onHandleProtocols = function(protocols, cb) {
	// NOTE: WebSocket protocol is validated on the onAuthorize callback.
	cb(true, C.WS_SUBPROTOCOL);
};


WebSocketServer.prototype.onConnection = function(socket) {
	// TODO
};


/**
 * Expose the WebSocketServer class.
 */

Object.freeze(WebSocketServer);
module.exports = WebSocketServer;
