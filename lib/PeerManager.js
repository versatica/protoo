/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var Peer = require('./Peer');


var PeerManager = function(app) {
	events.EventEmitter.call(this);  // TODO: sure?

	// The protoo application.
	this.app = app;

	// The Peers container. Keys are username with uuids as subkeys.
	this.users = {};

	// TMP
	setInterval(function() {
		console.log('PeerManager.users:');
		for (var username in this.users) {
			var user = this.users[username];
			for (var uuid in user) {
				var peer = user[uuid];
				console.log('- [username:%s | uuid:%s | data:%s | port:%d]',
					peer.username, peer.uuid, peer.data, peer.connection.socket.remotePort
				);
			}
		}
	}.bind(this), 5000);
};

util.inherits(PeerManager, events.EventEmitter);


PeerManager.prototype.addPeer = function(username, uuid, data, connection) {
	var user;
	var peer;
	var existing_peer;

	// TODO: Validate fields.

	peer = new Peer(username, uuid, data, connection);
	user = (this.users[username] = this.users[username] || {});

	// If the same peer already exists disconnect the existing one and
	// replace it with the new one, and don't emit 'peer:connected' nor
	// 'peer:disconnected'.
	if ((existing_peer = user[uuid])) {
		console.log('PeerManager.addPeer() | peer already exists, replacing it');
		existing_peer.quietDisconnect();
		user[uuid] = peer;

		return peer;
	}

	// Save the new peer.
	user[uuid] = peer;

	// Emit 'peer:connected' event.
	process.nextTick(function() {
		this.app.emit('peer:connected', peer);
	}.bind(this));

	return peer;
};


PeerManager.prototype.deletePeer = function(peer) {
	var user;

	user = this.users[peer.username];
	if (! user) {
		// Should not happen.
		console.error('PeerManager.deletePeer() | user does not exist:');
		console.error(peer);
		return;
	}

	if (user[peer.uuid] !== peer) {
		// Should not happen.
		console.error('PeerManager.deletePeer() | user[peer.uuid] does not match given peer:');
		console.error(peer);
		return;
	}

	// Remove the Peer.
	delete user[peer.uuid];

	// If no other peers are connected remove the 'user' entry.
	if (Object.keys(user).length === 0) {
		delete this.users[peer.username];
	}

	// Emit 'peer:disconnected' event.
	this.app.emit('peer:disconnected', peer);
};


PeerManager.prototype.close = function(code, reason) {
	// Disconnect all the users.
	for (var username in this.users) {
		var user = this.users[username];
		for (var uuid in user) {
			var peer = user[uuid];
			peer.disconnect(code, reason);
		}
	}
};


/**
 * Expose the PeerManager class.
 */

Object.freeze(PeerManager);
module.exports = PeerManager;
