/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var debug = require('debug')('protoo:PeerManager');
var Peer = require('./Peer');


/**
 * Peers manager.
 *
 * @class PeerManager
 * @constructor
 * @param {Application} app
 */

var PeerManager = function(app) {
	debug('new');

	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The Peers container. Keys are username with uuids as subkeys.
	this.users = {};
};

util.inherits(PeerManager, events.EventEmitter);


PeerManager.prototype.dump = function() {
	debug('dump() connected peers:');

	for (var username in this.users) {
		var user = this.users[username];
		for (var uuid in user) {
			var peer = user[uuid];
			debug('- ' + peer.toString);
		}
	}
};


PeerManager.prototype.addPeer = function(username, uuid, data, connection) {
	var user;
	var peer;
	var existing_peer;

	// TODO: Validate fields.

	peer = new Peer(username, uuid, data, connection);
	user = (this.users[username] = this.users[username] || {});

	// If the same peer already exists disconnect the existing one and
	// replace it with the new one, but don't emit 'peer:connected' nor
	// 'peer:disconnected'.
	if ((existing_peer = user[uuid])) {
		debug('addPeer() peer already exists (%s), replacing it with %s', existing_peer.toString, peer.toString);

		existing_peer.quietDisconnect(4000, 'connected elsewhere');
		user[uuid] = peer;

		return peer;
	}

	// Save the new peer.
	user[uuid] = peer;
	debug('addPeer() peer added: %s', peer.toString);

	// Emit 'peer:connected' event.
	process.nextTick(function() {
		debug('addPeer() emitting "peer:connected" on app');
		this.app.emit('peer:connected', peer);
	}.bind(this));

	return peer;
};


PeerManager.prototype.deletePeer = function(peer) {
	var user;

	user = this.users[peer.username];
	if (! user) {
		// Should not happen.
		debug('deletePeer() error: no peer exists with username "%s"', peer.username);
		return;
	}

	if (user[peer.uuid] !== peer) {
		// Should not happen.
		debug('deletePeer() error: peer %s does not match the existing peer, doing nothing', peer.toString);
		return;
	}

	// Remove the Peer.
	delete user[peer.uuid];
	debug('deletePeer() peer %s deleted', peer.toString);

	// If no other peers are connected remove the 'user' entry.
	if (Object.keys(user).length === 0) {
		delete this.users[peer.username];
	}

	// Emit 'peer:disconnected' event.
	debug('deletePeer() emitting "peer:disconnected" on app');
	this.app.emit('peer:disconnected', peer);
};


PeerManager.prototype.close = function(code, reason) {
	debug('close()');

	// Disconnect all the peers.
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
