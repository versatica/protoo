"use strict";


// Internal dependencies.
var	WebSocketServer = require("rekuire")("lib/Transport/WebSocketServer.js");
var	WebSocketConnection = require("rekuire")("lib/Transport/WebSocketConnection.js");

// The exported module.
var Transport = {
	WebSocketServer: WebSocketServer,
	WebSocketConnection: WebSocketConnection
};


Object.freeze(Transport);
module.exports = Transport;
