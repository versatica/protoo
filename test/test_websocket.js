var expect = require('expect.js'),
	url = require('url'),
	eventcollector = require('eventcollector'),
	createApp = require('./include/createApp');


runTests({wss: false});
runTests({wss: true});


function runTests(options) {

	var app,
		useWss = options.wss;

	describe('app.websocket() API (' + (useWss ? 'WSS' : 'WS') + ' transport)', function () {

		beforeEach(function (done) {
			var connectUrl = (useWss ? 'wss://' : 'ws://') + '127.0.0.1:54321';

			app = createApp(connectUrl, requestListener, done);
			app.on('routingError', function (error) {
				throw error;
			});
		});

		afterEach(function () {
			app.close(true);
		});

		it('must fail if WebSocket sub-protocol is not "protoo"', function (done) {
			var ec = eventcollector(2),
				ws1 = app.connect('fail', null, null),
				ws2 = app.connect('fail', null, 'foo');

			ec.on('alldone', function () {
				done();
			});

			ws1.onopen = function () {
				expect().fail('ws1 should not connect');
			};

			ws1.onerror = function () {
				ec.done();
			};

			ws2.onopen = function () {
				expect().fail('ws2 should not connect');
			};

			ws2.onerror = function () {
				ec.done();
			};
		});

		it('sync accept()', function (done) {
			var ec = eventcollector(2),
				ws = app.connect('sync_accept', null, 'protoo');

			ec.on('alldone', function () {
				done();
			});

			ws.onopen = function () {
				ws.close();
				ec.done();
			};

			ws.onerror = function () {
				expect().fail('ws should not fail');
			};

			app.on('online', function (peer) {
				expect(peer.username).to.be('sync_accept');
				ec.done();
			});
		});

		it('sync reject()', function (done) {
			var ws = app.connect('sync_reject', null, 'protoo');

			ws.onopen = function () {
				expect().fail('ws should not connect');
			};

			ws.onerror = function () {
				done();
			};
		});

		it('async accept()', function (done) {
			var ec = eventcollector(2),
				ws = app.connect('async_accept', null, 'protoo');

			ec.on('alldone', function () {
				done();
			});

			ws.onopen = function () {
				ws.close();
				ec.done();
			};

			ws.onerror = function () {
				expect().fail('ws should not fail');
			};

			app.on('online', function (peer) {
				expect(peer.username).to.be('async_accept');
				ec.done();
			});
		});

		it('async reject()', function (done) {
			var ws = app.connect('async_reject', null, 'protoo');

			ws.onopen = function () {
				expect().fail('ws should not connect');
			};

			ws.onerror = function () {
				done();
			};
		});

	});

}


function requestListener(info, accept, reject) {
	var u = url.parse(info.req.url, true),
		username = u.query.username,
		uuid = u.query.uuid;

	switch (username) {
		case 'sync_accept':
			accept(username, uuid, null);
			break;

		case 'sync_reject':
			reject(403, username);
			break;

		case 'async_accept':
			setImmediate(function () {
				accept(username, uuid, null);
			});
			break;

		case 'async_reject':
			setImmediate(function () {
				reject(403, username);
			});
			break;
	}
}
