'use strict';

const logger = require('./logger')('ClientTransaction');
const Request = require('./Request');

const SENDING_TIMEOUT = 10000; // 10 seconds
const SESSION_SENDING_TIMEOUT = 120000; // 2 minutes
const ERRORS =
{
	TIMEOUT:     1,
	CANCELED:    2,
	OFFLINE:     3,
	BAD_REQUEST: 4
};

class ClientTransaction
{
	constructor(peer, req, onended)
	{
		logger.debug('new() [method:%s, username:%s, uuid:%s]', req.method, peer.username, peer.uuid);

		this._peer = peer;
		this._req = req;
		this._onended = onended;
		this._isSession = req.method === 'session';

		// Request sent to the remote peer
		this._sent = false;

		// Final response from the remote peer, timeout or error
		this._ended = false;

		// If the peer is offline don't even attempt to send the request
		if (peer.offline)
		{
			logger.debug('peer is offline, failed');

			setImmediate(() => this._fail(ERRORS.OFFLINE));

			return;
		}

		// Set the sending timer
		this._timer = setTimeout(() =>
		{
			logger.debug('timeout');

			this._fail(ERRORS.TIMEOUT);

			if (this._isSession && this._sent)
			{
				// Send 'end' request
				this._peer.send(Request.factory(
					{
						method : 'end',
						data   :
						{
							sessionPath : this._req.data.sessionPath
						}
					}));
			}
		}, (this._isSession ? SESSION_SENDING_TIMEOUT : SENDING_TIMEOUT));

		// Peer is online
		if (peer.online)
		{
			logger.debug('peer is online, sending the request now');

			this._send();
		}
		// Peer is not online but may reconnect
		else
		{
			logger.debug('peer is not online, waiting for reconnect');
		}
	}

	handleResponse(res)
	{
		if (this._ended)
		{
			logger.debug('handleResponse() | transaction ended, ignoring received response: %s', res);

			return;
		}

		// Attach the peer to the response
		// TODO: I don't like this
		res.peer = this._peer;

		if (res.status >= 200)
			this._end();

		this._req.emit('incomingResponse', res);
	}

	cancel(endRequest)
	{
		if (this._ended)
			return;

		this._fail(ERRORS.CANCELED);

		if (this._isSession && this._sent)
		{
			endRequest = endRequest || Request.factory(
				{
					method : 'end'
				});

			// Ensure .data.sessionPath is set
			endRequest.data.sessionPath = this._req.data.sessionPath;

			this._peer.send(endRequest);
		}
	}

	onPeerOffline()
	{
		if (this._ended)
			return;

		logger.debug('peer is offline, transaction failed');

		this._fail(ERRORS.OFFLINE);
	}

	onPeerReconnect()
	{
		if (this._ended)
			return;

		logger.debug('peer reconnected, sending the request now');

		this._send();
	}

	_send()
	{
		// TODO: I hate this
		this._sent = this._peer._transport.send(this._req);

		// false means error
		if (this._sent === false)
		{
			logger.error('error sending the request due to bad syntax');

			this._fail(ERRORS.BAD_REQUEST);
		}
	}

	_fail(error)
	{
		let status;
		let reason;
		let res;

		this._end();

		switch (error)
		{
			case ERRORS.TIMEOUT:
				status = 408;
				reason = 'sending timeout';
				break;

			case ERRORS.CANCELED:
				status = 487;
				reason = 'canceled';
				break;

			case ERRORS.OFFLINE:
				status = 410;
				reason = 'peer offline';
				break;

			case ERRORS.BAD_REQUEST:
				status = 400;
				reason = 'bad request';
				break;

			default:
				throw new Error(`unknown error: ${error}`);
		}

		// Create a Response instance
		res = this._req.createResponse(status, reason);

		// Give a chance to the app to set the 'incomingResponse' event
		setImmediate(() => this._req.emit('incomingResponse', res, true));
	}

	_end()
	{
		this._ended = true;
		clearTimeout(this._timer);

		if (this._onended)
			this._onended();
	}
}

module.exports = ClientTransaction;
