var protoo = require('../../');
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var WebSocket = require('ws');
var debug = require('debug')('test:TestServer');


function TestServer() {
	this.port = 54321;
	this.wss = null;
	this.app = null;
}


TestServer.prototype.run = function(wss, connectionListener, done) {
	this.wss = wss;
	this.app = protoo();

	var httpServer;

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

	this.app.on('error', function(error) {
		debug(error);
	});
};


TestServer.prototype.connect = function(username, protocol) {
	var schema = (this.wss ? 'wss' : 'ws');
	var options = {
		protocol: protocol
	};

	if (this.wss) {
		options.rejectUnauthorized = false;
	}

	return new WebSocket(schema + '://127.0.0.1:' + this.port + '?username=' + username, options);
};


TestServer.prototype.stop = function(done) {
	this.app.close(true);
	this.app = null;

	setImmediate(function() {
		done();
	});
};


module.exports = new TestServer();
