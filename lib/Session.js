/**
 * Expose the Session class.
 */
module.exports = Session;


/**
 * Dependencies.
 */
var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	pathJoin = require('path').join,
	debug = require('debug')('protoo:Session'),
	randomString = require('random-string'),


/**
 * Local variables.
 */
	sessions = {},


/**
 * Internal constants.
 */
	STATUS = {
		CONNECTING: 0,  // Sending 'session' to peerB.
		PROGRESS:   1,  // Provisional response from peerB.
		CONNECTED:  2,  // Session accepted by peerB.
		CLOSED:     3   // Session rejected by peerB or ended by peerA or peerB.
	};


function Session(data) {
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

	this.sessionReq.reply(100, 'connecting', {
		sessionPath: this.path
	});

	this.sessionReq.data.sessionPath = this.path;
	this.peerB.send(this.sessionReq);

	this.sessionReq.on('incomingResponse', function (res) {
		receiveSessionResponse.call(self, res);
	});

	// Called on "session" request timeout without final response.
	// this.sessionReq.on('needCancel', function () {
	// 	// Must generate and send a "end" request to peerB.
	// 	var endRequest = Request.factory({
	// 		method: 'end',
	// 		data: {
	// 			sessionPath: self.path
	// 		}
	// 	});

	// 	self.peerB.send(endRequest);
	// });
}


util.inherits(Session, EventEmitter);


/**
 * Class methods.
 */


Session.add = function (data) {
	// TODO: Validate data.

	data.id = randomString({length: 16});

	// Create a new Session and add it to the sessions container.
	sessions[data.id] = new Session(data);
};


Session.get = function (id) {
	return sessions[id];
};


/**
 * Public instance methods.
 */


Session.prototype.handleRequest = function (req) {
	var status = this.status,
		srcPeer = req.peer,
		dstPeer = (srcPeer === this.peerA ? this.peerB : this.peerA);

	if (status === STATUS.CLOSED) {
		debug('handleRequest() | in-session request in "closed" status');
		req.reply(404, 'session closed');
		return;
	}

	// Set .sessionPath into .data.
	req.data.sessionPath = this.path;

	switch (req.method) {

		case 'end':
			// If not connected, cancel the ongoing 'session' request.
			if (status !== STATUS.CONNECTED) {
				if (srcPeer === this.peerB) {
					req.reply(400, 'cannot send "end" on a non connected session');
					return;
				}
				// This will generate a reject 'incomingResponse' in the 'session' request
				// which will destroy the session.
				this.peerB.cancel(this.sessionReq, req);
				// Resply 200 to the 'end' request.
				req.reply(200, 'session canceled');
			// If connected close the session.
			} else {
				close.call(this);
				// Reply to the 'end' and forward it to the destination peer.
				req.reply(200, 'session ended');
				dstPeer.send(req);
			}
			break;

		default:
			dstPeer.send(req);

			req.on('incomingResponse', function (res) {
				req.reply(res);
			});
	}
};


/**
 * Private API.
 */


function receiveSessionResponse(res) {
	switch (this.status) {

		case STATUS.CONNECTING:
			if (res.isProvisional) {
				debug('receiveSessionResponse() | session "progress"');
				this.status = STATUS.PROGRESS;
				this.sessionReq.reply(res);
			} else if (res.isAccept) {
				debug('receiveSessionResponse() | session "connected"');
				this.status = STATUS.CONNECTED;
				this.sessionReq.reply(res);
			} else {
				debug('receiveSessionResponse() | session "closed"');
				close.call(this);
				this.sessionReq.reply(res);
			}
			break;

		case STATUS.PROGRESS:
			if (res.isProvisional) {
				this.sessionReq.reply(res);
			} else if (res.isAccept) {
				debug('receiveSessionResponse() | session "connected"');
				this.status = STATUS.CONNECTED;
				this.sessionReq.reply(res);
			} else {
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


function close() {
	debug('close() | [path:%s, peerA:%s, peerB:%s]', this.path, this.peerA, this.peerB);

	this.status = STATUS.CLOSED;

	// Remove the session from the sessions container.
	delete sessions[this.id];
}
