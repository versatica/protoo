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
		var ws2 = testServer.connect('fail', null, 'foo');

		ec.on('alldone', function() { test.done(); });
		ec.on('timeout', function() { test.ok(false, 'test timeout'); test.done(); });

		ws1.onopen = function() {
			test.ok(false);
			test.done();
			ec.destroy();
		};

		ws1.onerror = function() {
			test.ok(true);
			ec.done();
		};

		ws2.onopen = function() {
			test.ok(false);
			test.done();
			ec.destroy();
		};

		ws2.onerror = function() {
			test.ok(true);
			ec.done();
		};
	},

	'sync accept': function(test) {
		test.expect(2);
		var ec = eventcollector(2, 2000);
		var ws = testServer.connect('sync_accept', null, 'protoo');

		ec.on('alldone', function() { test.done(); });
		ec.on('timeout', function() { test.ok(false, 'test timeout'); test.done(); });

		ws.onopen = function() {
			test.ok(true);
			ws.close();
			ec.done();
		};

		ws.onerror = function() {
			test.ok(false);
			test.done();
			ec.destroy();
		};

		testServer.app.on('online', function(peer) {
			ec.done();
			test.strictEqual(peer.username, 'sync_accept');
		});
	},

	'sync reject': function(test) {
		test.expect(1);
		var ws = testServer.connect('sync_reject', null, 'protoo');

		ws.onopen = function() {
			test.ok(false);
			ws.close();
			test.done();
		};

		ws.onerror = function() {
			test.ok(true);
			test.done();
		};
	},

	'async accept': function(test) {
		test.expect(2);
		var ec = eventcollector(2, 2000);
		var ws = testServer.connect('async_accept', null, 'protoo');

		ec.on('alldone', function() { test.done(); });
		ec.on('timeout', function() { test.ok(false, 'test timeout'); test.done(); });

		ws.onopen = function() {
			test.ok(true);
			ws.close();
			ec.done();
		};

		ws.onerror = function() {
			test.ok(false);
			test.done();
			ec.destroy();
		};

		testServer.app.on('online', function(peer) {
			test.strictEqual(peer.username, 'async_accept');
			ec.done();
		});
	},

	'async reject': function(test) {
		test.expect(1);
		var ws = testServer.connect('async_reject', null, 'protoo');

		ws.onopen = function() {
			test.ok(false);
			ws.close();
			test.done();
		};

		ws.onerror = function() {
			test.ok(true);
			test.done();
		};
	},

	'peer disconnects': function(test) {
		test.expect(1);
		var ws = testServer.connect('sync_accept', null, 'protoo');

		ws.onopen = function() {
			ws.close();
		};

		ws.onerror = function() {
			test.ok(false);
			test.done();
		};

		testServer.app.on('offline', function(peer) {
			test.strictEqual(peer.username, 'sync_accept');
			test.done();
		});
	},

	'peer connects and disconnects': function(test) {
		test.expect(3);
		var ec = eventcollector(2, 2000);
		var ws1 = testServer.connect('sync_accept', '1234', 'protoo');
		var ws2 = testServer.connect('sync_accept', '1234', 'protoo');
		var numOnline = 0;

		ec.on('alldone', function() { test.done(); });
		ec.on('timeout', function() { test.ok(false, 'test timeout'); test.done(); });

		ws1.onopen = function() {
			test.ok(true);
		};

		ws2.onopen = function() {
			test.ok(true);
			ws2.close();
		};

		ws1.onclose = function() {
			test.ok(true);
			ec.done();
		};

		ws1.onerror = function() {
			test.ok(false);
			test.done();
			ec.destroy();
		};

		ws2.onerror = function() {
			test.ok(false);
			test.done();
			ec.destroy();
		};

		testServer.app.on('online', function() {
			++numOnline;

			if (numOnline === 1) {
				ec.done();
			}

			if (numOnline === 2) {
				test.ok(false, 'should not emit 2 "online" events');
				test.done();
				ec.destroy();
			}
		});
	}
};


function connectionListener(info, accept, reject) {
	var u = url.parse(info.req.url, true);
	var username = u.query.username;
	var uuid = u.query.uuid;

	switch(username) {
		case 'sync_accept':
			accept(username, uuid, null);
			break;

		case 'sync_reject':
			reject(403, username);
			break;

		case 'async_accept':
			setImmediate(function() {
				accept(username, uuid, null);
			});
			break;

		case 'async_reject':
			setImmediate(function() {
				reject(403, username);
			});
			break;
	}
}


var ws_tests = {
	setUp:    function(done) { testServer.run(false, connectionListener, done); },
	tearDown: function(done) { testServer.stop(done); }
};


var wss_tests = {
	setUp:    function(done) { testServer.run(true, connectionListener, done); },
	tearDown: function(done) { testServer.stop(done); }
};


for (var test in tests) {
	ws_tests[test]  = tests[test];
	wss_tests[test] = tests[test];
}


module.exports = {
	'ws access':  ws_tests,
	'wss access': wss_tests
};
