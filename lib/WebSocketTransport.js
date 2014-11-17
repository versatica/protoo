/**
 * Expose the WebSocketTransport class.
 */
module.exports = WebSocketTransport;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:WebSocketTransport');
var debugerror = require('debug')('protoo:ERROR:WebSocketTransport');


/**
 * WebSocket transport.
 *
 * @class WebSocketTransport
 * @constructor
 * @param {ws.WebSocket} websocket
 */
function WebSocketTransport(websocket) {
	this.websocket = websocket;  // The ws.WebSocket instance.
	this.socket = websocket.upgradeReq.socket;  // The Node net.Socket instance.
	this.peer = undefined;  // The Peer attached to this transport.

	// Status attribute.
	this.closed = false;
	this.locally_closed = false;

	this.tostring = '[' + (websocket.upgradeReq.connection.encrypted ? 'WSS' : 'WS') + ' | address:' + this.socket.remoteAddress + ' | port:' + this.socket.remotePort + ']';

	// ws events.
	this.websocket.on('close', this.onClose.bind(this));

	this.websocket.on('error', this.onError.bind(this));

	this.websocket.on('message', this.onMessage.bind(this));

	this.websocket.on('ping', function() {
		// Just reply pong.
		this.websocket.pong(null, null, true);
	}.bind(this));

	debug('%s new', this);
}


WebSocketTransport.prototype.toString = function() { return this.tostring; };
WebSocketTransport.prototype.valueOf  = function() { return this.tostring; };


WebSocketTransport.prototype.attachPeer = function(peer) {
	this.peer = peer;
};


WebSocketTransport.prototype.detachPeer = function() {
	if (this.closed) { return; }

	this.peer = undefined;
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

	if (this.peer) {
		this.peer.onClose(code, reason, this.locally_closed);
	}
};


WebSocketTransport.prototype.onError = function(error) {
	debugerror('%s onError(): %s', this, error);
};
