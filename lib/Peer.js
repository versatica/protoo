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
	// Attributes.
	this.username = username;
	this.uuid = uuid;
	this.data = data || {};
	this.transport = null;
	this.tostring = null;

	// Events.
	this.events = events;

	// Status.
	this.closed = false;
}


Peer.prototype.toString = function() { return this.tostring; };
Peer.prototype.valueOf  = function() { return this.tostring; };


Peer.prototype.setData = function(data) {
	this.data = data || {};
};


Peer.prototype.attachTransport = function(transport, code, reason) {
	// If the peer had another transport then detach it.
	if (this.transport) {
		this.transport.drop(code, reason);
	}

	this.transport = transport;
	this.transport.attachPeer(this);

	this.tostring = '[username:' + this.username + ' | uuid:' + this.uuid + ' | transport:' + this.transport + ']';

	debug('%s attachTransport() [transport:%s]', this, transport);
};


Peer.prototype.close = function(code, reason) {
	if (this.closed) { return; }

	debug('%s close() [code:%d | reason:%s]', this, code, reason);

	this.closed = true;
	this.transport.close(code, reason);
};


Peer.prototype.onMessage = function(msg) {  // jshint ignore:line
	if (this.closed) { return; }

	debug('%s onMessage()', this);
};


Peer.prototype.onClose = function(code, reason, locally_closed) {
	debug('%s onClose() [code:%d | reason:%s | locally closed:%s]', this, code, reason, locally_closed);

	this.events.close();
};
