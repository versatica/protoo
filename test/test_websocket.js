var url = require('url');
var eventcollector = require('eventcollector');
var testServer = require('./include/TestServer');


// Show uncaught errors.
process.on('uncaughtException', function(error) {
	console.error('uncaught exception:');
	console.error(error.stack);
	process.exit(1);
});


var tests = {
	'fail if "protoo" is not set as WebSocket sub-protocol': function(test) {
		test.expect(2);
		var ec = eventcollector(2, 2000);
		var ws1 = testServer.connect('fail');
		var ws2 = testServer.connect('fail', 'foo');

		ec.on('alldone', function() { test.done(); });
		ec.on('timeout', function() { test.ok(false, 'test timeout'); test.done(); });

		ws1.on('open', function() {
			test.ok(false);
			ec.done();
		});

		ws1.on('error', function() {
			test.ok(true);
			ec.done();
		});

		ws2.on('open', function() {
			test.ok(false);
			ec.done();
		});

		ws2.on('error', function() {
			test.ok(true);
			ec.done();
		});
	},

	'sync accept': function(test) {
		test.expect(2);
		var ec = eventcollector(2, 2000);
		var ws = testServer.connect('sync_accept', 'protoo');

		ec.on('alldone', function() { test.done(); });
		ec.on('timeout', function() { test.ok(false, 'test timeout'); test.done(); });

		ws.on('open', function() {
			test.ok(true);
			ws.close();
			ec.done();
		});

		ws.on('error', function() {
			test.ok(false);
			test.done();
		});

		testServer.app.on('online', function(peer) {
			test.strictEqual(peer.username, 'sync_accept');
			ec.done();
		});
	},

	'sync reject': function(test) {
		test.expect(1);
		var ws = testServer.connect('sync_reject', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function() {
			test.ok(true);
			test.done();
		});
	},

	'async accept': function(test) {
		test.expect(2);
		var ec = eventcollector(2, 2000);
		var ws = testServer.connect('async_accept', 'protoo');

		ec.on('alldone', function() { test.done(); });
		ec.on('timeout', function() { test.ok(false, 'test timeout'); test.done(); });

		ws.on('open', function() {
			test.ok(true);
			ws.close();
			ec.done();
		});

		ws.on('error', function() {
			test.ok(false);
			test.done();
		});

		testServer.app.on('online', function(peer) {
			test.strictEqual(peer.username, 'async_accept');
			ec.done();
		});
	},

	'async reject': function(test) {
		test.expect(1);
		var ws = testServer.connect('async_reject', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function() {
			test.ok(true);
			test.done();
		});
	},

	'fail if no callback is called': function(test) {
		test.expect(1);
		var ec = eventcollector(2, 2000);
		var ws = testServer.connect('no_cb_called', 'protoo');

		ec.on('alldone', function() { test.done(); });
		ec.on('timeout', function() { test.ok(false, 'test timeout'); test.done(); });

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function() {
			test.ok(true);
			ec.done();
		});

		testServer.once('error', function() {
			ec.done();
		});
	},

	'peer disconnects': function(test) {
		test.expect(1);
		var ws = testServer.connect('sync_accept', 'protoo');

		ws.on('open', function() {
			ws.close();
		});

		ws.on('error', function() {
			test.ok(false);
			test.done();
		});

		testServer.app.on('offline', function(peer) {
			test.strictEqual(peer.username, 'sync_accept');
			test.done();
		});
	}
};


function connectionListener(info, acceptCb, rejectCb, waitCb) {
	var u = url.parse(info.req.url, true);
	var username = u.query.username;
	var uuid = 'abcd-1234';

	switch(username) {
		case 'sync_accept':
			var peerInfo = {
				username: username,
				uuid: uuid
			};
			acceptCb(peerInfo);
			break;

		case 'sync_reject':
			rejectCb(403, username);
			break;

		case 'async_accept':
			waitCb();
			setImmediate(function() {
				var peerInfo = {
					username: username,
					uuid: uuid
				};
				acceptCb(peerInfo);
			});
			break;

		case 'async_reject':
			waitCb();
			setImmediate(function() {
				rejectCb(403, username);
			});
			break;

		case 'no_cb_called':
			break;
	}
}


var ws_tests = {
	setUp: function(done)    { testServer.run(false, connectionListener, done); },
	tearDown: function(done) { testServer.stop(done); }
};


var wss_tests = {
	setUp: function(done)    { testServer.run(true, connectionListener, done); },
	tearDown: function(done) { testServer.stop(done); }
};


for (var test in tests) {
	ws_tests[test] = tests[test];
	wss_tests[test] = tests[test];
}


module.exports = {
	'ws access':  ws_tests,
	'wss access': wss_tests
};
