'use strict';

const expect = require('expect.js');
const url = require('url');
const eventcollector = require('eventcollector');

const createApp = require('./include/createApp');

runTests({ wss: false });
runTests({ wss: true });

function runTests(options)
{
	let app;
	let useWss = options.wss;

	describe('app.websocket() API (' + (useWss ? 'WSS' : 'WS') + ' transport)', () =>
	{
		beforeEach((done) =>
		{
			let connectUrl = (useWss ? 'wss://' : 'ws://') + '127.0.0.1:54321';

			app = createApp(connectUrl, requestListener, done);

			app.on('routingerror', (error) =>
			{
				throw error;
			});
		});

		afterEach(() =>
		{
			app.close(true);
		});

		it('must fail if WebSocket sub-protocol is not "protoo"', (done) =>
		{
			let ec = eventcollector(2);
			let ws1 = app.connect('fail', null, null);
			let ws2 = app.connect('fail', null, 'foo');

			ec.on('alldone', () =>
			{
				done();
			});

			ws1.onopen = () =>
			{
				expect().fail('ws1 should not connect');
			};

			ws1.onerror = () =>
			{
				ec.done();
			};

			ws2.onopen = () =>
			{
				expect().fail('ws2 should not connect');
			};

			ws2.onerror = () =>
			{
				ec.done();
			};
		});

		it('sync accept()', (done) =>
		{
			let ec = eventcollector(2);
			let ws = app.connect('sync_accept', null, 'protoo');

			ec.on('alldone', () =>
			{
				done();
			});

			ws.onopen = () =>
			{
				ws.close();
				ec.done();
			};

			ws.onerror = () =>
			{
				expect().fail('ws should not fail');
			};

			app.on('online', (peer) =>
			{
				expect(peer.username).to.be('sync_accept');
				ec.done();
			});
		});

		it('sync reject()', (done) =>
		{
			let ws = app.connect('sync_reject', null, 'protoo');

			ws.onopen = () =>
			{
				expect().fail('ws should not connect');
			};

			ws.onerror = () =>
			{
				done();
			};
		});

		it('async accept()', (done) =>
		{
			let ec = eventcollector(2);
			let ws = app.connect('async_accept', null, 'protoo');

			ec.on('alldone', () =>
			{
				done();
			});

			ws.onopen = () =>
			{
				ws.close();
				ec.done();
			};

			ws.onerror = () =>
			{
				expect().fail('ws should not fail');
			};

			app.on('online', (peer) =>
			{
				expect(peer.username).to.be('async_accept');
				ec.done();
			});
		});

		it('async reject()', (done) =>
		{
			let ws = app.connect('async_reject', null, 'protoo');

			ws.onopen = () =>
			{
				expect().fail('ws should not connect');
			};

			ws.onerror = () =>
			{
				done();
			};
		});

	});
}

function requestListener(info, accept, reject)
{
	let u = url.parse(info.req.url, true);
	let username = u.query.username;
	let uuid = u.query.uuid;

	switch (username)
	{
		case 'sync_accept':
		{
			accept(username, uuid, null);
			break;
		}

		case 'sync_reject':
		{
			reject(403, username);
			break;
		}

		case 'async_accept':
		{
			setImmediate(() => accept(username, uuid, null));
			break;
		}

		case 'async_reject':
		{
			setImmediate(() => reject(403, username));
			break;
		}
	}
}
