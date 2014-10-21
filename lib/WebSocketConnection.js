/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var debug = require('debug')('protoo:WebSocketConnection');


/**
 * WebSocket connection.
 *
 * @class WebSocketConnection.
 * @constructor
 * @param {Application} app
 * @param {ws.WebSocket} websocket
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

	// toString.
	this.toString = '[WS | address:' + this.socket.remoteAddress + ' | port:' + this.socket.remotePort + ']';

	// this.websocket events.
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

	debug('%s new', this.toString);
};

util.inherits(WebSocketConnection, events.EventEmitter);


WebSocketConnection.prototype.attachPeer = function(peer) {
	this.peer = peer;
};


WebSocketConnection.prototype.close = function(code, reason) {
	if (this.closed) { return; }
	this.closed = true;

	debug('%s close() [code:%d | reason:%s]', this.toString, code, reason);

	try { this.websocket.close(code, reason); }
	catch(error) {}
};


WebSocketConnection.prototype.detachAndClose = function(code, reason) {
	debug('%s detachAndClose() [code:%d | reason:%s]', this.toString, code, reason);

	// Remove all the event listeners.
	this.websocket.removeAllListeners();

	try { this.websocket.close(code, reason); }
	catch(error) {}
};


WebSocketConnection.prototype.onMessage = function(data) {
	debug('%s onMessage()', this.toString);
};


WebSocketConnection.prototype.onClose = function(code, message) {
	debug('%s onClose() [code:%d | message:%s]', this.toString, code, message);

	this.app.peerManager.removePeer(this.peer);
};


WebSocketConnection.prototype.onError = function(error) {
	debug('%s onError(): %s', this.toString, error);
};


/**
 * Expose the WebSocketConnection class.
 */

Object.freeze(WebSocketConnection);
module.exports = WebSocketConnection;
