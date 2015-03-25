/**
 * Expose the ResponseSender class.
 */
module.exports = ResponseSender;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:ResponseSender');
var debugerror = require('debug')('protoo:ERROR:ResponseSender');


/**
 * Constants.
 */
var SENDING_TIMEOUT = 10000;  // 10 seconds.


function ResponseSender(peer, res, onended) {
	debug('new() | [status:%d, username:%s, uuid:%s]', res.status, peer.username, peer.uuid);

	this.peer = peer;
	this.res = res;
	this.onended = onended;

	// Sending ended or failed.
	this.ended = false;

	// If the peer is offline don't even attempt to send the request.
	if (peer.offline) {
		debug('peer is offline, failed');
		end.call(this);
		return;
	}

	// Set the sending timer.
	this.timer = setTimeout(function() {
		debug('timeout');
		end.call(this);
	}, SENDING_TIMEOUT);

	// Peer is connected.
	if (peer.connected) {
		debug('peer is connected, sending the response now');
		send.call(this);
	}
	// Peer is not connected but may reconnect.
	else {
		debug('peer is disconnected, waiting for reconnect');
	}
}


ResponseSender.prototype.onPeerOffline = function() {
	if (this.ended) { return; }

	debug('peer is offline, response not sent');
	end.call(this);
};


ResponseSender.prototype.onPeerReconnect = function() {
	if (this.ended) { return; }

	debug('peer reconnected, sending the response now');
	send.call(this);
};


/**
 * Private API.
 */


function send() {
	var sent = this.peer.transport.send(this.res);

	// false means error.
	if (sent === false) {
		debugerror('error sending the response due to bad syntax');
	}

	end.call(this);
}


function end() {
	var self = this;

	this.ended = true;
	clearTimeout(this.timer);

	if (this.onended) {
		// Wait for the ResponseSender to be inserted into the peer's responseSenders object.
		setImmediate(function() {
			self.onended();
		});
	}
}
