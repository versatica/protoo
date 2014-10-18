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

WebSocketConnection = function(app, socket) {
	events.EventEmitter.call(this);

	// The protoo application.
	this.app = app;

	// The ws.WebSocket instance.
	this.socket = socket;

	this.socket.on('close', function(code, message) {
		this.onClose(code, message);
	}.bind(this));

	this.socket.on('error', function(error) {
		console.error('JEJE: ', error);
	}.bind(this));

	this.socket.on('message', function(data, flags) {
		this.onMessage(data, flags);
	}.bind(this));

	this.socket.on('ping', function(data, flags) {
		console.log("WebSocketConnection.on ping!");
	}.bind(this));

	this.socket.on('pong', function(data, flags) {
		console.log("WebSocketConnection.on pong!");
	}.bind(this));
};

util.inherits(WebSocketConnection, events.EventEmitter);


WebSocketConnection.prototype.close = function() {  // TODO: code/reason
	// TODO: retunn if closed y tal

	this.socket.close();
};


WebSocketConnection.prototype.onMessage = function(data) {
	console.log('Transport.WebSocketConnection.onMessage() | %s', data);
};


WebSocketConnection.prototype.onClose = function(code, message) {
	console.log('Transport.WebSocketConnection.onClose() | [code:%d | message:%s]', code, message);
};


/**
 * Expose the WebSocketConnection class.
 */

Object.freeze(WebSocketConnection);
module.exports = WebSocketConnection;
