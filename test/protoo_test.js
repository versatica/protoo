// process.env.DEBUG = 'test, ' + process.env.DEBUG;


var protoo = require('../');
var pkg = require('../package.json');
var http = require('http');
var WebSocket = require('ws');
var debug = require('debug')('test');


// The global Protoo app.
global.app = null;


function runProtooServer(done) {
	global.app = protoo();

	var httpServer = http.createServer();

	global.app.handleWebSocket(httpServer);

	httpServer.listen(54321, '127.0.0.1', function() {
		done();
	});

	global.app.on('ws:connecting', function(connectingInfo, acceptCb, rejectCb, waitCb) {  // jshint ignore:line
		acceptCb('testuser', 'testuuid');
	});
}


function stopProtooServer(done) {
	global.app.close(true);

	process.nextTick(function() {
		done();
	});
}


function wsConnect(username, uuid, protocol) {
	var ws = new WebSocket('ws://127.0.0.1:54321/?username=' + username + '&uuid=' + uuid, {protocol: protocol});

	return ws;
}


exports['version'] = function(test) {
	test.equal(protoo.version, pkg.version);
	test.done();
};


exports['test Protoo server'] = {
	setUp: function(done) {
		runProtooServer(done);
	},

	tearDown: function(done) {
		stopProtooServer(done);
	},

	'fail to connect if WS "protoo" sub-protocol is not given': function(test) {
		test.expect(1);

		var ws = wsConnect('testuser', 'testuuid');

		ws.on('open', function() {
			test.ok(false);
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	},

	'connect if WS "protoo" sub-protocol is given': function(test) {
		test.expect(1);

		var ws = wsConnect('testuser', 'testuuid', 'protoo');

		ws.on('open', function() {
			test.ok(true);
			ws.close();
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(false);
			test.done();
		});
	}
};
