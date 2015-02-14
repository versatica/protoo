var protoo = require('../../');
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var W3CWebSocket = require('websocket').w3cwebsocket;
var domain = require('domain');
var debugerror = require('debug')('test:ERROR:TestServer');


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
	var d = domain.create();

	d.on('error', function(error) {
		debugerror('error catched by domain module: %s', error);
		this.emit('error', error);
	}.bind(this));

	d.run(function() {
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
	}.bind(this));
};


TestServer.prototype.connect = function(username, protocol) {
	var schema = (this.wss ? 'wss' : 'ws');
	var protocols = [];
	var options = {};
	var url;

	url = schema + '://127.0.0.1:' + this.port + '/?username=' + username;

	if (protocol) {
		protocols.push(protocol);
	}

	if (this.wss) {
		options.rejectUnauthorized = false;
	}

	return new W3CWebSocket(url, protocols, null, null, options);
};


TestServer.prototype.stop = function(done) {
	this.app.close(true);
	this.app = null;

	setImmediate(function() {
		done();
	});
};


module.exports = new TestServer();
