var expect = require('expect.js');
var url = require('url');
var eventcollector = require('eventcollector');
var testServer = require('./include/TestServer');


runTests({wss: false});
runTests({wss: true});


function runTests(options) {
	var useWss = options.wss;

	describe('app.websocket() API with ' + (useWss?'WSS':'WS') + ' transport', function() {

		before(function(done) {
			testServer.run(useWss, connectionListener, done);
		});

		beforeEach(function() {
			testServer.app.removeAllListeners('online');
			testServer.app.removeAllListeners('offline');
		});

		after(function() {
			testServer.stop();
		});

		it('must fail if WebSocket sub-protocol is not "protoo', function(done) {
			var ec = eventcollector(2);
			var ws1 = testServer.connect('fail');
			var ws2 = testServer.connect('fail', null, 'foo');

			ec.on('alldone', function() { done(); });

			ws1.onopen = function() {
				done(new Error('ws1 should not connect'));
			};

			ws1.onerror = function() {
				ec.done();
			};

			ws2.onopen = function() {
				done(new Error('ws2 should not connect'));
			};

			ws2.onerror = function() {
				ec.done();
			};
		});

		it('must accept sync accept()', function(done) {
			var ec = eventcollector(2);
			var ws = testServer.connect('sync_accept', null, 'protoo');

			ec.on('alldone', function() { done(); });

			ws.onopen = function() {
				ws.close();
				ec.done();
			};

			ws.onerror = function() {
				done(new Error('ws should not fail'));
			};

			testServer.app.on('online', function(peer) {
				expect(peer.username).to.be('sync_accept');
				ec.done();
			});
		});

		it('must accept sync reject()', function(done) {
			var ws = testServer.connect('sync_reject', null, 'protoo');

			ws.onopen = function() {
				done(new Error('ws should not connect'));
			};

			ws.onerror = function() {
				done();
			};
		});

		it('must accept async accept()', function(done) {
			var ec = eventcollector(2);
			var ws = testServer.connect('async_accept', null, 'protoo');

			ec.on('alldone', function() { done(); });

			ws.onopen = function() {
				ws.close();
				ec.done();
			};

			ws.onerror = function() {
				done(new Error('ws should not fail'));
			};

			testServer.app.on('online', function(peer) {
				expect(peer.username).to.be('async_accept');
				ec.done();
			});
		});

		it('must accept async reject()', function(done) {
			var ws = testServer.connect('async_reject', null, 'protoo');

			ws.onopen = function() {
				// ws.close();  // TODO: si?
				done(new Error('ws should not connect'));
			};

			ws.onerror = function() {
				done();
			};
		});

		it('must emit "offline"', function(done) {
			var ws = testServer.connect('sync_accept', null, 'protoo');

			ws.onopen = function() {
				ws.close();
			};

			ws.onerror = function() {
				done(new Error('ws should not fail'));
			};

			testServer.app.on('offline', function(peer) {
				expect(peer.username).to.be('sync_accept');
				done();
			});
		});

		it('must not emit "online" again if same peer reconnects', function(done) {
			var ec = eventcollector(2);
			var ws1 = testServer.connect('sync_accept', '1234', 'protoo');
			var ws2 = testServer.connect('sync_accept', '1234', 'protoo');
			var numOnline = 0;

			ec.on('alldone', function() { done(); });

			ws1.onerror = function() {
				done(new Error('ws1 should not fail'));
			};

			ws2.onerror = function() {
				done(new Error('ws2 should not fail'));
			};

			ws2.onopen = function() {
				ws2.close();
			};

			ws1.onclose = function() {
				ec.done();
			};

			testServer.app.on('online', function() {
				++numOnline;

				if (numOnline === 1) {
					ec.done();
				}

				if (numOnline === 2) {
					done(new Error('app should not emit 2 "online" events'));
				}
			});
		});

	});
}


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


// var ws_tests = {
// 	setUp:    function(done) { testServer.run(false, connectionListener, done); },
// 	tearDown: function(done) { testServer.stop(done); }
// };


// var wss_tests = {
// 	setUp:    function(done) { testServer.run(true, connectionListener, done); },
// 	tearDown: function(done) { testServer.stop(done); }
// };


// for (var test in tests) {
// 	ws_tests[test]  = tests[test];
// 	wss_tests[test] = tests[test];
// }


// module.exports = {
// 	'ws access':  ws_tests,
// 	'wss access': wss_tests
// };
