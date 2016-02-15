'use strict';

const EventEmitter = require('events').EventEmitter;

const logger = require('./logger')('Peer');
const Request = require('./Request');
const ClientTransaction = require('./ClientTransaction');
const ResponseSender = require('./ResponseSender');

const CLOSE_CODES =
{
	NORMAL_CLOSURE: { code: 1000, reason: 'normal closure' }
};

class Peer extends EventEmitter
{
	constructor(username, uuid, data, events)
	{
		logger.debug('constructor() [username:%s, uuid:%s]', username, uuid);

		super();
		this.setMaxListeners(Infinity);

		/**
		 * Public attributes
		 */
		this.username = username;
		this.uuid = uuid;
		this.data = data;
		// Really disconnected now (cannot reconnect again)
		// TODO: I hate this because this property is set from Application
		this.offline = false;

		/**
		 * Private attributes
		 */
		this._transport = null;
		// close() called
		this._closed = false;
		// Really connected now
		this._online = false;
		this._tostring = null;
		this._clientTransactions = {};
		this._responseSenders = {};

		// Events
		this._events = events;

		// Set events 'offline' and 'reconnect' for handling pending transactions
		this.on('offline', () =>
		{
			for (let id in this._clientTransactions)
			{
				this._clientTransactions[id].onPeerOffline();
			}

			for (let id in this._responseSenders)
			{
				this._responseSenders[id].onPeerOffline();
			}
		});

		this.on('reconnect', () =>
		{
			for (let id in this._clientTransactions)
			{
				this._clientTransactions[id].onPeerReconnect();
			}

			for (let id in this._responseSenders)
			{
				this._responseSenders[id].onPeerReconnect();
			}
		});
	}

	get closed()
	{
		return this._closed;
	}

	get online()
	{
		return this._online;
	}

	toString()
	{
		return this._tostring;
	}

	close(code, reason)
	{
		if (!this._online)
			return;

		code = code || CLOSE_CODES.NORMAL_CLOSURE.code;
		reason = reason || CLOSE_CODES.NORMAL_CLOSURE.reason;

		logger.debug('close() | %s [code:%d, reason:"%s"]', this, code, reason);

		this._closed = true;
		this._transport.close(code, reason);
	}

	send(msg)
	{
		// Request
		if (msg instanceof Request)
		{
			let id = '_' + msg.id;  // Force id to be string so the Object keys order is guaranteed

			// Give a chance to the app to set events for the request
			setImmediate(() =>
			{
				// Retranmission or duplicated id, ignore it
				if (this._clientTransactions[id])
				{
					logger.error('send() | %s client transaction with id %d already exists, request not sent', this, msg.id);

					return;
				}

				this._clientTransactions[id] = new ClientTransaction(this, msg, () =>
				{
					setImmediate(() =>
					{
						delete this._clientTransactions[id];
					});
				});
			});
		}
		// Response
		else
		{
			let id = msg._id;

			// Same response sent twice. Ignore it
			if (this._responseSenders[id])
			{
				logger.error('send() | %s response already sent, ignored', this);

				return;
			}

			this._responseSenders[id] = new ResponseSender(this, msg, () =>
			{
				setImmediate(() =>
				{
					delete this._responseSenders[id];
				});
			});
		}
	}

	cancel(req, endRequest)
	{
		let id = '_' + req.id;
		let transaction = this._clientTransactions[id];

		if (!transaction)
		{
			logger.error('cancel() | %s no client transaction with id %d', this, req.id);

			return;
		}

		transaction.cancel(endRequest);
	}

	attachTransport(transport, code, reason)
	{
		// If the peer had another transport then detach it
		if (this._transport)
			this._transport.drop(code, reason);

		this._transport = transport;
		this._online = true;
		this._closed = false;
		this._tostring = `[username:${this.username} | uuid:${this.uuid} | transport:${this._transport}]`;

		logger.debug('attachTransport() | %s', this);

		// Set transport events
		this._transport.setEvents(
			{
				request: (req) =>
				{
					// TODO: Validate server transactions, retransmissions...?
					// For that I need a ServerTransaction class
					this._events.request(req);
				},

				response: (res) =>
				{
					let id = '_' + res.id;
					let clientTransaction = this._clientTransactions[id];

					if (clientTransaction)
						clientTransaction.handleResponse(res);
					else
						logger.debug('%s ignoring unsolicited response', this);
				},

				close: (code, reason, locallyClosed) =>
				{
					logger.debug('%s closed [code:%d, reason:"%s", locally closed:%s]', this, code, reason, locallyClosed);

					this._online = false;
					this._events.close();
				}
			});
	}
}

module.exports = Peer;
