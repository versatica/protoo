/**
 * Expose the Session class.
 */
module.exports = Session;


/**
 * Dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var pathJoin = require('path').join;
var debug = require('debug')('protoo:Session');
// var debugerror = require('debug')('protoo:ERROR:Session');
var randomString = require('random-string');


/**
 * Local variables.
 */
var sessions = {};


/**
 * Internal constants.
 */
var STATUS = {
	CONNECTING: 0,  // Sending 'session' to peerB.
	PROGRESS:   1,  // Provisional response from peerB.
	CONNECTED:  2,  // Session accepted by peerB.
	CLOSED:     3   // Session rejected by peerB or ended by peerA or peerB.
};


function Session(data) {
	var self = this,
		req = data.req,
		path = pathJoin(data.basePath, data.id);

	EventEmitter.call(this);

	/**
	 * Public attributes.
	 */

	this.id = data.id;
	this.peerA = data.peerA;
	this.peerB = data.peerB;
	this.req = req;

	debug('new() | [path:%s, peerA:%s, peerB:%s]', path, this.peerA, this.peerB);

	// Set status.
	this.status = STATUS.CONNECTING;

	/**
	 * Reply 100 and send the "session" request by adding data.sessionPath.
	 */

	req.reply(100, 'connecting', {
		sessionPath: path
	});

	req.data.sessionPath = path;
	this.peerB.send(req);

	req.on('incomingResponse', function(res) {
		receiveSessionResponse.call(self, res);
	});

	// Called on "session" request timeout without final response.
	req.on('needCancel', function() {
		// TODO: Must send a "end" request to peerB.
	});
}


util.inherits(Session, EventEmitter);


/**
 * Class methods.
 */


Session.add = function(data) {
	// TODO: Validate data.

	data.id = randomString({length: 16});

	// Create a new Session and add it to the sessions container.
	sessions[data.id] = new Session(data);
};


Session.get = function(id) {
	return sessions[id];
};


/**
 * Public instance methods.
 */


Session.prototype.handleRequest = function(req) {
	var status = this.status,
		srcPeer = req.peer,
		dstPeer = (srcPeer === this.peerA ? this.peerB : this.peerA);

	if (status === STATUS.CLOSED) {
		debug('handleRequest() | in-session request in "closed" status');
		req.reply(404, 'session closed');
		return;
	}

	switch (req.method) {

		case 'end':
			// If not connected, cancel the ongoing 'session' request.
			if (status !== STATUS.CONNECTED) {
				// This will generate a reject 'incomingResponse' in the 'session' request.
				this.peerB.cancel(this.req, false);

				req.reply(200, 'session closed');
				if (srcPeer === this.peerA) {
					this.peerB.send(req);
				}
			}
			// If connected close the session.
			else {
				close.call(this);
				// Reply to the 'end' and forward it to the destination peer.
				req.reply(200, 'session closed');
				dstPeer.send(req);
			}
			break;

		default:
			req.on('incomingResponse', function(res) {
				req.reply(res);
			});
			dstPeer.send(req);
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
				this.req.reply(res);
			}
			else if (res.isAccept) {
				debug('receiveSessionResponse() | session "connected"');
				this.status = STATUS.CONNECTED;
				this.req.reply(res);
			}
			else {
				debug('receiveSessionResponse() | session "closed"');
				close.call(this);
				this.req.reply(res);
			}
			break;

		case STATUS.PROGRESS:
			if (res.isProvisional) {
				this.req.reply(res);
			}
			else if (res.isAccept) {
				debug('receiveSessionResponse() | session "connected"');
				this.status = STATUS.CONNECTED;
				this.req.reply(res);
			}
			else {
				debug('receiveSessionResponse() | session "closed"');
				close.call(this);
				this.req.reply(res);
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
	debug('close()');

	this.status = STATUS.CLOSED;

	// Remove the session from the sessions container.
	delete sessions[this.id];
}
