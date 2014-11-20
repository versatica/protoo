/**
 * Expose the Peer class.
 */
module.exports = Peer;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Peer');
// var debugerror = require('debug')('protoo:ERROR:Peer');  // TODO: enable when used.
var SimpleEventEmitter = require('./Utils/SimpleEventEmitter');
var C = require('./Protoocol/Constants');


/**
 * Peer.
 *
 * @class Peer
 * @constructor
 * @param {String} username
 * @param {String} uuid
 * @param {Object} data
 */
function Peer(username, uuid, data, transport) {
	SimpleEventEmitter.call(this);

	// Attributes.
	this.username = username;
	this.uuid = uuid;
	this.data = data || {};
	this.transport = undefined;
	this.tostring = undefined;

	// Status.
	this.closed = false;

	// Attach transport.
	this.attachTransport(transport);
}


Peer.prototype.toString = function() { return this.tostring; };
Peer.prototype.valueOf  = function() { return this.tostring; };


Peer.prototype.setData = function(data) {
	this.data = data || {};
};


Peer.prototype.attachTransport = function(transport) {
	debug('%s attachTransport() [transport:%s]', this, transport);

	// If the peer had another transport then detach it.
	if (this.transport) {
		this.transport.detachPeer();
		this.transport.close(C.CLOSE_CODES.ONLINE_ELSEWHERE, 'online elsewhere');
	}

	this.transport = transport;
	this.transport.attachPeer(this);

	this.tostring = '[username:' + this.username + ' | uuid:' + this.uuid + ' | transport:' + this.transport + ']';
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

	this.emit('close');
};
