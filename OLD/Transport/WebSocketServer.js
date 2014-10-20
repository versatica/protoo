"use strict";


// External dependencies.
var ws = require("ws");
var http = require("http");
var https = require("https");
var events = require("events");
var util = require("util");

// Internal dependencies.
var Logger = require("rekuire")("lib/Logger.js");
var Config = require("rekuire")("lib/Config.js");
var	WebSocketConnection = require("rekuire")("lib/Transport/WebSocketConnection.js");

// The exported class.
var Server;

// Internal constants.
var C = {
	WS_SUBPROTOCOL: "protoo",
	SEC_WEBSOCKET_PROTOCOL_REGEXP: new RegExp("(^| |,)protoo($| |,)")
};


Server = function() {
	Logger.debug("Transport.WebSocketServer()");

	// Needed.
	events.EventEmitter.call(this);

	var isSecure = Config.get("transport.webSocket.secure");
	var listenIP = Config.get("transport.webSocket.listenIP");
	var listenPort = Config.get("transport.webSocket.listenPort");

	// Run a HTTP server.
	if (isSecure) {
		this.httpServer = new https.createServer(Config.get("tls"));
	}
	else {
		this.httpServer = new http.createServer();
	}

	this.httpServer.listen(listenPort, listenIP, function() {
		this.onListen(listenIP, listenPort, isSecure);
	}.bind(this));

	// TODO: on("clientError") here or in wsServer.

	// Reply 501 to HTTP requests other than UPGRADE.
	this.httpServer.on("request", function(req, res) {
		res.writeHead(501, {"Content-Type": "text/plain"});
		res.end("Just WebSocket connections allowed");
	});

	// Run a WebSocket server.
	this.wsServer = new ws.Server({
		server: this.httpServer,
		handleProtocols: this.onHandleProtocols,
		verifyClient: this.onAuthorize,
		clientTracking: false  // I take care of connections.
	});

	this.wsServer.on("error", function(error) {
		// This fires when the HTTP server emits an error.
		Logger.error("Transport.WebSocketServer() | error running the WebSocket transport: %s", error);
		this.emit("error", error);
	}.bind(this));

	this.wsServer.on("connection", function(socket) {
		this.onConnection(socket);
	}.bind(this));
};


// Inherit from EventEmitter.
util.inherits(Server, events.EventEmitter);


Server.prototype.close = function() {
	Logger.debug("Transport.WebSocketServer.close()");

	if (this.wsServer) {
		this.wsServer.close();
		this.wsServer = null;
	}

	if (this.httpServer) {
		this.httpServer.close();
		this.httpServer = null;
	}
};


Server.prototype.onListen = function(ip, port, isSecure) {
	ip = ip ? ip : "0.0.0.0";

	if (isSecure) {
		Logger.debug("Transport.WebSocketServer.onListen() | secure WebSocket server listening into %s : %d", ip, port);
	}
	else {
		Logger.debug("Transport.WebSocketServer.onListen() | non-secure WebSocket server listening into %s : %d", ip, port);
	}
};


Server.prototype.onAuthorize = function(info, cb) {
	Logger.debug("Transport.WebSocketServer.onAuthorize()");

	var req = info.req;
	var protocols;

	// Validate WebSocket sub-protocol.
	protocols = req.headers["sec-websocket-protocol"];
	if (! protocols || ! protocols.match(C.SEC_WEBSOCKET_PROTOCOL_REGEXP)) {
		Logger.warn("Transport.WebSocketServer.onAuthorize() | invalid Sec-WebSocket-Protocol: '%s'", protocols || "");
		cb(false, 403, "Invalid Sec-WebSocket-Protocol");
		return;
	}

	// TODO: do more jeje.

	cb(true);
};


Server.prototype.onHandleProtocols = function(protocols, cb) {
	Logger.debug("Transport.WebSocketServer.onHandleProtocols() | %s", protocols);

	// NOTE: WebSocket protocol is validated on the onAuthorize callback.
	cb(true, C.WS_SUBPROTOCOL);
};


Server.prototype.onConnection = function(socket) {
	Logger.debug("Transport.WebSocketServer.onConnection()");

	new WebSocketConnection(socket);  // jshint ignore:line
};


Object.freeze(Server);
module.exports = Server;
