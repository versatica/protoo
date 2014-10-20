/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');


/**
 * WebSocket WebSocketConnection.
 *
 * _class WebSocketConnection
 * _private
 */

var WebSocketConnection = function(app, websocket) {
	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The ws.WebSocket instance.
	this.websocket = websocket;

	// The Node net.Socket instance.
	this.socket = websocket.upgradeReq.socket;

	// Status attribute.
	this.closed = false;

	// The Peer attached to this connection.
	this.peer = null;

	this.websocket.on('close', function(code, message) {
		this.onClose(code, message);
	}.bind(this));

	this.websocket.on('error', function(error) {
		console.error('JEJE: ', error);  // TODO: debug module
	}.bind(this));

	this.websocket.on('message', function(data, flags) {
		this.onMessage(data, flags);
	}.bind(this));

	this.websocket.on('ping', function() {
		// Just reply pong.
		this.websocket.pong(null, null, true);
	}.bind(this));
};

util.inherits(WebSocketConnection, events.EventEmitter);


WebSocketConnection.prototype.attachPeer = function(peer) {
	this.peer = peer;
};


WebSocketConnection.prototype.close = function(code, reason) {
	if (this.closed) { return; }
	this.closed = true;

	try {
		this.websocket.close(code, reason);
	}
	catch(error) {}
};


WebSocketConnection.prototype.quietClose = function() {
	// Remove the 'close' event.
	this.websocket.removeAllListeners('close');
	this.close(4000, 'connected elsewhere');
};


WebSocketConnection.prototype.onMessage = function(data) {
	// TODO
	console.log('Transport.WebSocketConnection.onMessage() | %s', data);
};


WebSocketConnection.prototype.onClose = function(code, message) {
	// TODO
	console.log('Transport.WebSocketConnection.onClose() | [username:%s | uuid:%s | code:%d | message:%s]', this.peer.username, this.peer.uuid, code, message);

	this.app.peerManager.deletePeer(this.peer);
};


/**
 * Expose the WebSocketConnection class.
 */

Object.freeze(WebSocketConnection);
module.exports = WebSocketConnection;
