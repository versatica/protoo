var websocket = require('websocket');
var debug = require('debug')('protoo:WebSocketServer');
var merge = require('utils-merge');

var WebSocketTransport = require('./WebSocketTransport');

const WS_SUBPROTOCOL = 'protoo';
const REJECT_CODE = { code: 403, reason: 'Rejected' };

module.exports = WebSocketServer;

function WebSocketServer(httpServer, options, events)
{
	debug('new()');

	var self = this;

	this.httpServer = httpServer;
	this.events = events;

	options = merge(
		{
			httpServer: this.httpServer,
			keepalive: true,
			keepaliveInterval: 60000
		}, options);

	// Run a websocket.Server server.
	this.wsServer = new websocket.server(options);

	// this.wsServer events.
	this.wsServer.on('request', function(request)
	{
		onRequest.call(self, request);
	});
}

WebSocketServer.prototype.close = function(closeServer)
{
	debug('close()');

	this.wsServer.unmount();

	// Close the HTTP server if requested.
	if (closeServer)
	{
		try
		{
			this.httpServer.close();
		}
		catch(error)
		{}
	}
};

/**
 * Private API.
 */

function onRequest(request)
{
	debug('onRequest() | [origin:%s | path:%s]', request.origin, request.resource);

	var self = this;
	var info;
	var done = false;
	var connection;

	// Validate WebSocket sub-protocol.
	if (request.requestedProtocols.indexOf(WS_SUBPROTOCOL) === -1)
	{
		debug('onRequest() | invalid Sec-WebSocket-Protocol');

		request.reject(403, 'Invalid Sec-WebSocket-Protocol');
		return;
	}

	// Data for the 'connection' event.
	info =
	{
		req    : request.httpRequest,
		origin : request.origin,
		socket : request.httpRequest.socket
	};

	// 'accept' function.
	function accept(username, uuid, data)
	{
		var transport;

		if (done)
		{
			return;
		}
		done = true;

		debug('onRequest() | accept() called [username:%s | uuid:%s]', username, uuid);
		connection = request.accept(WS_SUBPROTOCOL, request.origin);

		// Create a new Protoo WebSocket transport.
		transport = new WebSocketTransport(connection);

		// Call the 'accepted' event.
		self.events.accepted(username, uuid, data, transport);
	}

	// 'reject' function.
	function reject(code, reason)
	{
		if (done)
		{
			return;
		}
		done = true;

		code = code || REJECT_CODE.code;
		reason = reason || REJECT_CODE.reason;

		debug('onRequest() | reject() called [code:%s | reason:"%s"]', code, reason);
		request.reject(code, reason);
	}

	// Call the 'connection' listener.
	this.events.connection(info, accept, reject);
}
