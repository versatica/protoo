var debug = require('debug')('protoo:Session');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var pathJoin = require('path').join;
var randomString = require('random-string');

var Request = require('./Request');

var sessions = {};

const	STATUS =
{
	CONNECTING: 0,  // Sending 'session' to peerB.
	PROGRESS:   1,  // Provisional response from peerB.
	CONNECTED:  2,  // Session accepted by peerB.
	CLOSED:     3   // Session rejected by peerB or ended by peerA or peerB.
};

module.exports = Session;

function Session(data)
{
	var self = this;

	EventEmitter.call(this);

	/**
	 * Public attributes.
	 */

	this.path = pathJoin(data.basePath, data.id);
	this.peerA = data.peerA;
	this.peerB = data.peerB;
	this.sessionReq = data.req;

	debug('new() | [path:%s, peerA:%s, peerB:%s]', this.path, this.peerA, this.peerB);

	// Set initial status.
	this.status = STATUS.CONNECTING;

	/**
	 * Reply 100 and send the "session" request indicating the session path.
	 */

	this.sessionReq.reply(100, 'connecting',
	{
		sessionPath: this.path
	});

	this.sessionReq.data.sessionPath = this.path;
	this.peerB.send(this.sessionReq);

	this.sessionReq.on('incomingResponse', function(res)
	{
		receiveSessionResponse.call(self, res);
	});

	// Handle peerA abrupt disconnection.
	this.peerA.on('offline', function()
	{
		var endRequest;

		switch (self.status)
		{
			case STATUS.CLOSED:
				break;

			case STATUS.CONNECTING:
			case STATUS.PROGRESS:
				// This will generate a reject 'incomingResponse' in the 'session' request
				// which will destroy the session.
				self.peerB.cancel(self.sessionReq);
				break;

			case STATUS.CONNECTED:
				close.call(self);
				// Generate a "end" request and send it.
				endRequest = Request.factory(
					{
						method: 'end'
					});
				endRequest.data.sessionPath = self.sessionReq.data.sessionPath;
				self.peerB.send(endRequest);
				break;
		}
	});

	// Handle peerB abrupt disconnection.
	this.peerB.on('offline', function()
	{
		var endRequest;

		switch (self.status)
		{
			case STATUS.CLOSED:
				break;

			case STATUS.CONNECTING:
			case STATUS.PROGRESS:
				// The client transaction will generate a 410 for peerA.
				break;

			case STATUS.CONNECTED:
				close.call(self);
				// Generate a "end" request and send it.
				endRequest = Request.factory(
					{
						method: 'end'
					});
				endRequest.data.sessionPath = self.sessionReq.data.sessionPath;
				self.peerA.send(endRequest);
				break;
		}
	});
}

util.inherits(Session, EventEmitter);

/**
 * Class methods.
 */

Session.add = function(data)
{
	// TODO: Validate data.

	var session;

	data.id = randomString({ length: 16 });
	session = new Session(data);

	// Add the new session to the sessions container.
	sessions[data.id] = session;

	return session;
};

Session.get = function(id)
{
	return sessions[id];
};

/**
 * Public instance methods.
 */

Session.prototype.handleRequest = function(req)
{
	var status = this.status;
	var srcPeer = req.peer;
	var dstPeer = (srcPeer === this.peerA ? this.peerB : this.peerA);

	if (status === STATUS.CLOSED)
	{
		debug('handleRequest() | in-session request in "closed" status');
		req.reply(404, 'session closed');
		return;
	}

	// Set .sessionPath into .data.
	req.data.sessionPath = this.path;

	switch (req.method)
	{
		case 'end':
			// If not connected, cancel the ongoing 'session' request.
			if (status !== STATUS.CONNECTED)
			{
				if (srcPeer === this.peerB)
				{
					req.reply(400, 'cannot send "end" on a non connected session');
					return;
				}
				// This will generate a reject 'incomingResponse' in the 'session' request
				// which will destroy the session.
				this.peerB.cancel(this.sessionReq, req);
				// Resply 200 to the 'end' request.
				req.reply(200, 'session canceled');
			}
			// If connected close the session.
			else
			{
				close.call(this);
				// Reply to the 'end' and forward it to the destination peer.
				req.reply(200, 'session ended');
				dstPeer.send(req);
			}
			break;

		default:
			dstPeer.send(req);

			req.on('incomingResponse', function(res)
			{
				req.reply(res);
			});
	}
};

/**
 * Private API.
 */

function receiveSessionResponse(res)
{
	switch (this.status)
	{
		case STATUS.CONNECTING:
			if (res.isProvisional)
			{
				debug('receiveSessionResponse() | session "progress"');
				this.status = STATUS.PROGRESS;
				this.emit('progress');
				this.sessionReq.reply(res);
			}
			else if (res.isAccept)
			{
				debug('receiveSessionResponse() | session "connected"');
				this.status = STATUS.CONNECTED;
				this.emit('connect');
				this.sessionReq.reply(res);
			}
			else
			{
				debug('receiveSessionResponse() | session "closed"');
				close.call(this);
				this.sessionReq.reply(res);
			}
			break;

		case STATUS.PROGRESS:
			if (res.isProvisional)
			{
				this.sessionReq.reply(res);
			}
			else if (res.isAccept)
			{
				debug('receiveSessionResponse() | session "connected"');
				this.status = STATUS.CONNECTED;
				this.emit('connect');
				this.sessionReq.reply(res);
			}
			else
			{
				debug('receiveSessionResponse() | session "closed"');
				close.call(this);
				this.sessionReq.reply(res);
			}
			break;

		case STATUS.CONNECTED:
			debug('receiveSessionResponse() | ignoring response to initial "session" request in "connected" status');
			break;

		case STATUS.CLOSED:
			debug('receiveSessionResponse() | ignoring response to initial "session" request in "closed" status');
			break;

		default:
			throw new Error('protoo.Session.receiveSessionResponse() | invalid session status "' + this.status + '"');
	}
}

function close()
{
	debug('close() | [path:%s, peerA:%s, peerB:%s]', this.path, this.peerA, this.peerB);

	this.status = STATUS.CLOSED;
	this.emit('close');

	// Remove the session from the sessions container.
	delete sessions[this.id];
}
