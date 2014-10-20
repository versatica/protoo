"use strict";


// External dependencies.
var events = require("events");
var util = require("util");

// Internal dependencies.
var Logger = require("rekuire")("lib/Logger.js");

// The exported class.
var Connection;


Connection = function(socket) {
	Logger.debug("Transport.WebSocketConnection()");

	// Needed.
	events.EventEmitter.call(this);

	// The WebSocket socket instance.
	this.socket = socket;

	this.socket.on("message", function(data, flags) {
		this.onMessage(data, flags);
	}.bind(this));

	this.socket.on("close", function(code, message) {
		this.onClose(code, message);
	}.bind(this));

	// this.socket.on("error", function(error) {
		// Logger.error("JEJE: ", error);
	// }.bind(this));
};


// Inherit from EventEmitter.
util.inherits(Connection, events.EventEmitter);


Connection.prototype.onMessage = function(data) {
	Logger.debug("Transport.WebSocketConnection.onMessage() | '%s'", data);
};


Connection.prototype.onClose = function(code, message) {
	Logger.debug("Transport.WebSocketConnection.onClose() | [code:%d | message:%s]", code, message);
};


Object.freeze(Connection);
module.exports = Connection;
