var protoo = require('../../');
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var W3CWebSocket = require('websocket').w3cwebsocket;


function TestServer() {
	EventEmitter.call(this);

	this.port = 54321;
	this.wss = null;
	this.app = null;
}

util.inherits(TestServer, EventEmitter);


TestServer.prototype.run = function(wss, connectionListener, done) {
	this.wss = wss;


	var httpServer;

	this.app = protoo();

	if (wss) {
		httpServer = https.createServer({
			cert: fs.readFileSync(path.resolve(__dirname, 'local.protoo.org.crt.pem')),
			key:  fs.readFileSync(path.resolve(__dirname, 'local.protoo.org.key.pem'))
		});
	}
	else {
		httpServer = http.createServer();
	}

	this.app.websocket(httpServer, connectionListener);

	httpServer.listen(this.port, '127.0.0.1', function() {
		done();
	});
};


TestServer.prototype.connect = function(username, uuid, protocol) {
	var schema = (this.wss ? 'wss' : 'ws');
	var protocols = [];
	var options = {};
	var url;

	uuid = uuid || Math.round(100000 * Math.random()).toString();
	url = schema + '://127.0.0.1:' + this.port + '/?username=' + username + '&uuid=' + uuid;

	if (protocol) {
		protocols.push(protocol);
	}

	if (this.wss) {
		options.rejectUnauthorized = false;
	}

	return new W3CWebSocket(url, protocols, null, null, options);
};


TestServer.prototype.stop = function() {
	this.app.close(true);
	this.app = null;
};


module.exports = new TestServer();
