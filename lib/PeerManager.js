/**
 * Expose the PeerManager class.
 */
module.exports = PeerManager;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:PeerManager'),
	debugerror = require('debug')('protoo:ERROR:PeerManager'),
	Peer = require('./Peer'),


/**
 * Internal constants.
 */
	C = {
		CLOSE_CODES: {
			SHUTTING_DOWN:    {code: 1001, reason: 'shutting down'},
			ONLINE_ELSEWHERE: {code: 3000, reason: 'online elsewhere'}
		}
	};


function PeerManager(app, events) {
	debug('new()');

	this.app = app;
	this.events = events;

	// The Peers container. Keys are username with uuids as subkeys.
	this.users = {};
}


PeerManager.prototype.dump = function () {
	debug('dump()');

	var username,
		user,
		uuid,
		peer;

	for (username in this.users) {
		user = this.users[username];
		for (uuid in user) {
			peer = user[uuid];
			debug('- %s', peer);
			// TODO: tmp
			debug('  [num client transactions: %d]', Object.keys(peer.clientTransactions).length);
			// TODO: tmp
			debug('  [num response senders: %d]', Object.keys(peer.responseSenders).length);
		}
	}
};


PeerManager.prototype.addPeer = function (username, uuid, data, transport) {
	var self = this,
		user = this.users[username] || (this.users[username] = {}),
		peer,
		wasConnected;

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

		wasConnected = peer.connected;

		peer.attachTransport(transport, C.CLOSE_CODES.ONLINE_ELSEWHERE.code, C.CLOSE_CODES.ONLINE_ELSEWHERE.reason);
		peer.data = data;

		// If the existing peer was not connected it was due to the disconnect grace period.
		// If so, emit 'reconnect'.
		if (!wasConnected) {
			peer.emit('reconnect');
		}

		return;
	}

	// Create new Peer.
	peer = new Peer(username, uuid, data, {
		close: function () {
			var disconnectGracePeriod = self.app.get('disconnect grace period');

			if (!disconnectGracePeriod || peer.closed) {
				removePeer.call(self, peer);
			} else {
				// Emit 'disconnect' in behalf of the peer and wait for the grace period.
				peer.emit('disconnect');

				setTimeout(function () {
					if (!peer.connected) {
						removePeer.call(self, peer);
					}
				}, disconnectGracePeriod);
			}
		},

		request: function (req) {
			self.events.request(peer, req);
		}
	});

	// Attach the transport to the peer.
	peer.attachTransport(transport);

	// Save the new peer.
	user[uuid] = peer;
	debug('addPeer() | peer added %s', peer);

	// Call the 'online' event.
	this.events.online(peer);
};


PeerManager.prototype.close = function () {
	debug('close()');

	var username,
		user,
		uuid,
		peer;

	// Disconnect all the peers.
	for (username in this.users) {
		user = this.users[username];
		for (uuid in user) {
			peer = user[uuid];
			peer.close(C.CLOSE_CODES.SHUTTING_DOWN.code, C.CLOSE_CODES.SHUTTING_DOWN.reason);
		}
	}
};


PeerManager.prototype.peers = function (username, uuid, handler) {
	var user = this.users[username],
		peer;

	// uuid is optional so handler may be the second argument.
	if (typeof uuid === 'function') {
		handler = uuid;
		uuid = undefined;
	}

	// If no user is found with the given username just return 0.
	if (!user) {
		return 0;
	// If uuid is given return 1 or 0 and run the handler.
	} else if (uuid) {
		peer = user[uuid];

		if (peer) {
			if (handler) {
				handler(peer);
			}
			return 1;
		} else {
			return 0;
		}
	// Otherwise return the number of peers and run the handler for them.
	} else {
		if (handler) {
			for (uuid in user) {
				handler(user[uuid]);
			}
		}
		return Object.keys(user).length;
	}
};


PeerManager.prototype.peer = function (username, uuid) {
	var user = this.users[username];

	// If no user is found with the given username just return 0.
	if (!user) {
		return undefined;
	}

	return user[uuid];
};


/**
 * Private API.
 */


// NOTE: This method does NOT disconnect the peer but, instead, must be called
// once the peer has been disconnected.
function removePeer(peer) {
	var user = this.users[peer.username];

	if (!user) {
		// Should not happen.
		debugerror('removePeer() | no peer with username "%s"', peer.username);
		return;
	}

	if (!user[peer.uuid]) {
		// Should not happen.
		debugerror('removePeer() | no peer with username "%s" and uuid "%s"', peer.username, peer.uuid);
		return;
	}

	if (user[peer.uuid] !== peer) {
		// This may happens if the same peer connects from elsewhere. At the time
		// its 'close' event is fired its entry in the Peers container has already
		// been replaced by a new Peer instance.
		return;
	}

	// Remove the Peer.
	delete user[peer.uuid];
	debug('removePeer() | peer removed %s', peer);

	// If no other peers are connected remove the 'user' entry.
	if (Object.keys(user).length === 0) {
		delete this.users[peer.username];
	}

	// Set the offline flag in the peer.
	peer.offline = true;
	// Call the app 'offline' event.
	this.events.offline(peer);
	// Emit 'offline' in behalf of the peer.
	peer.emit('offline');
}
