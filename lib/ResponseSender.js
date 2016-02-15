'use strict';

const logger = require('./logger')('ResponseSender');

const	SENDING_TIMEOUT = 10000; // 10 seconds

class ResponseSender
{
	constructor(peer, res, onended)
	{
		logger.debug('constructor() [status:%d, username:%s, uuid:%s]', res.status, peer.username, peer.uuid);

		this._peer = peer;
		this._res = res;
		this._onended = onended;

		// Sending ended or failed
		this._ended = false;

		// If the peer is offline don't even attempt to send the request
		if (peer.offline)
		{
			logger.debug('peer is offline, failed');

			this._end();
			return;
		}

		// Set the sending timer
		this._timer = setTimeout(() =>
		{
			logger.debug('timeout');

			this._end();
		}, SENDING_TIMEOUT);

		// Peer is online
		if (peer.online)
		{
			logger.debug('peer is online, sending the response now');

			this._send();
		}
		// Peer is not online but may reconnect
		else
		{
			logger.debug('peer is not online, waiting for reconnect');
		}
	}

	onPeerOffline()
	{
		if (this._ended)
			return;

		logger.debug('peer is offline, response not sent');

		this._end();
	}

	onPeerReconnect()
	{
		if (this._ended)
			return;

		logger.debug('peer reconnected, sending the response now');

		this._send();
	}

	_send()
	{
		// TODO: I hate this
		let sent = this._peer._transport.send(this._res);

		// false means error
		if (sent === false)
			logger.error('error sending the response due to bad syntax');

		this._end();
	}

	_end()
	{
		this._ended = true;
		clearTimeout(this._timer);

		if (this._onended)
			this._onended();
	}
}

module.exports = ResponseSender;
