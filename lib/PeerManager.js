/**
 * Expose the PeerManager class.
 */
module.exports = PeerManager;


/**
 * Dependencies.
 */
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
 */
function PeerManager(onlineListener, offlineListener) {
	debug('new');

	this.onlineListener = onlineListener;
	this.offlineListener = offlineListener;

	// The Peers container. Keys are username with uuids as subkeys.
	this.users = {};
}


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
	var user = this.users[peerInfo.username] || (this.users[peerInfo.username] = {});
	var peer;

	// If the same peer already exists disconnect the existing one and
	// replace it with the new one, but don't emit 'online' nor
	// 'offline'.
	if ((peer = user[peerInfo.uuid])) {
		debug('addPeer() peer already exists %s, assigning new transport: %s', peer, transport);

		peer.setData(peerInfo.data);
		peer.attachTransport(transport);
		return;
	}

	// Create new Peer.
	peer = new Peer(peerInfo.username, peerInfo.uuid, peerInfo.data, transport);

	// On peer disconnection remote from the collection.
	peer.on('close', removePeer.bind(this, peer));

	// Save the new peer.
	user[peerInfo.uuid] = peer;
	debug('addPeer() peer added %s', peer);

	// Call the custom onPeerCb for this peer.
	if (onPeerCb) { onPeerCb(peer); }

	// Call the onlineListener.
	this.onlineListener(peer);
};


PeerManager.prototype.close = function() {
	debug('close()');

	// Disconnect all the peers.
	for (var username in this.users) {
		var user = this.users[username];
		for (var uuid in user) {
			var peer = user[uuid];
			peer.close(C.CLOSE_CODES.SHUTTING_DOWN, 'shutting down');
		}
	}
};


/**
 * Private API.
 */


// NOTE: This method does NOT disconnect the peer but, instead, must be called
// once the peer has been disconnected.
function removePeer(peer) {
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
	this.offlineListener(peer);
}
