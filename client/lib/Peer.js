'use strict';

const EventEmitter = require('events').EventEmitter;
const logger = require('./logger')('Peer');
const Message = require('./Message');

// Max time waiting for a response.
const REQUEST_TIMEOUT = 20000;

class Peer extends EventEmitter
{
	constructor(transport)
	{
		logger.debug('constructor()');

		super();
		this.setMaxListeners(Infinity);

		// Transport.
		this._transport = transport;

		// Closed flag.
		this._closed = false;

		// Custom data object.
		this._data = {};

		// Map of sent requests' handlers indexed by request.id.
		this._requestHandlers = new Map();

		// Handle transport.
		this._handleTransport();
	}

	get data()
	{
		return this._data;
	}

	set data(obj)
	{
		this._data = obj || {};
	}

	get closed()
	{
		return this._closed;
	}

	send(method, data)
	{
		const request = Message.requestFactory(method, data);

		return this._transport.send(request)
			.then(() =>
			{
				return new Promise((pResolve, pReject) =>
				{
					const handler =
					{
						resolve : (data2) =>
						{
							if (!this._requestHandlers.delete(request.id))
								return;

							clearTimeout(handler.timer);
							pResolve(data2);
						},

						reject : (error) =>
						{
							if (!this._requestHandlers.delete(request.id))
								return;

							clearTimeout(handler.timer);
							pReject(error);
						},

						timer : setTimeout(() =>
						{
							if (!this._requestHandlers.delete(request.id))
								return;

							pReject(new Error('request timeout'));
						}, REQUEST_TIMEOUT),

						close : () =>
						{
							clearTimeout(handler.timer);
							pReject(new Error('peer closed'));
						}
					};

					// Add handler stuff to the Map.
					this._requestHandlers.set(request.id, handler);
				});
			});
	}

	close()
	{
		logger.debug('close()');

		if (this._closed)
			return;

		this._closed = true;

		// Close transport.
		this._transport.close();

		// Close every pending request handler.
		this._requestHandlers.forEach((handler) => handler.close());

		// Emit 'close' event.
		this.emit('close');
	}

	_handleTransport()
	{
		if (this._transport.closed)
		{
			this._closed = true;
			setTimeout(() => this.emit('close'));

			return;
		}

		this._transport.on('open', () =>
		{
			if (this._closed)
				return;

			// Emit 'open' event.
			this.emit('open');
		});

		this._transport.on('disconnected', () =>
		{
			this.emit('disconnected');
		});

		this._transport.on('close', () =>
		{
			if (this._closed)
				return;

			this._closed = true;

			// Emit 'close' event.
			this.emit('close');
		});

		this._transport.on('message', (message) =>
		{
			if (message.response)
			{
				this._handleResponse(message);
			}
			else if (message.request)
			{
				this._handleRequest(message);
			}
		});
	}

	_handleResponse(response)
	{
		const handler = this._requestHandlers.get(response.id);

		if (!handler)
		{
			logger.error('received response does not match any sent request');

			return;
		}

		if (response.ok)
		{
			handler.resolve(response.data);
		}
		else
		{
			const error = new Error(response.errorReason);

			error.code = response.errorCode;
			handler.reject(error);
		}
	}

	_handleRequest(request)
	{
		this.emit('request',
			// Request.
			request,
			// accept() function.
			(data) =>
			{
				const response = Message.successResponseFactory(request, data);

				this._transport.send(response)
					.catch((error) =>
					{
						logger.warn(
							'accept() failed, response could not be sent: %o', error);
					});
			},
			// reject() function.
			(errorCode, errorReason) =>
			{
				if (errorCode instanceof Error)
				{
					errorReason = errorCode.toString();
					errorCode = 500;
				}
				else if (typeof errorCode === 'number' && errorReason instanceof Error)
				{
					errorReason = errorReason.toString();
				}

				const response =
					Message.errorResponseFactory(request, errorCode, errorReason);

				this._transport.send(response)
					.catch((error) =>
					{
						logger.warn(
							'reject() failed, response could not be sent: %o', error);
					});
			});
	}
}

module.exports = Peer;
