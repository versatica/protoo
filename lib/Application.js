/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var PeerManager = require('./PeerManager');
var WebSocketServer = require('./WebSocketServer');


/**
 * Emitted events.
 *
 *
 * 'error'
 *
 * Fired upon an usage or internal error.
 *
 * @event error
 * @param {Error} error.
 *
 *
 * 'ws:connecting'
 *
 * Fired upon a WebSocket connection attempt.
 *
 * @event ws:connecting
 * @param {Object} connectingInfo
 * @param {http.IncomingRequest} connectingInfo.req  The HTTP request of the client handshake.
 * @param {String} connectingInfo.origin  The Origin header value in the client request (may be `null`).
 * @param {Function} acceptCb  Callback the user must invoke to accept the connection by providing information about the connected Protoo user.
 * @param {String} acceptCb.user  Username of the user.
 * @param {String} acceptCb.uuid  UUID of the user.
 * @param {Object} acceptCb.data  Custom data for this user.
 * @param {Function} rejectCb  Callback the user must invoke to reject the connection.
 * @param {Number} rejectCb.code  Rejection cause code.
 * @param {String} rejectCb.reason  Rejection description.
 * @param {Function} waitCb  Callback the user must invoke to announce that it will call `acceptCb` or `rejectCb` later (maybe after a DB query or whatever asynchronous operation).
 *
 *
 * 'peer:connected'
 *
 * Emitted when a peer has connected.
 *
 * @event 'peer:connected'
 * @param {Peer} peer  The connected Peer instance.
*
*
* 'peer:disconnected'
*
* Emitted when a peer has disconnected.
*
* @event 'peer:disconnected'
* @param {Peer} peer  The disconnected Peer instance.
 */


/**
 * The application the user is provided with.
 *
 * @class Application
 * @constructor
 */

var Application = function() {
	events.EventEmitter.call(this);

	// The PeerManager instance.
	this.peerManager = new PeerManager(this);

	// The servers container.
	this.servers = [];
};

util.inherits(Application, events.EventEmitter);


/**
 * Handle WebSocket connections.
 *
 * @method handleWebSocket
 * @param  {http.Server|https.Server} httpServer A Node HTTP or HTTPS server.
 * @param  {Object} [options] Options.
 * @chainable
 */

Application.prototype.handleWebSocket = function(httpServer, options) {
	var wsServer = new WebSocketServer(this, httpServer, options);

	this.servers.push(wsServer);
	return this;
};


/**
 * Close the application and disconnect peers.
 *
 * @method close
 * @param  {Boolean} [closeServers=false] Close the server(s).
 */

Application.prototype.close = function(closeServers) {
	// Disconnect all the peers.
	// TODO: code should be an enum and then translate to a code
	// for each kind of connection.
	this.peerManager.close(1001, 'shuting down');

	// Close the servers.
	this.servers.forEach(function(server) {
		server.close(closeServers);
	});
};


/**
 * Expose the Application class.
 */

Object.freeze(Application);
module.exports = Application;
