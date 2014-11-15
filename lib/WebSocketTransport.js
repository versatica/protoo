/**
 * Expose the WebSocketTransport class.
 */
module.exports = WebSocketTransport;


/**
 * Dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var debug = require('debug')('protoo:WebSocketTransport');
var logerror = require('debug')('protoo:ERROR:WebSocketTransport');


/**
 * WebSocket transport.
 *
 * @class WebSocketTransport
 * @constructor
 * @param {Application} app
 * @param {ws.WebSocket} websocket
 */
function WebSocketTransport(app, websocket) {
	EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The ws.WebSocket instance.
	this.websocket = websocket;

	// The Node net.Socket instance.
	this.socket = websocket.upgradeReq.socket;

	// Status attribute.
	this.closed = false;
	this.locally_closed = false;

	// The Peer attached to this transport.
	this.peer = null;

	this.tostring = '[' + (websocket.upgradeReq.connection.encrypted ? 'WSS' : 'WS') + ' | address:' + this.socket.remoteAddress + ' | port:' + this.socket.remotePort + ']';

	// ws events.
	this.websocket.on('close', function(code, message) {
		this.onClose(code, message);
	}.bind(this));

	this.websocket.on('error', function(error) {
		this.onError(error);
	}.bind(this));

	this.websocket.on('message', function(data, flags) {
		this.onMessage(data, flags);
	}.bind(this));

	this.websocket.on('ping', function() {
		// Just reply pong.
		this.websocket.pong(null, null, true);
	}.bind(this));

	debug('%s new', this);
}

util.inherits(WebSocketTransport, EventEmitter);


WebSocketTransport.prototype.toString = function() { return this.tostring; };
WebSocketTransport.prototype.valueOf  = function() { return this.tostring; };


WebSocketTransport.prototype.attachPeer = function(peer) {
	this.peer = peer;
};


WebSocketTransport.prototype.close = function(code, reason) {
	if (this.closed) { return; }

	debug('%s close() [code:%d | reason:%s]', this, code, reason);

	this.closed = true;
	this.locally_closed = true;

	// Don't wait for the peer to send us a WS Close Frame. Do it now.
	this.websocket.removeAllListeners('close');
	this.onClose(code, reason);

	try { this.websocket.close(code, reason); }
	catch(error) {}
};


WebSocketTransport.prototype.onMessage = function(data) {
	if (this.closed) { return; }

	debug('%s onMessage()', this);

	// Pass it to the Peer.
	if (this.peer) {
		this.peer.onMessage(data);
	}
};


WebSocketTransport.prototype.onClose = function(code, reason) {
	debug('%s onClose() [code:%d | reason:%s | locally closed:%s]', this, code, reason, this.locally_closed);

	this.closed = true;

	// Emit 'close' if we have a peer, so the WebSocketServer will notify the
	// PeerManager to remove this peer.
	// And tell the Peer itself.
	if (this.peer) {
		this.emit('close', this.peer);
		this.peer.onClose(code, reason, this.locally_closed);
	}
};


WebSocketTransport.prototype.onError = function(error) {
	logerror('%s onError(): %s', this, error);
};
