'use strict';

const expect = require('expect.js');
const eventcollector = require('eventcollector');

const createApp = require('./include/createApp');

describe('Peer connections', () =>
{
	let app;

	beforeEach((done) =>
	{
		app = createApp('ws://127.0.0.1:54321', null, done);

		app.on('routingerror', (error) =>
		{
			throw error;
		});
	});

	afterEach(() =>
	{
		app.close(true);
	});

	it('must emit "online" and "offline"', (done) =>
	{
		let ec = eventcollector(3);
		let ws = app.connect('carol');

		ec.on('alldone', () =>
		{
			done();
		});

		ws.onopen = () =>
		{
			ws.close();
		};

		ws.onerror = () =>
		{
			expect().fail('ws should not fail');
		};

		app.on('online', (peer) =>
		{
			expect(peer.username).to.be('carol');
			ec.done();

			peer.on('offline', () =>
			{
				ec.done();
			});
		});

		app.on('offline', (peer) =>
		{
			expect(peer.username).to.be('carol');
			ec.done();
		});
	});

	it('must not emit "online"/"offline" if same peer reconnects while connected', (done) =>
	{
		let ec = eventcollector(4);
		let ws1 = app.connect('alice', '1234');
		let ws2;
		let numOnline = 0;
		let numOffline = 0;
		let numPeerDisconnect = 0;
		let peer;

		app.set('disconnect grace period', 50);

		ec.on('alldone', () =>
		{
			done();
		});

		ws1.onerror = () =>
		{
			expect().fail('ws1 should not fail');
		};

		ws1.onopen = () =>
		{
			ws2 = app.connect('alice', '1234', 'protoo');

			ws2.onerror = () =>
			{
				expect().fail('ws2 should not fail');
			};

			ws2.onopen = () =>
			{
				ws2.close();
			};
		};

		ws1.onclose = () =>
		{
			ec.done();
		};

		app.on('online', (_peer) =>
		{
			++numOnline;

			if (numOnline === 1)
				ec.done();
			else if (numOnline === 2)
				expect().fail('app should not emit 2 "online" events');

			if (!peer)
			{
				peer = _peer;

				peer.on('disconnect', () =>
				{
					++numPeerDisconnect;

					if (numPeerDisconnect === 2)
						expect().fail('peer should not emit "disconnect" twice');
				});
				peer.on('reconnect', () =>
				{
					expect().fail('peer should not emit "reconnect"');
				});
				peer.on('offline', () =>
				{
					ec.done();
				});
			}
			else if (peer !== _peer)
			{
				expect().fail('should be a single peer');
			}
		});

		app.on('offline', () =>
		{
			++numOffline;

			if (numOffline === 1)
				ec.done();
			else if (numOffline === 2)
				expect().fail('app should not emit 2 "offline" events');
		});
	});

	it('must not emit "online"/"offline" if same peer reconnects before grace period', (done) =>
	{
		let ec = eventcollector(6);
		let ws1 = app.connect('bob', '1234');
		let ws2;
		let numOnline = 0;
		let numOffline = 0;
		let numPeerDisconnect = 0;
		let peer;

		app.set('disconnect grace period', 100);

		ec.on('alldone', () =>
		{
			done();
		});

		ws1.onerror = () =>
		{
			expect().fail('ws1 should not fail');
		};

		ws1.onopen = () =>
		{
			ws1.close();
		};

		ws1.onclose = () =>
		{
			ec.done();

			setTimeout(() =>
			{
				ws2 = app.connect('bob', '1234', 'protoo');

				ws2.onerror = () =>
				{
					expect().fail('ws2 should not fail');
				};

				ws2.onopen = () =>
				{
					ws2.close();
					ec.done();
				};
			}, 50);
		};

		app.on('online', (_peer) =>
		{
			++numOnline;

			if (numOnline === 1)
				ec.done();
			else if (numOnline === 2)
				expect().fail('app should not emit 2 "online" events');

			if (!peer)
			{
				peer = _peer;

				peer.on('disconnect', () =>
				{
					++numPeerDisconnect;

					if (numPeerDisconnect === 2)
						ec.done();
				});
				peer.on('reconnect', () =>
				{
					ec.done();
				});
				peer.on('offline', () =>
				{
					ec.done();
				});
			}
			else if (peer !== _peer)
			{
				expect().fail('should be a single peer');
			}
		});

		app.on('offline', () =>
		{
			++numOffline;

			if (numOffline === 1)
				ec.done();
			else if (numOffline === 2)
				expect().fail('app should not emit 2 "offline" events');
		});
	});

	it('must emit "online"/"offline" if same peer reconnects after grace period', (done) =>
	{
		let ec = eventcollector(4);
		let ws1 = app.connect('alice', '1234');
		let ws2;
		let numOnline = 0;
		let numOffline = 0;
		let numPeerDisconnect = 0;
		let numPeerOffline = 0;
		let peer;

		app.set('disconnect grace period', 50);

		ec.on('alldone', () =>
		{
			done();
		});

		ws1.onerror = () =>
		{
			expect().fail('ws1 should not fail');
		};

		ws1.onopen = () =>
		{
			ws1.close();
		};

		ws1.onclose = () =>
		{
			ec.done();

			setTimeout(() =>
			{
				ws2 = app.connect('alice', '1234', 'protoo');

				ws2.onerror = () =>
				{
					expect().fail('ws2 should not fail');
				};

				ws2.onopen = () =>
				{
					ws2.close();
					ec.done();
				};
			}, 100);
		};

		app.on('online', (_peer) =>
		{
			++numOnline;

			if (numOnline === 2)
				ec.done();

			if (!peer)
			{
				peer = _peer;

				peer.on('disconnect', () =>
				{
					++numPeerDisconnect;

					if (numPeerDisconnect === 2)
						expect().fail('peer should not emit "disconnect" twice');
				});
				peer.on('reconnect', () =>
				{
					expect().fail('peer should not emit "reconnect"');
				});
				peer.on('offline', () =>
				{
					++numPeerOffline;

					if (numPeerOffline === 2)
						expect().fail('peer should not emit "offline" twice');
				});
			}
			else if (peer === _peer)
			{
				expect().fail('should be two different peers');
			}
		});

		app.on('offline', () =>
		{
			++numOffline;

			if (numOffline === 2)
				ec.done();
		});
	});

	it('message between peers', (done) =>
	{
		let ws1;
		let ws2 = app.connect('bob', 'bbbb');
		let count = 0;

		app.message('/users/:username/:uuid', (req) =>
		{
			let peerB = req.app.peer(req.params.username, req.params.uuid);

			expect(++count).to.be(3);
			expect(peerB).to.be.ok();

			req.on('incomingResponse', (res, local) =>
			{
				expect(++count).to.be(5);
				expect(res.status).to.be(200);
				expect(res.reason).to.be('ok');
				expect(res.data).to.be.empty();
				expect(local).to.not.be(true);

				done();
			});

			peerB.send(req);
		});

		ws2.onerror = () =>
		{
			expect().fail('ws2 should not fail');
		};

		ws2.onopen = () =>
		{
			expect(++count).to.be(1);
			ws1 = app.connect('alice', 'aaaa');

			ws1.onerror = () =>
			{
				expect().fail('ws1 should not fail');
			};

			ws1.onopen = () =>
			{
				expect(++count).to.be(2);
				ws1.sendRequest('message', '/users/bob/bbbb');
			};
		};

		ws2.onmessage = (event) =>
		{
			let req = JSON.parse(event.data);

			expect(++count).to.be(4);

			ws2.sendResponse(req, 200, 'ok');
		};
	});
});
