/**
 * Expose the Peer class.
 */
module.exports = Peer;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Peer');
var debugerror = require('debug')('protoo:ERROR:Peer');  // TODO: enable when used.
debugerror.log = console.warn.bind(console);


function Peer(username, uuid, data, events) {
	debug('new() | [username:%s, uuid:%s]', username, uuid);

	// Attributes.
	this.username = username;
	this.uuid = uuid;
	this.data = data || {};
	this.transport = null;
	this.tostring = null;

	// Events.
	this.events = events;
}


Peer.prototype.toString = function() { return this.tostring; };
Peer.prototype.valueOf  = function() { return this.tostring; };


Peer.prototype.setData = function(data) {
	this.data = data || {};
};


Peer.prototype.attachTransport = function(transport, code, reason) {
	var self = this;

	// If the peer had another transport then detach it.
	if (this.transport) {
		this.transport.drop(code, reason);
	}

	this.transport = transport;
	this.tostring = '[username:' + this.username + ' | uuid:' + this.uuid + ' | transport:' + this.transport + ']';

	debug('attachTransport() | %s', this);

	// Set transport events.
	this.transport.setEvents({
		message: function(msg) {
			debug('%s message received', self);

			if (msg.type === 'binary') {
				debug('%s ignoring binary message', self);
				return;
			}

			// TODO
		},

		close: function(code, reason, locallyClosed) {
			debug('%s closed [code:%d | reason:%s | locally closed:%s]', self, code, reason, locallyClosed);

			self.events.close();
		}
	});
};


Peer.prototype.close = function(code, reason) {
	debug('close() | %s [code:%d | reason:%s]', this, code, reason);

	this.transport.close(code, reason);
};
