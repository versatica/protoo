'use strict';

const EventEmitter = require('events').EventEmitter;
const logger = require('../logger')('WebSocketTransport');
const Message = require('../Message');

class WebSocketTransport extends EventEmitter
{
	constructor(connection)
	{
		logger.debug('constructor()');

		super();
		this.setMaxListeners(Infinity);

		// WebSocket-Node.WebSocketConnection instance.
		this._connection = connection;

		// The Node net.Socket instance.
		this._socket = connection.socket;

		// Closed flag.
		this._closed = false;

		// Handle connection.
		this._handleConnection();
	}

	get closed()
	{
		return this._closed;
	}

	toString()
	{
		return this._tostring ||
			(this._tostring = `${this._socket.encrypted ? 'WSS' : 'WS'}:[${this._socket.remoteAddress}]:${this._socket.remotePort}`);
	}

	send(message)
	{
		if (this._closed)
			return Promise.reject(new Error('transport closed'));

		try
		{
			this._connection.sendUTF(JSON.stringify(message));
			return Promise.resolve();
		}
		catch(error)
		{
			logger.error('send() | error sending message: %s', error);
			return Promise.reject(error);
		}
	}

	close()
	{
		logger.debug('close() [conn:%s]', this);

		if (this._closed)
			return;

		// Don't wait for the WebSocket 'close' event, do it now.
		this._closed = true;
		this.emit('close');

		try
		{
			this._connection.close(4000, 'closed by protoo-server');
		}
		catch(error)
		{
			logger.error('close() | error closing the connection: %s', error);
		}
	}

	_handleConnection()
	{
		this._connection.on('close', (code, reason) =>
		{
			if (this._closed)
				return;

			this._closed = true;

			logger.debug('connection "close" event [conn:%s, code:%d, reason:"%s"]', this, code, reason);

			// Emit 'close' event.
			this.emit('close');
		});

		this._connection.on('error', (error) =>
		{
			logger.error('connection "error" event [conn:%s, error:%s]', this, error);
		});

		this._connection.on('message', (raw) =>
		{
			if (raw.type === 'binary')
			{
				logger.warn('ignoring received binary message [conn:%s]', this);
				return;
			}

			let message = Message.parse(raw.utf8Data);

			if (!message)
				return;

			if (this.listenerCount('message') === 0)
			{
				logger.error('no listeners for "message" event, ignoring received message');
				return;
			}

			// Emit 'message' event.
			this.emit('message', message);
		});
	}
}

module.exports = WebSocketTransport;
