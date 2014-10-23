var protoo = require('../../');
var http = require('http');
var https = require('https');
var url = require('url');
var path = require('path');
var fs = require('fs');
var WebSocket = require('ws');
var debug = require('debug')('test:TestServer');


var TestServer = function() {
	this.port = 54321;
	this.wss = null;
	this.app = null;
};


TestServer.prototype.run = function(wss, done) {
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

	this.app.handleWebSocket(httpServer);

	httpServer.listen(this.port, '127.0.0.1', function() {
		done();
	});

	this.app.on('error', function(error) {
		debug(error);
	});

	this.app.on('ws:connecting', function(connectingInfo, acceptCb, rejectCb, waitCb) {  // jshint ignore:line
		var u = url.parse(connectingInfo.req.url, true);
		var username = u.query.username;
		var uuid = 'abcd-1234';

		switch(username) {
			case 'sync_accept':
				acceptCb(username, uuid);
				break;

			case 'sync_reject':
				rejectCb(403, username);
				break;

			case 'async_accept':
				waitCb();
				process.nextTick(function() {
					acceptCb(username, uuid);
				});
				break;

			case 'async_reject':
				waitCb();
				process.nextTick(function() {
					rejectCb(403, username);
				});
				break;

			case 'no_cb_called':
				break;
		}
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

	process.nextTick(function() {
		done();
	});
};


module.exports = new TestServer();
