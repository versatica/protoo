var expect = require('expect.js');
var eventcollector = require('eventcollector');

var createApp = require('./include/createApp');

describe('Peer connections', function()
{
	var app;

	beforeEach(function(done)
	{
		app = createApp('ws://127.0.0.1:54321', null, done);
		app.on('routingError', function(error)
		{
			throw error;
		});
	});

	afterEach(function()
	{
		app.close(true);
	});

	it('must emit "online" and "offline"', function(done)
	{
		var ec = eventcollector(3);
		var ws = app.connect('carol');

		ec.on('alldone', function()
		{
			done();
		});

		ws.onopen = function()
		{
			ws.close();
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};

		app.on('online', function(peer)
		{
			expect(peer.username).to.be('carol');
			ec.done();

			peer.on('offline', function()
			{
				ec.done();
			});
		});

		app.on('offline', function(peer)
		{
			expect(peer.username).to.be('carol');
			ec.done();
		});
	});

	it('must not emit "online"/"offline" if same peer reconnects while connected', function(done)
	{
		var ec = eventcollector(4);
		var ws1 = app.connect('alice', '1234');
		var ws2;
		var numOnline = 0;
		var numOffline = 0;
		var numPeerDisconnect = 0;
		var peer;

		app.set('disconnect grace period', 50);

		ec.on('alldone', function()
		{
			done();
		});

		ws1.onerror = function()
		{
			expect().fail('ws1 should not fail');
		};

		ws1.onopen = function()
		{
			ws2 = app.connect('alice', '1234', 'protoo');

			ws2.onerror = function()
			{
				expect().fail('ws2 should not fail');
			};

			ws2.onopen = function()
			{
				ws2.close();
			};
		};

		ws1.onclose = function()
		{
			ec.done();
		};

		app.on('online', function(_peer)
		{
			++numOnline;

			if (numOnline === 1)
			{
				ec.done();
			}
			else if (numOnline === 2)
			{
				expect().fail('app should not emit 2 "online" events');
			}

			if (!peer)
			{
				peer = _peer;

				peer.on('disconnect', function()
				{
					++numPeerDisconnect;

					if (numPeerDisconnect === 2)
					{
						expect().fail('peer should not emit "disconnect" twice');
					}
				});
				peer.on('reconnect', function()
				{
					expect().fail('peer should not emit "reconnect"');
				});
				peer.on('offline', function()
				{
					ec.done();
				});
			}
			else if (peer !== _peer)
			{
				expect().fail('should be a single peer');
			}
		});

		app.on('offline', function()
		{
			++numOffline;

			if (numOffline === 1)
			{
				ec.done();
			}
			else if (numOffline === 2)
			{
				expect().fail('app should not emit 2 "offline" events');
			}
		});
	});

	it('must not emit "online"/"offline" if same peer reconnects before grace period', function(done)
	{
		var ec = eventcollector(6);
		var ws1 = app.connect('bob', '1234');
		var ws2;
		var numOnline = 0;
		var numOffline = 0;
		var numPeerDisconnect = 0;
		var peer;

		app.set('disconnect grace period', 100);

		ec.on('alldone', function()
		{
			done();
		});

		ws1.onerror = function()
		{
			expect().fail('ws1 should not fail');
		};

		ws1.onopen = function()
		{
			ws1.close();
		};

		ws1.onclose = function()
		{
			ec.done();

			setTimeout(function()
			{
				ws2 = app.connect('bob', '1234', 'protoo');

				ws2.onerror = function()
				{
					expect().fail('ws2 should not fail');
				};

				ws2.onopen = function()
				{
					ws2.close();
					ec.done();
				};
			}, 50);
		};

		app.on('online', function(_peer)
		{
			++numOnline;

			if (numOnline === 1)
			{
				ec.done();
			}
			else if (numOnline === 2)
			{
				expect().fail('app should not emit 2 "online" events');
			}

			if (!peer)
			{
				peer = _peer;

				peer.on('disconnect', function()
				{
					++numPeerDisconnect;

					if (numPeerDisconnect === 2)
					{
						ec.done();
					}
				});
				peer.on('reconnect', function()
				{
					ec.done();
				});
				peer.on('offline', function()
				{
					ec.done();
				});
			}
			else if (peer !== _peer)
			{
				expect().fail('should be a single peer');
			}
		});

		app.on('offline', function()
		{
			++numOffline;

			if (numOffline === 1)
			{
				ec.done();
			}
			else if (numOffline === 2)
			{
				expect().fail('app should not emit 2 "offline" events');
			}
		});
	});

	it('must emit "online"/"offline" if same peer reconnects after grace period', function(done)
	{
		var ec = eventcollector(4);
		var ws1 = app.connect('alice', '1234');
		var ws2;
		var numOnline = 0;
		var numOffline = 0;
		var numPeerDisconnect = 0;
		var numPeerOffline = 0;
		var peer;

		app.set('disconnect grace period', 50);

		ec.on('alldone', function()
		{
			done();
		});

		ws1.onerror = function()
		{
			expect().fail('ws1 should not fail');
		};

		ws1.onopen = function()
		{
			ws1.close();
		};

		ws1.onclose = function()
		{
			ec.done();

			setTimeout(function()
			{
				ws2 = app.connect('alice', '1234', 'protoo');

				ws2.onerror = function()
				{
					expect().fail('ws2 should not fail');
				};

				ws2.onopen = function()
				{
					ws2.close();
					ec.done();
				};
			}, 100);
		};

		app.on('online', function(_peer)
		{
			++numOnline;

			if (numOnline === 2)
			{
				ec.done();
			}

			if (!peer)
			{
				peer = _peer;

				peer.on('disconnect', function()
				{
					++numPeerDisconnect;

					if (numPeerDisconnect === 2)
					{
						expect().fail('peer should not emit "disconnect" twice');
					}
				});
				peer.on('reconnect', function()
				{
					expect().fail('peer should not emit "reconnect"');
				});
				peer.on('offline', function()
				{
					++numPeerOffline;

					if (numPeerOffline === 2)
					{
						expect().fail('peer should not emit "offline" twice');
					}
				});
			}
			else if (peer === _peer)
			{
				expect().fail('should be two different peers');
			}
		});

		app.on('offline', function()
		{
			++numOffline;

			if (numOffline === 2)
			{
				ec.done();
			}
		});
	});

	it('message between peers', function(done)
	{
		var ws1;
		var ws2 = app.connect('bob', 'bbbb');
		var count = 0;

		app.message('/users/:username/:uuid', function(req)
		{
			var peerB = req.app.peer(req.params.username, req.params.uuid);

			expect(++count).to.be(3);
			expect(peerB).to.be.ok();

			req.on('incomingResponse', function(res, local)
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

		ws2.onerror = function()
		{
			expect().fail('ws2 should not fail');
		};

		ws2.onopen = function()
		{
			expect(++count).to.be(1);
			ws1 = app.connect('alice', 'aaaa');

			ws1.onerror = function()
			{
				expect().fail('ws1 should not fail');
			};

			ws1.onopen = function()
			{
				expect(++count).to.be(2);
				ws1.sendRequest('message', '/users/bob/bbbb');
			};
		};

		ws2.onmessage = function(event)
		{
			var req = JSON.parse(event.data);

			expect(++count).to.be(4);

			ws2.sendResponse(req, 200, 'ok');
		};
	});
});
