'use strict';

const EventEmitter = require('events').EventEmitter;
const path = require('path');

const logger = require('./logger')('Session');
const utils = require('./utils');
const Request = require('./Request');

// Map of Sessions
let sessions = new Map();

const	STATUS =
{
	CONNECTING : 0,  // Sending 'session' to peerB
	PROGRESS   : 1,  // Provisional response from peerB
	OPEN       : 2,  // Session accepted by peerB
	CLOSED     : 3   // Session rejected by peerB or ended by peerA or peerB
};

class Session extends EventEmitter
{
	static add(data)
	{
		data.id = utils.randomString(16);

		let session = new Session(data);

		// Add the new session to the sessions container
		sessions.set(data.id, session);

		return session;
	}

	static get(id)
	{
		return sessions.get(id);
	}

	constructor(data)
	{
		super();
		this.setMaxListeners(Infinity);

		this._id = data.id;

		/**
		 * Public attributes
		 */
		this.path = path.join(data.basePath, data.id);
		this.peerA = data.peerA;
		this.peerB = data.peerB;
		this.sessionReq = data.req;

		logger.debug('constructor() [path:%s, peerA:%s, peerB:%s]', this.path, this.peerA, this.peerB);

		// No status until send() is called
		this._status = null;

		// Reply 100 and send the "session" request indicating the session path

		this.sessionReq.reply(100, 'connecting',
			{
				sessionPath : this.path
			});

		this.sessionReq.data.sessionPath = this.path;

		this.sessionReq.on('incomingResponse', (res) =>
		{
			this._receiveSessionResponse(res);
		});

		// Handle peerA abrupt disconnection
		this.peerA.on('offline', () =>
		{
			switch (this.status)
			{
				case STATUS.CLOSED:
				{
					break;
				}

				case STATUS.CONNECTING:
				case STATUS.PROGRESS:
				{
					// This will generate a reject 'incomingResponse' in the 'session' request
					// which will destroy the session
					this.peerB.cancel(this.sessionReq);

					break;
				}

				case STATUS.OPEN:
				{
					this._close();

					// Generate a "end" request and send it
					let endRequest = Request.factory(
						{
							method : 'end'
						});

					endRequest.data.sessionPath = this.sessionReq.data.sessionPath;
					this.peerB.send(endRequest);

					break;
				}
			}
		});

		// Handle peerB abrupt disconnection
		this.peerB.on('offline', () =>
		{
			switch (this._status)
			{
				case STATUS.CLOSED:
				{
					break;
				}

				case STATUS.CONNECTING:
				case STATUS.PROGRESS:
				{
					// The client transaction will generate a 410 for peerA
					break;
				}

				case STATUS.OPEN:
				{
					this._close();

					// Generate a "end" request and send it
					let endRequest = Request.factory(
						{
							method : 'end'
						});

					endRequest.data.sessionPath = this.sessionReq.data.sessionPath;
					this.peerA.send(endRequest);

					break;
				}
			}
		});
	}

	send()
	{
		this._status = STATUS.CONNECTING;

		this.peerB.send(this.sessionReq);
	}

	handleRequest(req)
	{
		let status = this._status;
		let srcPeer = req.peer;
		let dstPeer = (srcPeer === this.peerA ? this.peerB : this.peerA);

		if (status === STATUS.CLOSED)
		{
			logger.debug('handleRequest() | in-session request in "closed" status');

			req.reply(404, 'session closed');
			return;
		}

		// Set .sessionPath into .data
		req.data.sessionPath = this.path;

		switch (req.method)
		{
			case 'end':
			{
				// If not connected, cancel the ongoing 'session' request
				if (status !== STATUS.OPEN)
				{
					if (srcPeer === this.peerB)
					{
						req.reply(400, 'cannot send "end" on a non open session');

						return;
					}

					// This will generate a reject 'incomingResponse' in the 'session' request
					// which will destroy the session
					this.peerB.cancel(this.sessionReq, req);

					// Reply 200 to the 'end' request
					req.reply(200, 'session canceled');
				}
				// If open close the session
				else
				{
					this._close();

					// Reply to the 'end' and forward it to the destination peer
					req.reply(200, 'session ended');
					dstPeer.send(req);
				}

				break;
			}

			default:
			{
				dstPeer.send(req);

				req.on('incomingResponse', (res) =>
				{
					req.reply(res);
				});
			}
		}
	}

	_close()
	{
		logger.debug('close() [path:%s, peerA:%s, peerB:%s]', this.path, this.peerA, this.peerB);

		this._status = STATUS.CLOSED;
		this.emit('close');

		// Remove the session from the sessions container
		sessions.delete(this._id);
	}

	_receiveSessionResponse(res)
	{
		switch (this._status)
		{
			case STATUS.CONNECTING:
			{
				if (res.isProvisional)
				{
					logger.debug('_receiveSessionResponse() | session "progress"');

					this._status = STATUS.PROGRESS;
					this.emit('progress');
					this.sessionReq.reply(res);
				}
				else if (res.isAccept)
				{
					logger.debug('_receiveSessionResponse() | session "open"');

					this._status = STATUS.OPEN;
					this.emit('open');
					this.sessionReq.reply(res);
				}
				else
				{
					logger.debug('_receiveSessionResponse() | session "closed"');

					this._close();
					this.sessionReq.reply(res);
				}

				break;
			}

			case STATUS.PROGRESS:
			{
				if (res.isProvisional)
				{
					this.sessionReq.reply(res);
				}
				else if (res.isAccept)
				{
					logger.debug('_receiveSessionResponse() | session "open"');

					this._status = STATUS.OPEN;
					this.emit('open');
					this.sessionReq.reply(res);
				}
				else
				{
					logger.debug('_receiveSessionResponse() | session "closed"');

					this._close();
					this.sessionReq.reply(res);
				}

				break;
			}

			case STATUS.OPEN:
			{
				logger.debug('_receiveSessionResponse() | ignoring response to initial "session" request in "open" status');

				break;
			}

			case STATUS.CLOSED:
			{
				logger.debug('_receiveSessionResponse() | ignoring response to initial "session" request in "closed" status');

				break;
			}

			default:
				throw new Error(`invalid session status "${this.status}"`);
		}
	}
}

module.exports = Session;
