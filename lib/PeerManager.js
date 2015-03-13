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


/**
 * Internal constants.
 */
var C = {
	CLOSE_CODES: {
		SHUTTING_DOWN:    {code: 1001, reason: 'shutting down'},
		ONLINE_ELSEWHERE: {code: 3000, reason: 'online elsewhere'}
	}
};


function PeerManager(app, events) {
	debug('new()');

	this.app = app;
	this.events = events;

	this.closed = false;

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


PeerManager.prototype.addPeer = function(username, uuid, data, transport) {
	if (this.closed) { return; }

	var self = this,
		user = this.users[username] || (this.users[username] = {}),
		peer;

	data = data || {};

	// Validate/normalize provided peer data.
	if (typeof username !== 'string') {
		throw new Error('protoo.PeerManager.addPeer() | username must be a string');
	}
	if (typeof uuid !== 'string') {
		throw new Error('protoo.PeerManager.addPeer() | uuid must be a string');
	}
	if (typeof data !== 'object') {
		throw new Error('protoo.PeerManager.addPeer() | data must be an object');
	}

	// If the same peer already exists disconnect the existing one and
	// replace it with the new one, but don't emit 'online' nor
	// 'offline'.
	if ((peer = user[uuid])) {
		debug('addPeer() | peer already exists: %s, assigning new transport: %s', peer, transport);

		peer._setData(data);
		peer._attachTransport(transport, C.CLOSE_CODES.ONLINE_ELSEWHERE.code, C.CLOSE_CODES.ONLINE_ELSEWHERE.reason);
		return;
	}

	// Create new Peer.
	peer = new Peer(username, uuid, data, {
		close: function() {
			var disconnectGracePeriod = self.app.get('disconnect grace period');

			if (! disconnectGracePeriod || self.closed) {
				removePeer.call(self, peer);
			}
			else {
				setTimeout(function() {
					if (! peer.connected) {
						removePeer.call(self, peer);
					}
				}, disconnectGracePeriod);
			}
		},

		request: function(req) {
			self.events.request(peer, req);
		}
	});

	// Attach the transport to the peer.
	peer._attachTransport(transport);

	// Save the new peer.
	user[uuid] = peer;
	debug('addPeer() | peer added %s', peer);

	// Call the 'online' event.
	this.events.online(peer);
};


PeerManager.prototype.close = function() {
	if (this.closed) { return; }
	debug('close()');

	this.closed = true;

	// Disconnect all the peers.
	for (var username in this.users) {
		var user = this.users[username];
		for (var uuid in user) {
			var peer = user[uuid];
			peer.close(C.CLOSE_CODES.SHUTTING_DOWN.code, C.CLOSE_CODES.SHUTTING_DOWN.reason);
		}
	}
};


PeerManager.prototype.peers = function(username, uuid, handler) {
	// uuid is optional so handler may be the second argument.
	if (typeof uuid === 'function') {
		handler = uuid;
		uuid = undefined;
	}

	var user = this.users[username],
		peer;

	// If no user is found with the given username just return 0.
	if (! user) {
		return 0;
	}

	// If uuid is given return 1 or 0 and run the handler.
	else if (uuid) {
		peer = user[uuid];

		if (peer) {
			if (handler) { handler(peer); }
			return 1;
		}
		else {
			return 0;
		}
	}

	// Otherwise return the number of peers and run the handler for them.
	else {
		if (handler) {
			for (uuid in user) {
				handler(user[uuid]);
			}
		}
		return Object.keys(user).length;
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
		debugerror('removePeer() | no peer with username "%s"', peer.username);
		return;
	}

	if (! user[peer.uuid]) {
		// Should not happen.
		debugerror('removePeer() | no peer with username "%s" and uuid "%s"', peer.username, peer.uuid);
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
	debug('removePeer() | peer removed %s', peer);

	// If no other peers are connected remove the 'user' entry.
	if (Object.keys(user).length === 0) {
		delete this.users[peer.username];
	}

	// Call the 'offline' event.
	this.events.offline(peer);
}
