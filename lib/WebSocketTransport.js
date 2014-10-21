/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var debug = require('debug')('protoo:WebSocketTransport');


/**
 * WebSocket transport.
 *
 * @class WebSocketTransport.
 * @constructor
 * @param {Application} app
 * @param {ws.WebSocket} websocket
 */

var WebSocketTransport = function(app, websocket) {
	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The ws.WebSocket instance.
	this.websocket = websocket;

	// The Node net.Socket instance.
	this.socket = websocket.upgradeReq.socket;

	// Status attribute.
	this.closed = false;

	// The Peer attached to this transport.
	this.peer = null;

	this.tostring = '[' + (websocket.upgradeReq.connection.encrypted ? 'WSS' : 'WS') + ' | address:' + this.socket.remoteAddress + ' | port:' + this.socket.remotePort + ']';

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

	debug('%s new', this);
};

util.inherits(WebSocketTransport, events.EventEmitter);


WebSocketTransport.prototype.toString = function() { return this.tostring; };
WebSocketTransport.prototype.valueOf  = function() { return this.tostring; };


WebSocketTransport.prototype.attachPeer = function(peer) {
	this.peer = peer;
};


WebSocketTransport.prototype.close = function(code, reason) {
	if (this.closed) { return; }
	this.closed = true;

	debug('%s close() [code:%d | reason:%s]', this, code, reason);

	try { this.websocket.close(code, reason); }
	catch(error) {}
};


WebSocketTransport.prototype.detachAndClose = function(code, reason) {
	debug('%s detachAndClose() [code:%d | reason:%s]', this, code, reason);

	// Remove all the event listeners.
	this.websocket.removeAllListeners();

	try { this.websocket.close(code, reason); }
	catch(error) {}
};


WebSocketTransport.prototype.onMessage = function(data) {
	debug('%s onMessage()', this);

	// Pass it to the Peer.
	this.peer.onMessage(data);
};


WebSocketTransport.prototype.onClose = function(code, message) {
	debug('%s onClose() [code:%d | message:%s]', this, code, message);

	this.app.peerManager.removePeer(this.peer);
};


WebSocketTransport.prototype.onError = function(error) {
	debug('%s onError(): %s', this, error);
};


/**
 * Expose the WebSocketTransport class.
 */

Object.freeze(WebSocketTransport);
module.exports = WebSocketTransport;
