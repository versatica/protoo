'use strict';

// process.env.DEBUG = 'protoo*';

const tap = require('tap');
const http = require('http');
const url = require('url');
const protooServer = require('../server');
const protooClient = require('../client');

const CLIENT_WS_OPTIONS =
{
	retry :
	{
		retries : 0
	}
};

tap.test('create server and connects clients', { timeout: 500 }, (t) =>
{
	const httpServer = http.createServer();
	const wsServer = new protooServer.WebSocketServer(httpServer);
	const room = new protooServer.Room();

	let clientPeerA;
	let clientPeerB;
	let serverPeerA;
	let serverPeerB;

	t.tearDown(() =>
	{
		httpServer.close();
		room.close();
	});

	return Promise.resolve()
		.then(() =>
		{
			return new Promise((resolve) =>
			{
				httpServer.listen(9999, '127.0.0.1', resolve);
			});
		})
		.then(() =>
		{
			wsServer.on('connectionrequest', (info, accept) =>
			{
				// The client indicates the peerId in the URL query.
				const u = url.parse(info.request.url, true);
				const peerId = u.query['peer-id'];
				const transport = accept();

				let peer;

				try
				{
					peer = room.createPeer(peerId, transport);

					t.pass(`room.createPeer() succeeded [peerId:${peer.id}]`);
				}
				catch (error)
				{
					if (peerId === 'A' && room.hasPeer('A'))
						t.pass('room.createPeer() failed for duplicated peer [peerId:A]');
					else
						t.fail(`room.createPeer() failed: ${error}`);
				}
			});
		})
		.then(() =>
		{
			return new Promise((resolve) =>
			{
				const transport = new protooClient.WebSocketTransport(
					'ws://127.0.0.1:9999/?peer-id=A', CLIENT_WS_OPTIONS);

				clientPeerA = new protooClient.Peer(transport);
				clientPeerA.data.id = 'A';
				clientPeerA.on('open', () =>
				{
					t.pass(`protoo-client Peer connected [peerId:${clientPeerA.data.id}]`);

					serverPeerA = room.peers[0];
					resolve();
				});
			});
		})
		.then(() =>
		{
			return new Promise((resolve) =>
			{
				const transport = new protooClient.WebSocketTransport(
					'ws://127.0.0.1:9999/?peer-id=B', CLIENT_WS_OPTIONS);

				clientPeerB = new protooClient.Peer(transport);
				clientPeerB.data.id = 'B';
				clientPeerB.on('open', () =>
				{
					t.pass(`protoo-client Peer connected [peerId:${clientPeerB.data.id}]`);

					serverPeerB = room.peers[1];
					resolve();
				});
			});
		})
		.then(() =>
		{
			return new Promise((resolve) =>
			{
				const transport = new protooClient.WebSocketTransport(
					'ws://127.0.0.1:9999/?peer-id=A', CLIENT_WS_OPTIONS);
				const duplicatedClientPeerA = new protooClient.Peer(transport);

				duplicatedClientPeerA.on('close', () =>
				{
					t.pass('protoo-client Peer with same could not connect [peerId:A]');

					resolve();
				});
			});
		})
		.then(() =>
		{
			t.equal(room.peers.length, 2, 'room has 2 peers');
			t.ok(room.hasPeer('A'), 'room.hasPeer("A") returns true');
			t.ok(room.hasPeer('B'), 'room.hasPeer("B") returns true');
			t.notOk(room.hasPeer('C'), 'room.hasPeer("C") returns false');
			t.equal(room.getPeer('A'), serverPeerA, 'room.getPeer("A") matches serverPeerA');
			t.equal(room.getPeer('B'), serverPeerB, 'room.getPeer("A") matches serverPeerB');
			t.equal(clientPeerA.data.id, serverPeerA.id, 'clientPeerA.data.id matches serverPeerA.id');
			t.equal(clientPeerB.data.id, serverPeerB.id, 'clientPeerB.data.id matches serverPeerB.id');
		})
		.then(() =>
		{
			return t.test('send request and receive expected response', { timeout: 500 }, (t2) =>
			{
				serverPeerA.once('request', (request, accept) =>
				{
					accept({ baz: 'lalala' });

					t2.equal(request.method, 'chicken', 'request.method matches at serverPeerA');
					t2.same(request.data, { foo: 123 }, 'request.data matches at serverPeerA');
				});

				t2.pass('calling clientPeerA.send()');
				clientPeerA.send('chicken', { foo: 123 })
					.then((data) =>
					{
						t2.pass('clientPeerA.send() succeeded');
						t2.same(data, { baz: 'lalala' }, 'response.data matches at clientPeerA');

						t2.end();
					})
					.catch((error) =>
					{
						t2.fail(`clientPeerA.send() failed: ${error}`);
					});
			});
		})
		.then(() =>
		{
			return t.test('spread notification to all the other clients', { timeout: 500 }, (t2) =>
			{
				serverPeerA.once('notification', (notification) =>
				{
					t2.equal(notification.method, 'message', 'notification.method matches at serverPeerA');
					t2.same(notification.data, { text: 'hello' }, 'notification.data matches at serverPeerA');

					room.spread(notification.method, notification.data, [ serverPeerA ]);
				});

				clientPeerB.on('notification', (notification) =>
				{
					t2.pass('clientPeerB received the notification');
					t2.equal(notification.method, 'message', 'notification.method matches at clientPeerB');
					t2.same(notification.data, { text: 'hello' }, 'notification.data matches at clientPeerB');

					t2.end();
				});

				t2.pass('calling clientPeerA.notify()');
				clientPeerA.notify('message', { text: 'hello' })
					.then(() =>
					{
						t2.pass('clientPeerA.notify() succeeded');
					})
					.catch((error) =>
					{
						t2.fail(`clientPeerA.notify() failed: ${error}`);
					});
			});
		});
});
