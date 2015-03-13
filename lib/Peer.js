/**
 * Expose the Peer class.
 */
module.exports = Peer;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Peer');
var debugerror = require('debug')('protoo:ERROR:Peer');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var parse = require('./parse');
var Request = require('./Request');


/**
 * Internal constants.
 */
var C = {
	CLOSE_CODES: {
		NORMAL_CLOSURE: {code: 1000, reason: 'normal closure'}
	}
};


function Peer(username, uuid, data, events) {
	debug('new() | [username:%s, uuid:%s]', username, uuid);

	EventEmitter.call(this);

	/**
	 * Public attributes.
	 */
	this.username = username;
	this.uuid = uuid;
	this.data = data;
	this.connected = false;

	/**
	 * Private attributes.
	 */
	this.transport = null;
	this.closed = false;  // close() called.
	this.tostring = null;

	// Events.
	this.events = events;
}


util.inherits(Peer, EventEmitter);


Peer.prototype.toString = function() {
	return this.tostring;
};
// Peer.prototype.valueOf = Peer.prototype.toString;


/**
 * Public API.
 */


Peer.prototype.close = function(code, reason) {
	if (! this.connected) { return; }

	code = code || C.CLOSE_CODES.NORMAL_CLOSURE.code;
	reason = reason || C.CLOSE_CODES.NORMAL_CLOSURE.reason;

	debug('close() | %s [code:%d, reason:"%s"]', this, code, reason);

	this.closed = true;
	this.transport.close(code, reason);
};


Peer.prototype.send = function(msg) {
	if (! this.connected) { return false; }

	return this.transport.send(msg);
};


/**
 * Private API.
 */


Peer.prototype._setData = function(data) {
	this.data = data;
};


Peer.prototype._attachTransport = function(transport, code, reason) {
	var self = this;

	// If the peer had another transport then detach it.
	if (this.transport) {
		this.transport.drop(code, reason);
	}

	this.transport = transport;
	this.connected = true;
	this.closed = false;

	setToString.call(this);
	debug('_attachTransport() | %s', this);

	// Set transport events.
	this.transport.setEvents({
		message: function(raw) {
			var msg;

			if (raw.type === 'binary') {
				debugerror('%s ignoring binary message', self);
				return;
			}

			msg = parse(raw.utf8Data);
			if (! msg) { return; }

			if (msg instanceof Request) {
				self.events.request(msg);
			}
			else {
				self.events.response(msg);
			}
		},

		close: function(code, reason, locallyClosed) {
			debug('%s closed [code:%d, reason:"%s", locally closed:%s]', self, code, reason, locallyClosed);

			self.connected = false;
			self.events.close();
			self.emit('close');
		}
	});
};


function setToString() {
	this.tostring = '[username:' + this.username + ' | uuid:' + this.uuid + ' | transport:' + this.transport + ']';
}
