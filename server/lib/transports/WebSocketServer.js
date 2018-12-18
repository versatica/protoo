const EventEmitter = require('events').EventEmitter;
const websocket = require('websocket');
const logger = require('../logger')('WebSocketServer');
const WebSocketTransport = require('./WebSocketTransport');

const WS_SUBPROTOCOL = 'protoo';

class WebSocketServer extends EventEmitter
{
	constructor(httpServer, options)
	{
		logger.debug('constructor() [option:%o]', options);

		super();
		this.setMaxListeners(Infinity);

		// Merge some settings into the given options.
		options = Object.assign(
			{
				httpServer        : httpServer,
				keepalive         : true,
				keepaliveInterval : 60000
			},
			options);

		// Run a websocket.Server instance.
		this._wsServer = new websocket.server(options);

		this._wsServer.on('request', (request) =>
		{
			this._onRequest(request);
		});
	}

	stop()
	{
		logger.debug('stop()');

		// Don't close the given http.Server|https.Server but just unmount the
		// WebSocket server.
		this._wsServer.unmount();
	}

	_onRequest(request)
	{
		logger.debug(
			'onRequest() [origin:%s | path:"%s"]', request.origin, request.resource);

		// Validate WebSocket sub-protocol.
		if (request.requestedProtocols.indexOf(WS_SUBPROTOCOL) === -1)
		{
			logger.warn('_onRequest() | invalid/missing Sec-WebSocket-Protocol');

			request.reject(403, 'Invalid/missing Sec-WebSocket-Protocol');

			return;
		}

		// If there are no listeners, reject the request.
		if (this.listenerCount('connectionrequest') === 0)
		{
			logger.error(
				'_onRequest() | no listeners for "connectionrequest" event, ' +
				'rejecting connection request');

			request.reject(500, 'No listeners for "connectionrequest" event');

			return;
		}

		let replied = false;

		// Emit 'connectionrequest' event.
		this.emit('connectionrequest',
			// Connection data.
			{
				request : request.httpRequest,
				origin  : request.origin,
				socket  : request.httpRequest.socket
			},
			// accept() function.
			() =>
			{
				if (replied)
				{
					logger.warn(
						'_onRequest() | cannot call accept(), connection request already replied');

					return;
				}

				replied = true;

				// Get the WebSocketConnection instance.
				const connection = request.accept(WS_SUBPROTOCOL, request.origin);

				// Create a new Protoo WebSocket transport.
				const transport = new WebSocketTransport(connection);

				logger.debug('_onRequest() | accept() called');

				// Return the transport.
				return transport;
			},
			// reject() function.
			(code, reason) =>
			{
				if (replied)
				{
					logger.warn(
						'_onRequest() | cannot call reject(), connection request already replied');

					return;
				}

				if (code instanceof Error)
				{
					code = 500;
					reason = code.toString();
				}
				else if (reason instanceof Error)
				{
					reason = reason.toString();
				}

				replied = true;
				code = code || 403;
				reason = reason || 'Rejected';

				logger.debug(
					'_onRequest() | reject() called [code:%s | reason:"%s"]', code, reason);

				request.reject(code, reason);
			});
	}
}

module.exports = WebSocketServer;
