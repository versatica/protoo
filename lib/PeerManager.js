/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var debug = require('debug')('protoo:PeerManager');
var logerror = require('debug')('protoo:ERROR:PeerManager');
var Peer = require('./Peer');
var C = require('./Protoocol/Constants');


/**
 * Peers manager.
 *
 * @class PeerManager
 * @private
 * @constructor
 * @param {Application} app
 */

function PeerManager(app) {
	debug('new');

	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The Peers container. Keys are username with uuids as subkeys.
	this.users = {};
}

util.inherits(PeerManager, events.EventEmitter);


PeerManager.prototype.dump = function() {
	debug('dump()');

	for (var username in this.users) {
		var user = this.users[username];
		for (var uuid in user) {
			var peer = user[uuid];
			debug('- %s', peer);
		}
	}
};


PeerManager.prototype.addPeer = function(peerInfo, onPeerCb, transport) {
	var peer = new Peer(this.app, peerInfo.username, peerInfo.uuid, peerInfo.data, transport);
	var user = (this.users[peerInfo.username] = this.users[peerInfo.username] || {});

	// If the same peer already exists disconnect the existing one and
	// replace it with the new one, but don't emit 'peer:online' nor
	// 'peer:offline'.
	var existing_peer;
	if ((existing_peer = user[peerInfo.uuid])) {
		debug('addPeer() peer already exists %s, assigning new transport %s', existing_peer, transport);

		existing_peer.destroy(C.CLOSE_CODES.ONLINE_ELSEWHERE, 'online elsewhere');
		user[peerInfo.uuid] = peer;
		return peer;
	}

	// Save the new peer.
	user[peerInfo.uuid] = peer;
	debug('addPeer() peer added %s', peer);

	// Emit 'peer:online' event on app.
	this.app.fire('peer:online', peer);

	// Emit the custom onPeerCb for this peer if provided.
	if (onPeerCb) {
		onPeerCb(peer);
	}
};


PeerManager.prototype.removePeer = function(peer) {
	var user = this.users[peer.username];
	if (! user) {
		// Should not happen.
		logerror('removePeer() no peer with username "%s"', peer.username);
		return;
	}

	if (! user[peer.uuid]) {
		// Should not happen.
		logerror('removePeer() no peer with username "%s" and uuid "%s"', peer.username, peer.uuid);
		return;
	}

	if (user[peer.uuid] !== peer) {
		// This may happens if the same peer connects from elsewhere. At the time
		// its 'close' event is fired its entry in the Peers container has already
		// been replaced with a new Peer instance.
		return;
	}

	// Remove the Peer.
	delete user[peer.uuid];
	debug('removePeer() peer removed %s', peer);

	// If no other peers are connected remove the 'user' entry.
	if (Object.keys(user).length === 0) {
		delete this.users[peer.username];
	}

	// Emit 'peer:offline' event on app.
	this.app.fire('peer:offline', peer);
};


PeerManager.prototype.close = function() {
	debug('close()');

	// Disconnect all the peers.
	for (var username in this.users) {
		var user = this.users[username];
		for (var uuid in user) {
			var peer = user[uuid];
			peer.destroy(C.CLOSE_CODES.SHUTTING_DOWN, 'shutting down');
		}
	}
};


/**
 * Expose the PeerManager class.
 */

Object.freeze(PeerManager);
module.exports = PeerManager;
