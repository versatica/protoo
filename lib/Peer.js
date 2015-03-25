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
var Request = require('./Request');
var ClientTransaction = require('./ClientTransaction');


/**
 * Internal constants.
 */
var CLOSE_CODES = {
	NORMAL_CLOSURE: {code: 1000, reason: 'normal closure'}
};


function Peer(username, uuid, data, events) {
	debug('new() | [username:%s, uuid:%s]', username, uuid);

	var self = this;

	EventEmitter.call(this);

	/**
	 * Public attributes.
	 */
	this.username = username;
	this.uuid = uuid;
	this.data = data;

	/**
	 * Private attributes.
	 */
	this.transport = null;
	this.connected = false;
	this.closed = false;  // close() called.
	this.offline = false;  // Final status after definitive disconnection.
	this.tostring = null;
	this.clientTransactions = {};

	// Events.
	this.events = events;

	// Set events 'offline' and 'reconnect' for handling pending transactions.
	this.on('offline', function() {
		for (var id in self.clientTransactions) {
			self.clientTransactions[id].onPeerOffline();
		}
	});

	this.on('reconnect', function() {
		for (var id in self.clientTransactions) {
			self.clientTransactions[id].onPeerReconnect();
		}
	});
}


util.inherits(Peer, EventEmitter);


Peer.prototype.toString = function() {
	return this.tostring;
};


/**
 * Public API.
 */


Peer.prototype.close = function(code, reason) {
	if (! this.connected) { return; }

	code = code || CLOSE_CODES.NORMAL_CLOSURE.code;
	reason = reason || CLOSE_CODES.NORMAL_CLOSURE.reason;

	debug('close() | %s [code:%d, reason:"%s"]', this, code, reason);

	this.closed = true;
	this.transport.close(code, reason);
};


Peer.prototype.send = function(msg) {
	var self = this,
		id = '_' + msg.id;  // Force id to be string so the Object keys order is guaranteed.

	// Request.
	if (msg instanceof Request) {
		setImmediate(function() {
			// Retranmission or duplicated id. Ignore it.
			if (self.clientTransactions[id]) {
				debugerror('send() | %s client transaction with id %d already exists, request not sent', self, msg.id);
				return;
			}

			self.clientTransactions[id] = new ClientTransaction(self, msg, function onended() {
				delete self.clientTransactions[id];
			});
		});
	}

	// Response.
	// TODO: Create a ServerTransaction for sending responses reliably.
	else {
		this.transport.send(msg);
	}
};


Peer.prototype.cancel = function(req, emitNeedCancel) {
	var id = '_' + req.id,
		transaction = this.clientTransactions[id];

	if (! transaction) {
		debugerror('cancel() | %s no client transaction with id %d', this, req.id);
		return;
	}

	transaction.cancel(emitNeedCancel);
};


/**
 * Private API.
 */


Peer.prototype.attachTransport = function(transport, code, reason) {
	var self = this;

	// If the peer had another transport then detach it.
	if (this.transport) {
		this.transport.drop(code, reason);
	}

	this.transport = transport;
	this.connected = true;
	this.closed = false;

	setToString.call(this);
	debug('attachTransport() | %s', this);

	// Set transport events.
	this.transport.setEvents({
		request: function(req) {
			// TODO: Validate server transactions, retransmissions...
			self.events.request(req);
		},

		response: function(res) {
			var id = '_' + res.id,
				clientTransaction = self.clientTransactions[id];

			if (clientTransaction) {
				clientTransaction.receiveResponse(res);
			}
			else {
				debug('%s ignoring unsolicited response', self);
			}
		},

		close: function(code, reason, locallyClosed) {
			debug('%s closed [code:%d, reason:"%s", locally closed:%s]', self, code, reason, locallyClosed);

			self.connected = false;
			self.events.close();
		}
	});
};


function setToString() {
	this.tostring = '[username:' + this.username + ' | uuid:' + this.uuid + ' | transport:' + this.transport + ']';
}
