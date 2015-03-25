/**
 * Expose the ClientTransaction class.
 */
module.exports = ClientTransaction;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:ClientTransaction');
var debugerror = require('debug')('protoo:ERROR:ClientTransaction');


/**
 * Constants.
 */
var SENDING_TIMEOUT = 10000;  // 10 seconds.
var SESSION_SENDING_TIMEOUT = 120000;  // 2 minutes.
var ERRORS = {
	TIMEOUT:     1,
	CANCELED:    2,
	OFFLINE:     3,
	BAD_REQUEST: 4
};


function ClientTransaction(peer, req, onended) {
	debug('new() | [method:%s, username:%s, uuid:%s]', req.method, peer.username, peer.uuid);

	var self = this;

	this.peer = peer;
	this.req = req;
	this.onended = onended;
	this.isSession = req.method === 'session';

	// Request sent to the remote peer.
	this.sent = false;

	// Final response from the remote peer, timeout or error.
	this.ended = false;

	// If the peer is offline don't even attempt to send the request.
	if (peer.offline) {
		debug('peer is offline, failed');
		fail.call(this, ERRORS.OFFLINE);
		return;
	}

	// Set the sending timer.
	this.timer = setTimeout(function() {
		debug('transaction timeout');

		fail.call(self, ERRORS.TIMEOUT);

		if (self.isSession && self.sent) {
			// Give a chance to the app to set the 'needCancel' event.
			setImmediate(function() {
				self.req.emit('needCancel');
			});
		}
	}, (this.isSession ? SESSION_SENDING_TIMEOUT : SENDING_TIMEOUT));

	// Peer is connected.
	if (peer.connected) {
		debug('peer is connected, sending the request now');
		send.call(this);
	}
	// Peer is not connected but may reconnect.
	else {
		debug('peer is disconnected, waiting for reconnect');
	}
}


ClientTransaction.prototype.receiveResponse = function(res) {
	/**
	 * Validate status.
	 */

	if (this.ended) {
		debug('receiveResponse() | transaction ended, ignoring received response: %s', res);
		return;
	}

	if (res.status >= 200) {
		end.call(this);
	}

	this.req.emit('incomingResponse', res);
};


ClientTransaction.prototype.cancel = function(emitNeedCancel) {
	if (this.ended) { return; }

	var self = this;

	debug('cancel() | canceling transaction');

	fail.call(this, ERRORS.CANCELED);

	if (emitNeedCancel && this.isSession && this.sent) {
		// Give a chance to the app to set the 'needCancel' event.
		setImmediate(function() {
			self.req.emit('needCancel');
		});
	}
};


ClientTransaction.prototype.onPeerOffline = function() {
	if (this.ended) { return; }

	debug('peer is offline, transaction failed');
	fail.call(this, ERRORS.OFFLINE);
};


ClientTransaction.prototype.onPeerReconnect = function() {
	if (this.ended || this.sent) { return; }

	debug('peer reconnected, sending the request now');
	send.call(this);
};


/**
 * Private API.
 */


function send() {
	this.sent = this.peer.transport.send(this.req);

	// false means error.
	if (this.sent === false) {
		debugerror('error sending the request due to bad syntax');
		fail.call(this, ERRORS.BAD_REQUEST);
	}
}


function fail(error) {
	var self = this,
		status,
		reason,
		res;

	end.call(this);

	switch (error) {
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
			throw new Error('protoo.ClientTransaction.fail() | unknown error %s', error);
	}

	// Create a Response instance.
	res = this.req.createResponse(status, reason);

	// Give a chance to the app to set the 'incomingResponse' event.
	setImmediate(function() {
		self.req.emit('incomingResponse', res, true);
	});
}


function end() {
	this.ended = true;
	clearTimeout(this.timer);

	if (this.onended) {
		this.onended();
	}
}
