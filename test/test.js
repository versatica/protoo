const { toBeType } = require('jest-tobetype');
const http = require('http');
const url = require('url');
const protooServer = require('../server');
const protooClient = require('../client');
const protooServerPkg = require('../server/package.json');
const protooClientPkg = require('../client/package.json');

expect.extend({ toBeType });

const CLIENT_WS_OPTIONS =
{
	retry :
	{
		retries : 0
	}
};

let httpServer;
let peerA;
let peerB;
let serverPeerA;
let serverPeerB;

beforeEach(clear);
afterEach(clear);

function clear()
{
	if (httpServer)
		httpServer.close();

	if (peerA)
		peerA.close();

	if (peerB)
		peerB.close();
}

test('protooClient.version exposes the package version', () =>
{
	expect(protooClient.version).toBeType('string');
	expect(protooClient.version).toBe(protooClientPkg.version);
}, 500);

test('protooServer.version exposes the package version', () =>
{
	expect(protooServer.version).toBeType('string');
	expect(protooServer.version).toBe(protooServerPkg.version);
}, 500);

test('full scenario with protooClient and protooServer', async () =>
{
	httpServer = http.createServer();

	const wsServer = new protooServer.WebSocketServer(httpServer);
	const room = new protooServer.Room();

	await new Promise((resolve) =>
	{
		httpServer.listen(9999, '127.0.0.1', resolve);
	});

	const onServerConnectionRequest = jest.fn();
	const onServerRequest = jest.fn();
	const onServerNotification = jest.fn();
	const onClientNotification = jest.fn();

	wsServer.on('connectionrequest', async (info, accept) =>
	{
		onServerConnectionRequest();

		// The client indicates the peerId in the URL query.
		const u = url.parse(info.request.url, true);
		const peerId = u.query.peerId;
		const transport = accept();
		const peer = await room.createPeer(peerId, transport);

		switch (peerId)
		{
			case 'A':
				serverPeerA = peer;
				break;
			case 'B':
				serverPeerB = peer;
				break;
		}

		peer.on('request', (request, accept, /* reject */) => // eslint-disable-line no-shadow
		{
			onServerRequest();

			if (request.method === 'hello')
				accept({ bar: 111 });
		});

		peer.on('notification', (notification) =>
		{
			onServerNotification();

			if (notification.method === 'bye')
			{
				expect(notification.data).toEqual({});

				peer.notify('bye');
			}
		});
	});

	// Create peerA.
	{
		const transport = new protooClient.WebSocketTransport(
			'ws://127.0.0.1:9999/?peerId=A', CLIENT_WS_OPTIONS);

		peerA = new protooClient.Peer(transport);

		await new Promise((resolve) => peerA.on('open', resolve));

		expect(onServerConnectionRequest).toHaveBeenCalledTimes(1);
		expect(room.hasPeer('A')).toBe(true);
		expect(room.peers).toEqual([ serverPeerA ]);

		const data = await peerA.request('hello', { foo: 111 });

		expect(onServerRequest).toHaveBeenCalledTimes(1);
		expect(data).toEqual({ bar: 111 });

		await peerA.notify('bye');

		await new Promise((resolve) =>
		{
			peerA.on('notification', (/* notification */) =>
			{
				onClientNotification();
				resolve();
			});
		});

		expect(onServerNotification).toHaveBeenCalledTimes(1);
		expect(onClientNotification).toHaveBeenCalledTimes(1);

		peerA.close();

		expect(peerA.closed).toBe(true);
		expect(transport.closed).toBe(true);

		await new Promise((resolve) => serverPeerA.on('close', resolve));

		expect(serverPeerA.closed).toBe(true);
		expect(room.hasPeer('A')).toBe(false);
		expect(room.peers).toEqual([]);
	}

	// Create peerB.
	{
		const transport = new protooClient.WebSocketTransport(
			'ws://127.0.0.1:9999/?peerId=B', CLIENT_WS_OPTIONS);

		peerB = new protooClient.Peer(transport);

		await new Promise((resolve) => peerB.on('open', resolve));

		expect(onServerConnectionRequest).toHaveBeenCalledTimes(2);
		expect(room.hasPeer('B')).toBe(true);
		expect(room.peers).toEqual([ serverPeerB ]);

		const data = await peerB.request('hello', { foo: 111 });

		expect(onServerRequest).toHaveBeenCalledTimes(2);
		expect(data).toEqual({ bar: 111 });

		await peerB.notify('bye');

		await new Promise((resolve) =>
		{
			peerB.on('notification', (/* notification */) =>
			{
				onClientNotification();
				resolve();
			});
		});

		expect(onServerNotification).toHaveBeenCalledTimes(2);
		expect(onClientNotification).toHaveBeenCalledTimes(2);

		serverPeerB.close();

		expect(serverPeerB.closed).toBe(true);

		await new Promise((resolve) => peerB.on('close', resolve));

		expect(peerB.closed).toBe(true);
		expect(transport.closed).toBe(true);
		expect(room.hasPeer('B')).toBe(false);
		expect(room.peers).toEqual([]);
	}
}, 4000);
