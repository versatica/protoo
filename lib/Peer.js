/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');


var Peer = function(username, uuid, data, connection) {
	events.EventEmitter.call(this);  // TODO: sure?

	// Attributes.
	this.username = username;
	this.uuid = uuid;
	this.data = data;
	this.connection = connection;
};

util.inherits(Peer, events.EventEmitter);


Peer.prototype.disconnect = function(code, reason) {
	this.connection.close(code, reason);
};


Peer.prototype.quietDisconnect = function() {
	this.connection.quietClose();
};


/**
 * Expose the Peer class.
 */

Object.freeze(Peer);
module.exports = Peer;
