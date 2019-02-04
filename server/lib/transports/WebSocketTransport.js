const Logger = require('../Logger');
const EnhancedEventEmitter = require('../EnhancedEventEmitter');
const Message = require('../Message');

const logger = new Logger('WebSocketTransport');

class WebSocketTransport extends EnhancedEventEmitter
{
	constructor(connection)
	{
		super(logger);

		logger.debug('constructor()');

		// Closed flag.
		// @type {Boolean}
		this._closed = false;

		// WebSocket cnnection instance.
		// @type {WebSocket-Node.WebSocketConnection}
		this._connection = connection;

		// Socket instance.
		// @type {net.Socket}
		this._socket = connection.socket;

		// Handle connection.
		this._handleConnection();
	}

	get closed()
	{
		return this._closed;
	}

	toString()
	{
		return (
			this._tostring ||
			(this._tostring =
				`${this._socket.encrypted ? 'WSS' : 'WS'}:[${this._socket.remoteAddress}]:${this._socket.remotePort}`)
		);
	}

	close()
	{
		if (this._closed)
			return;

		logger.debug('close() [conn:%s]', this);

		// Don't wait for the WebSocket 'close' event, do it now.
		this._closed = true;
		this.safeEmit('close');

		try
		{
			this._connection.close(4000, 'closed by protoo-server');
		}
		catch (error)
		{
			logger.error('close() | error closing the connection: %s', error);
		}
	}

	async send(message)
	{
		if (this._closed)
			throw new Error('transport closed');

		try
		{
			this._connection.sendUTF(JSON.stringify(message));
		}
		catch (error)
		{
			logger.warn('send() failed:%o', error);

			throw error;
		}
	}

	_handleConnection()
	{
		this._connection.on('close', (code, reason) =>
		{
			if (this._closed)
				return;

			this._closed = true;

			logger.debug(
				'connection "close" event [conn:%s, code:%d, reason:"%s"]',
				this, code, reason);

			// Emit 'close' event.
			this.safeEmit('close');
		});

		this._connection.on('error', (error) =>
		{
			logger.error(
				'connection "error" event [conn:%s, error:%s]', this, error);
		});

		this._connection.on('message', (raw) =>
		{
			if (raw.type === 'binary')
			{
				logger.warn('ignoring received binary message [conn:%s]', this);

				return;
			}

			const message = Message.parse(raw.utf8Data);

			if (!message)
				return;

			if (this.listenerCount('message') === 0)
			{
				logger.error(
					'no listeners for "message" event, ignoring received message');

				return;
			}

			// Emit 'message' event.
			this.safeEmit('message', message);
		});
	}
}

module.exports = WebSocketTransport;
