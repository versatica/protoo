/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var debug = require('debug')('protoo:Peer');
// var logerror = require('debug')('protoo:ERROR:Peer');  // TODO: enable when used.


/**
 * Peer.
 *
 * @class Peer
 * @constructor
 * @param {String} username
 * @param {String} uuid
 * @param {Object} data
 * @param {WebSocketTransport} transport
 */

var Peer = function(username, uuid, data, transport) {
	events.EventEmitter.call(this);

	// Attributes.
	this.username = username;
	this.uuid = uuid;
	this.data = data;
	this.transport = transport;

	// Attach this Peer to the transport.
	transport.attachPeer(this);

	this.tostring = '[username:' + this.username + ' | uuid:' + this.uuid + ' | transport:' + this.transport + ']';
};

util.inherits(Peer, events.EventEmitter);


Peer.prototype.toString = function() { return this.tostring; };
Peer.prototype.valueOf  = function() { return this.tostring; };


Peer.prototype.disconnect = function(code, reason) {
	debug('%s disconnect() [code:%d | reason:%s]', this, code, reason);

	this.transport.close(code, reason);
};


Peer.prototype.onMessage = function(msg) {  // jshint ignore:line
	debug('%s onMessage()', this);
};


/**
 * Expose the Peer class.
 */

Object.freeze(Peer);
module.exports = Peer;
