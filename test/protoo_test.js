var protoo = require('../');
var pkg = require('../package.json');
var http = require('http');
var url = require('url');
var WebSocket = require('ws');
var debug = require('debug')('test');


// The global Protoo app.
global.app = null;


// Show uncaught errors.
process.on('uncaughtException', function(error) {
	console.error(error.stack);
	process.exit(1);
});


function runProtooServer(done) {
	global.app = protoo();

	var httpServer = http.createServer();

	global.app.handleWebSocket(httpServer);

	httpServer.listen(54321, '127.0.0.1', function() {
		done();
	});

	global.app.on('error', function(error) {
		debug(error);
	});

	global.app.on('ws:connecting', function(connectingInfo, acceptCb, rejectCb, waitCb) {  // jshint ignore:line
		var u = url.parse(connectingInfo.req.url, true);
		var test = u.query.test;
		var uuid = 'abcd-1234';

		switch(test) {
			case 'sync_accept':
				acceptCb(test, uuid);
				break;

			case 'sync_reject':
				rejectCb(403, test);
				break;

			case 'async_accept':
				waitCb();
				process.nextTick(function() {
					acceptCb(test, uuid);
				});
				break;

			case 'async_reject':
				waitCb();
				process.nextTick(function() {
					rejectCb(403, test);
				});
				break;

			case 'no_cb_called':
				break;
		}
	});
}


function stopProtooServer(done) {
	global.app.close(true);

	process.nextTick(function() {
		done();
	});
}


function wsConnect(test, protocol) {
	return new WebSocket('ws://127.0.0.1:54321?test=' + test, {protocol: protocol});
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

	'peer fails to connect if WS "protoo" sub-protocol is not given': function(test) {
		test.expect(1);
		var ws = wsConnect('fail');

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

	'peer sync accept': function(test) {
		test.expect(1);
		var ws = wsConnect('sync_accept', 'protoo');

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
	},

	'peer sync reject': function(test) {
		test.expect(1);
		var ws = wsConnect('sync_reject', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	},

	'peer async accept': function(test) {
		test.expect(1);
		var ws = wsConnect('async_accept', 'protoo');

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
	},

	'peer async reject': function(test) {
		test.expect(1);
		var ws = wsConnect('async_reject', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	},

	'peer fails to connect if no callback is called on "ws:connecting"': function(test) {
		test.expect(1);
		var ws = wsConnect('no_cb_called', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	}
};
