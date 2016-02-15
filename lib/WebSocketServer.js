'use strict';

const websocket = require('websocket');

const logger = require('./logger')('WebSocketServer');
const utils = require('./utils');
const WebSocketTransport = require('./WebSocketTransport');

const WS_SUBPROTOCOL = 'protoo';
const REJECT_CODE = { code: 403, reason: 'Rejected' };

class WebSocketServer
{
	constructor(httpServer, options, events)
	{
		logger.debug('constructor()');

		this._httpServer = httpServer;
		this._events = events;

		options = utils.mergeObject(
			{
				httpServer        : this._httpServer,
				keepalive         : true,
				keepaliveInterval : 60000
			}, options);

		// Run a websocket.Server server
		this._wsServer = new websocket.server(options);

		this._wsServer.on('request', (request) =>
		{
			this._onRequest(request);
		});
	}

	close(closeServer)
	{
		logger.debug('close()');

		this._wsServer.unmount();

		// Close the HTTP server if requested
		if (closeServer)
		{
			try
			{
				this._httpServer.close();
			}
			catch(error)
			{}
		}
	}

	_onRequest(request)
	{
		logger.debug('onRequest() [origin:%s | path:%s]', request.origin, request.resource);

		// Validate WebSocket sub-protocol
		if (request.requestedProtocols.indexOf(WS_SUBPROTOCOL) === -1)
		{
			logger.warn('_onRequest() | invalid Sec-WebSocket-Protocol');

			request.reject(403, 'Invalid Sec-WebSocket-Protocol');
			return;
		}

		let done = false;

		// Call the 'connection' listener.
		this._events.connection(
			// Data for the 'connection' event
			{
				req    : request.httpRequest,
				origin : request.origin,
				socket : request.httpRequest.socket
			},
			// 'accept' function
			(username, uuid, data) =>
			{
				if (done)
					return;

				done = true;

				logger.debug('_onRequest() | accept() called [username:%s | uuid:%s]', username, uuid);

				let connection = request.accept(WS_SUBPROTOCOL, request.origin);

				// Create a new Protoo WebSocket transport
				let transport = new WebSocketTransport(connection);

				// Call the 'accepted' event
				this._events.accepted(username, uuid, data, transport);
			},
			// 'reject' function
			(code, reason) =>
			{
				if (done)
					return;

				done = true;

				code = code || REJECT_CODE.code;
				reason = reason || REJECT_CODE.reason;

				logger.debug('_onRequest() | reject() called [code:%s | reason:"%s"]', code, reason);

				request.reject(code, reason);
			});
	}
}

module.exports = WebSocketServer;
