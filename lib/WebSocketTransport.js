'use strict';

const logger = require('./logger')('WebSocketTransport');
const parse = require('./parse');
const Request = require('./Request');

class WebSocketTransport
{
	constructor(connection)
	{
		this._connection = connection;  // WebSocket-Node.WebSocketConnection instance
		this._socket = connection.socket;  // The Node net.Socket instance

		// Events (set via setEvents())
		this._events = null;

		// Status attributes
		this._locallyClosed = false;
		this._ignoreOnClose = false;

		this._tostring = `${(this._socket.encrypted ? 'WSS' : 'WS')}/${this._socket.remoteAddress}/${this._socket.remotePort}`;

		logger.debug('constructor() %s', this);

		this._connection.on('message', (raw) =>
		{
			if (raw.type === 'binary')
			{
				logger.error('%s ignoring binary message', this);

				return;
			}

			let msg = parse(raw.utf8Data);

			if (!msg)
				return;

			if (msg instanceof Request)
				this._events.request(msg);
			else
				this._events.response(msg);
		});

		this._connection.on('close', (code, reason) =>
		{
			if (this._ignoreOnClose)
				return;

			logger.debug('"close" event %s [code:%d, reason:"%s", locally closed:%s]', this, code, reason, this._locallyClosed);

			this._events.close(code, reason, this.locallyClosed);
		});

		this._connection.on('error', (error) =>
		{
			logger.error('%s [error: %s]', this, error);
		});
	}

	toString()
	{
		return this._tostring;
	}

	close(code, reason)
	{
		if (!this._connection.connected)
			return;

		logger.debug('close() %s [code:%d, reason:"%s"]', this, code, reason);

		this._locallyClosed = true;

		// Don't wait for the WebSocket 'close' event. Do it now
		this._events.close(code, reason, this._locallyClosed);
		this._ignoreOnClose = true;  // Ignore the network 'close' event

		try
		{
			this._connection.close(code, reason);
		}
		catch(error)
		{
			logger.error('close() | error closing the connection: %s', error.toString());
		}
	}

	setEvents(events)
	{
		this._events = events;
	}

	drop(code, reason)
	{
		if (!this._connection.connected)
			return;

		logger.debug('drop() | %s [code:%d, reason:"%s"]', this, code, reason);

		this._ignoreOnClose = true;  // Ignore the network 'close' event

		try
		{
			this._connection.close(code, reason);
		}
		catch (error)
		{
			logger.error('drop() | error dropping the connection: %s', error.toString());
		}
	}

	/**
	 * Sends the given request or response.
	 * Returns true if it sent, null if it could not be sent now, and false if
	 * it failed for other reasons.
	 */
	send(msg)
	{
		if (!this._connection.connected)
			return null;

		try
		{
			this._connection.sendUTF(msg.json());

			return true;
		}
		catch(error)
		{
			logger.error('send() | error sending message: %s', error.toString());

			return false;
		}
	}
}

module.exports = WebSocketTransport;
