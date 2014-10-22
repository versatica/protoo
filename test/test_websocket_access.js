var protoo = require('../');
var testServer = require('./include/TestServer');
var Done = require('./include/Done');
var debug = require('debug')('test');


// Show uncaught errors.
process.on('uncaughtException', function(error) {
	console.error('uncaught exception:');
	console.error(error.stack);
	process.exit(1);
});


var tests = {
	'fail if "protoo" is not set as WebSocket sub-protocol': function(test) {
		test.expect(1);
		var ws = testServer.connect('fail');

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

	'sync accept': function(test) {
		test.expect(2);
		var done = new Done(test, 2);
		var ws = testServer.connect('sync_accept', 'protoo');

		ws.on('open', function() {
			test.ok(true);
			ws.close();
			done.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(false);
			test.done();
		});

		testServer.app.once('peer:online', function(peer) {
			test.strictEqual(peer.username, 'sync_accept');
			done.done();
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

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	},

	'async accept': function(test) {
		test.expect(2);
		var done = new Done(test, 2);
		var ws = testServer.connect('async_accept', 'protoo');

		ws.on('open', function() {
			test.ok(true);
			ws.close();
			done.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(false);
			test.done();
		});

		testServer.app.once('peer:online', function(peer) {
			test.strictEqual(peer.username, 'async_accept');
			done.done();
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

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	},

	'fail if no callback is called on "ws:connecting"': function(test) {
		test.expect(1);
		var done = new Done(test, 2);
		var ws = testServer.connect('no_cb_called', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			done.done();
		});

		testServer.app.once('error', function() {
			done.done();
		});
	}
};  // tests


var ws_tests = {
	setUp: function(done)    { testServer.run(false, done); },
	tearDown: function(done) { testServer.stop(done);       }
};


var wss_tests = {
	setUp: function(done)    { testServer.run(true, done);  },
	tearDown: function(done) { testServer.stop(done);       }
};


for (var test in tests) {
	ws_tests[test] = tests[test];
	wss_tests[test] = tests[test];
}


module.exports = {
	'ws access':  ws_tests,
	'wss access': wss_tests
};
