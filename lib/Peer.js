/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var debug = require('debug')('protoo:Peer');


/**
 * Peer.
 *
 * @class Peer
 * @constructor
 * @param {String} username
 * @param {String} uuid
 * @param {Object} data
 * @param {WebSocketConnection} connection
 */

var Peer = function(username, uuid, data, connection) {
	events.EventEmitter.call(this);

	// Attributes.
	this.username = username;
	this.uuid = uuid;
	this.data = data;
	this.connection = connection;

	// toString.
	this.toString = '[username:' + this.username + ' | uuid:' + this.uuid + ' | connection:' + this.connection.toString + ']';

	debug('%s new', this.toString);
};

util.inherits(Peer, events.EventEmitter);


Peer.prototype.disconnect = function(code, reason) {
	debug('%s disconnect() [code:%d | reason:%s]', this.toString, code, reason);

	this.connection.close(code, reason);
};


Peer.prototype.quietDisconnect = function(code, reason) {
	debug('%s quietDisconnect() [code:%d | reason:%s]', this.toString, code, reason);

	this.connection.detachAndClose(code, reason);
};


/**
 * Expose the Peer class.
 */

Object.freeze(Peer);
module.exports = Peer;
