/**
 * Expose the PeerManager class.
 */
module.exports = PeerManager;


/**
 * Dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var debug = require('debug')('protoo:PeerManager');
var debugerror = require('debug')('protoo:ERROR:PeerManager');
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

	EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The Peers container. Keys are username with uuids as subkeys.
	this.users = {};

	// Peer online listener.
	this.onlineListener = null;

	// Peer offline listener.
	this.offlineListener = null;
}

util.inherits(PeerManager, EventEmitter);


PeerManager.prototype.setOnlineListener = function(onlineListener) {
	this.onlineListener = onlineListener;
};


PeerManager.prototype.setOfflineListener = function(offlineListener) {
	this.offlineListener = offlineListener;
};


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

	// Call the custom onPeerCb for this peer.
	if (onPeerCb) {
		onPeerCb(peer);
	}

	// Call the onlineListener.
	if (this.onlineListener) {
		this.onlineListener(peer);
	}
};


PeerManager.prototype.removePeer = function(peer) {
	var user = this.users[peer.username];
	if (! user) {
		// Should not happen.
		debugerror('removePeer() no peer with username "%s"', peer.username);
		return;
	}

	if (! user[peer.uuid]) {
		// Should not happen.
		debugerror('removePeer() no peer with username "%s" and uuid "%s"', peer.username, peer.uuid);
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

	// Call the offlineListener.
	if (this.offlineListener) {
		this.offlineListener(peer);
	}
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
