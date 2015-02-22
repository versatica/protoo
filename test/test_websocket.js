var expect = require('expect.js');
var url = require('url');
var eventcollector = require('eventcollector');
var createApp = require('./include/createApp');


runTests({wss: false});
runTests({wss: true});


function runTests(options) {
	var useWss = options.wss;

	describe('app.websocket() API with ' + (useWss?'WSS':'WS') + ' transport', function() {

		var app;

		before(function(done) {
			var url = (useWss ? 'wss://':'ws://') + '127.0.0.1:54321';

			app = createApp(url, connectionListener, done);
		});

		beforeEach(function() {
			app.removeAllListeners('online');
			app.removeAllListeners('offline');
		});

		after(function() {
			app.close(true);
		});

		it('must fail if WebSocket sub-protocol is not "protoo"', function(done) {
			var ec = eventcollector(2);
			var ws1 = app.connect('fail');
			var ws2 = app.connect('fail', null, 'foo');

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
			var ws = app.connect('sync_accept', null, 'protoo');

			ec.on('alldone', function() { done(); });

			ws.onopen = function() {
				ws.close();
				ec.done();
			};

			ws.onerror = function() {
				done(new Error('ws should not fail'));
			};

			app.on('online', function(peer) {
				expect(peer.username).to.be('sync_accept');
				ec.done();
			});
		});

		it('must accept sync reject()', function(done) {
			var ws = app.connect('sync_reject', null, 'protoo');

			ws.onopen = function() {
				done(new Error('ws should not connect'));
			};

			ws.onerror = function() {
				done();
			};
		});

		it('must accept async accept()', function(done) {
			var ec = eventcollector(2);
			var ws = app.connect('async_accept', null, 'protoo');

			ec.on('alldone', function() { done(); });

			ws.onopen = function() {
				ws.close();
				ec.done();
			};

			ws.onerror = function() {
				done(new Error('ws should not fail'));
			};

			app.on('online', function(peer) {
				expect(peer.username).to.be('async_accept');
				ec.done();
			});
		});

		it('must accept async reject()', function(done) {
			var ws = app.connect('async_reject', null, 'protoo');

			ws.onopen = function() {
				// ws.close();  // TODO: si?
				done(new Error('ws should not connect'));
			};

			ws.onerror = function() {
				done();
			};
		});

		it('must emit "offline"', function(done) {
			var ws = app.connect('sync_accept', null, 'protoo');

			ws.onopen = function() {
				ws.close();
			};

			ws.onerror = function() {
				done(new Error('ws should not fail'));
			};

			app.on('offline', function(peer) {
				expect(peer.username).to.be('sync_accept');
				done();
			});
		});

		it('must not emit "online" again if same peer reconnects', function(done) {
			var ec = eventcollector(2);
			var ws1 = app.connect('sync_accept', '1234', 'protoo');
			var ws2 = app.connect('sync_accept', '1234', 'protoo');
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

			app.on('online', function() {
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
