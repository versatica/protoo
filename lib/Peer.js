/**
 * Expose the Peer class.
 */
module.exports = Peer;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Peer'),
	debugerror = require('debug')('protoo:ERROR:Peer'),
	EventEmitter = require('events').EventEmitter,
	util = require('util'),
	Request = require('./Request'),
	ClientTransaction = require('./ClientTransaction'),
	ResponseSender = require('./ResponseSender'),


/**
 * Internal constants.
 */
	CLOSE_CODES = {
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
	this.responseSenders = {};

	// Events.
	this.events = events;

	// Set events 'offline' and 'reconnect' for handling pending transactions.
	this.on('offline', function () {
		var id;

		for (id in self.clientTransactions) {
			self.clientTransactions[id].onPeerOffline();
		}
		for (id in self.responseSenders) {
			self.responseSenders[id].onPeerOffline();
		}
	});

	this.on('reconnect', function () {
		var id;

		for (id in self.clientTransactions) {
			self.clientTransactions[id].onPeerReconnect();
		}
		for (id in self.responseSenders) {
			self.responseSenders[id].onPeerReconnect();
		}
	});
}


util.inherits(Peer, EventEmitter);


Peer.prototype.toString = function () {
	return this.tostring;
};


/**
 * Public API.
 */


Peer.prototype.close = function (code, reason) {
	if (!this.connected) {
		return;
	}

	code = code || CLOSE_CODES.NORMAL_CLOSURE.code;
	reason = reason || CLOSE_CODES.NORMAL_CLOSURE.reason;

	debug('close() | %s [code:%d, reason:"%s"]', this, code, reason);

	this.closed = true;
	this.transport.close(code, reason);
};


Peer.prototype.send = function (msg) {
	var self = this,
		id;

	// Request.
	if (msg instanceof Request) {
		id = '_' + msg.id;  // Force id to be string so the Object keys order is guaranteed.

		// Give a chance to the app to set events for the request.
		setImmediate(function () {
			// Retranmission or duplicated id. Ignore it.
			if (self.clientTransactions[id]) {
				debugerror('send() | %s client transaction with id %d already exists, request not sent', self, msg.id);
				return;
			}

			self.clientTransactions[id] = new ClientTransaction(self, msg, function onended() {
				setImmediate(function () {
					delete self.clientTransactions[id];
				});
			});
		});
	// Response.
	} else {
		id = msg._id;

		// Same response sent twice. Ignore it.
		if (self.responseSenders[id]) {
			debugerror('send() | %s response already sent, ignored', this);
			return;
		}

		this.responseSenders[id] = new ResponseSender(this, msg, function onended() {
			setImmediate(function () {
				delete self.responseSenders[id];
			});
		});
	}
};


Peer.prototype.cancel = function (req, endRequest) {
	var id = '_' + req.id,
		transaction = this.clientTransactions[id];

	if (!transaction) {
		debugerror('cancel() | %s no client transaction with id %d', this, req.id);
		return;
	}

	transaction.cancel(endRequest);
};


/**
 * Private API.
 */


Peer.prototype.attachTransport = function (transport, code, reason) {
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
		request: function (req) {
			// TODO: Validate server transactions, retransmissions...?
			// For that I need a ServerTransaction class.
			self.events.request(req);
		},

		response: function (res) {
			var id = '_' + res.id,
				clientTransaction = self.clientTransactions[id];

			if (clientTransaction) {
				clientTransaction.receiveResponse(res);
			} else {
				debug('%s ignoring unsolicited response', self);
			}
		},

		close: function (code, reason, locallyClosed) {
			debug('%s closed [code:%d, reason:"%s", locally closed:%s]', self, code, reason, locallyClosed);

			self.connected = false;
			self.events.close();
		}
	});
};


function setToString() {
	this.tostring = '[username:' + this.username + ' | uuid:' + this.uuid + ' | transport:' + this.transport + ']';
}
