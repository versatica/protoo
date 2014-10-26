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

function Peer(app, username, uuid, data, transport) {
	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// Attributes.
	this.username = username;
	this.uuid = uuid;
	this.data = data || {};
	this.transport = transport;

	// Status.
	this.destroyed = false;

	// Uses for this peer.
	// this.uses = [];

	// Attach this Peer to the transport.
	transport.attachPeer(this);

	this.tostring = '[username:' + this.username + ' | uuid:' + this.uuid + ' | transport:' + this.transport + ']';
}

util.inherits(Peer, events.EventEmitter);


Peer.prototype.toString = function() { return this.tostring; };
Peer.prototype.valueOf  = function() { return this.tostring; };


// Peer.prototype.use = function(fn) {
// 	this.uses.push(use);
// };


Peer.prototype.destroy = function(code, reason) {
	debug('%s destroy() [code:%d | reason:%s]', this, code, reason);

	this.destroyed = true;
	this.transport.close(code, reason);
};


Peer.prototype.onMessage = function(msg) {  // jshint ignore:line
	if (this.destroyed) { return; }

	debug('%s onMessage()', this);


};


Peer.prototype.onClose = function(code, reason, locally_closed) {
	debug('%s onClose() [code:%d | reason:%s | locally closed:%s]', this, code, reason, locally_closed);
};


/**
 * Expose the Peer class.
 */

Object.freeze(Peer);
module.exports = Peer;
