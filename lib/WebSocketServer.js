/**
 * Expose the WebSocketServer class.
 */
module.exports = WebSocketServer;


/**
 * Dependencies.
 */
var websocket = require('websocket');
var debug = require('debug')('protoo:WebSocketServer');
var WebSocketTransport = require('./WebSocketTransport');


/**
 * Internal constants.
 */
var C = {
	WS_SUBPROTOCOL: 'protoo',
	REJECT: {code:403, reason:'Rejected'}
};


function WebSocketServer(httpServer, events) {
	debug('new()');

	var self = this;

	this.httpServer = httpServer;
	this.events = events;

	// Run a websocket.Server server.
	this.wsServer = new websocket.server({
		httpServer: this.httpServer,
		closeTimeout: 2000
	});

	// this.wsServer events.
	this.wsServer.on('request', function(request) {
		onRequest.call(self, request);
	});
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


/**
 * Private API.
 */


function onRequest(request) {
	debug('onRequest() | [origin:%s | path:%s]', request.origin, request.resource);

	var self = this;
	var info;
	var accept, reject;
	var done = false;
	var connection;

	// Validate WebSocket sub-protocol.
	if (request.requestedProtocols.indexOf(C.WS_SUBPROTOCOL) === -1) {
		debug('onRequest() | invalid Sec-WebSocket-Protocol');

		request.reject(403, 'Invalid Sec-WebSocket-Protocol');
		return;
	}

	// Data for the 'connection' event.
	info = {
		req: request.httpRequest,
		origin: request.origin,
		socket: request.httpRequest.socket
	};

	// 'accept' function.
	accept = function(username, uuid, data, onPeer) {
		if (done) { return; }
		done = true;

		var transport;

		debug('onRequest() | accept() called [username:%s | uuid:%s]', username, uuid);
		connection = request.accept(C.WS_SUBPROTOCOL, request.origin);

		// Create a new Protoo WebSocket transport.
		transport = new WebSocketTransport(connection);

		// Call the 'accepted' event.
		self.events.accepted(username, uuid, data, onPeer, transport);
	};

	// 'reject' function.
	reject = function(code, reason) {
		if (done) { return; }
		done = true;

		code = code || C.REJECT.code;
		reason = reason || C.REJECT.reason;

		debug('onRequest() | reject() called [code:%s | reason:"%s"]', code, reason);
		request.reject(code, reason);
	};

	// Call the 'connection' listener.
	this.events.connection(info, accept, reject);
}
