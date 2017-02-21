'use strict';

// process.env.DEBUG = 'protoo*';

const tap = require('tap');
const http = require('http');
const url = require('url');
const protooServer = require('../server');
const protooClient = require('../client');

tap.test('create server and connects clients', { timeout: 500 }, (t) =>
{
	let httpServer = http.createServer();
	let wsServer = new protooServer.WebSocketServer(httpServer);
	let room = new protooServer.Room();
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
				let u = url.parse(info.request.url, true);
				let peerId = u.query['peer-id'];
				let transport = accept();
				let peer = room.createPeer(peerId, transport);

				t.pass(`protoo-server Peer created [peerId:${peer.id}]`);
			});
		})
		.then(() =>
		{
			return new Promise((resolve) =>
			{
				let transport = new protooClient.WebSocketTransport('ws://127.0.0.1:9999/?peer-id=A');

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
				let transport = new protooClient.WebSocketTransport('ws://127.0.0.1:9999/?peer-id=B');

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
			t.equal(room.peers.length, 2, 'room has 2 peers');
			t.equal(clientPeerA.data.id, serverPeerA.id, 'clientPeerA.data.id matches serverPeerA.id');
			t.equal(clientPeerB.data.id, serverPeerB.id, 'clientPeerB.data.id matches serverPeerB.id');
		})
		.then(() =>
		{
			return t.test('send request and receive expected response', { timeout: 500 }, (t2) =>
			{
				serverPeerA.once('request', (request, accept) =>
				{
					accept({ baz: 'lalala'});

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
			return t.test('spread request to all the other clients', { timeout: 500 }, (t2) =>
			{
				serverPeerA.once('request', (request, accept) =>
				{
					accept();

					t2.equal(request.method, 'message', 'request.method matches at serverPeerA');
					t2.same(request.data, { text: 'hello' }, 'request.data matches at serverPeerA');

					room.spread(request.method, request.data, [ serverPeerA ]);
				});

				clientPeerB.on('request', (request, accept) =>
				{
					accept();

					t2.pass('clientPeerB received the request');
					t2.equal(request.method, 'message', 'request.method matches at clientPeerB');
					t2.same(request.data, { text: 'hello' }, 'request.data matches at clientPeerB');

					t2.end();
				});

				t2.pass('calling clientPeerA.send()');
				clientPeerA.send('message', { text: 'hello' })
					.then(() =>
					{
						t2.pass('clientPeerA.send() succeeded');
					})
					.catch((error) =>
					{
						t2.fail(`clientPeerA.send() failed: ${error}`);
					});
			});
		});
});
