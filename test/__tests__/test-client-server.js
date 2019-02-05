const { toBeType } = require('jest-tobetype');
const http = require('http');
const url = require('url');
const protooServer = require('../../server');
const protooClient = require('../../client');

expect.extend({ toBeType });

let httpServer;
let room;
let clientPeer;
let serverPeer;

beforeEach(async () =>
{
	httpServer = http.createServer();

	const wsServer = new protooServer.WebSocketServer(httpServer);

	room = new protooServer.Room();

	await new Promise((resolve) =>
	{
		httpServer.listen(9999, '127.0.0.1', resolve);
	});

	wsServer.on('connectionrequest', (info, accept, reject) =>
	{
		const u = url.parse(info.request.url, true);
		const peerId = u.query.peerId;
		let transport;

		switch (peerId)
		{
			case 'reject':
			{
				reject(403, 'Sorry!');

				break;
			}
			default:
			{
				transport = accept();
				serverPeer = room.createPeer(peerId, transport);
			}
		}
	});
});

afterEach(() =>
{
	if (httpServer)
		httpServer.close();

	if (clientPeer)
		clientPeer.close();
});

test('client connects to server and reconnects', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	expect(clientPeer.closed).toBe(false);
	expect(clientPeer.connected).toBe(false);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	expect(clientPeer.connected).toBe(true);
	expect(room.hasPeer('A')).toBe(true);
	expect(room.peers).toEqual([ serverPeer ]);

	// NOTE: Private API to simulate abrupt connection closure.
	// Also, cal the public peer.close() to force 'closed: true'.
	serverPeer._transport._connection.close();
	serverPeer.close();

	await new Promise((resolve) => clientPeer.on('disconnected', resolve));

	expect(clientPeer.closed).toBe(false);
	expect(clientPeer.connected).toBe(false);
	expect(serverPeer.closed).toBe(true);
	expect(room.hasPeer('A')).toBe(false);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	clientPeer.close();

	expect(clientPeer.closed).toBe(true);
	expect(clientPeer.connected).toBe(false);

	await new Promise((resolve) => serverPeer.on('close', resolve));

	expect(serverPeer.closed).toBe(true);
	expect(room.hasPeer('A')).toBe(false);
	expect(room.peers).toEqual([]);
}, 4000);

test('server rejects connection request (1 retries)', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=reject', {	retry: { retries: 1 } });

	clientPeer = new protooClient.Peer(transport);

	let connectionAttempt = 0;

	await new Promise((resolve) =>
	{
		clientPeer.on('failed', (currentAttempt) =>
		{
			connectionAttempt = currentAttempt;

			resolve();
		});
	});

	expect(connectionAttempt).toBe(1);
	expect(clientPeer.closed).toBe(false);
	expect(clientPeer.connected).toBe(false);
	expect(room.hasPeer('reject')).toBe(false);
	expect(room.peers).toEqual([]);

	await new Promise((resolve) =>
	{
		clientPeer.on('failed', (currentAttempt) =>
		{
			connectionAttempt = currentAttempt;

			resolve();
		});
	});

	// Due the transport settings, after the second connection failuer it must
	// close the transport.
	expect(connectionAttempt).toBe(2);
	expect(clientPeer.closed).toBe(true);
	expect(clientPeer.connected).toBe(false);
}, 4000);

test('client sends request to server', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	const onServerRequest = jest.fn();

	serverPeer.once('request', (request, accept) =>
	{
		onServerRequest();

		expect(request.method).toBe('hello');
		expect(request.data).toEqual({ foo: 'bar' });

		accept({ text: 'hi!' });
	});

	const data = await clientPeer.request('hello', { foo: 'bar' });

	expect(onServerRequest).toHaveBeenCalledTimes(1);
	expect(data).toEqual({ text: 'hi!' });
}, 4000);

test('client sends request to server and server rejects it', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	serverPeer.once('request', (request, accept, reject) =>
	{
		reject(503, 'WHO KNOWS!');
	});

	try
	{
		await clientPeer.request('hello', { foo: 'bar' });
	}
	catch (error)
	{
		expect(error.code).toBe(503);
		expect(error.message).toBe('WHO KNOWS!');
	}
}, 4000);

test('client sends request to server and server throws', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	serverPeer.once('request', () =>
	{
		throw new Error('BOOM!!!');
	});

	try
	{
		await clientPeer.request('hello', { foo: 'bar' });
	}
	catch (error)
	{
		expect(error.code).toBe(500);
		expect(error.message).toMatch(/BOOM!!!/);
	}
}, 4000);

test('client sends notification to server', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	const onServerNotification = jest.fn();

	serverPeer.once('notification', (notification) =>
	{
		onServerNotification();

		expect(notification.method).toBe('hello');
		expect(notification.data).toEqual({ foo: 'bar' });
	});

	await clientPeer.notify('hello', { foo: 'bar' });

	// Wait a bit since we don't know where the notification has arrived.
	await new Promise((resolve) => setTimeout(resolve, 500));

	expect(onServerNotification).toHaveBeenCalledTimes(1);
}, 4000);

test('server sends request to client', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	const onClientRequest = jest.fn();

	clientPeer.once('request', (request, accept) =>
	{
		onClientRequest();

		expect(request.method).toBe('hello');
		expect(request.data).toEqual({ foo: 'bar' });

		accept({ text: 'hi!' });
	});

	const data = await serverPeer.request('hello', { foo: 'bar' });

	expect(onClientRequest).toHaveBeenCalledTimes(1);
	expect(data).toEqual({ text: 'hi!' });
}, 4000);

test('server sends request to client and client rejects it', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	clientPeer.once('request', (request, accept, reject) =>
	{
		reject(503, 'WHO KNOWS!');
	});

	try
	{
		await serverPeer.request('hello', { foo: 'bar' });
	}
	catch (error)
	{
		expect(error.code).toBe(503);
		expect(error.message).toBe('WHO KNOWS!');
	}
}, 4000);

test('server sends request to client and client throws', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	clientPeer.once('request', () =>
	{
		throw new Error('BOOM!!!');
	});

	try
	{
		await serverPeer.request('hello', { foo: 'bar' });
	}
	catch (error)
	{
		expect(error.code).toBe(500);
		expect(error.message).toMatch(/BOOM!!!/);
	}
}, 4000);

test('server sends notification to client', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	const onClientNotification = jest.fn();

	clientPeer.once('notification', (notification) =>
	{
		onClientNotification();

		expect(notification.method).toBe('hello');
		expect(notification.data).toEqual({ foo: 'bar' });
	});

	await serverPeer.notify('hello', { foo: 'bar' });

	// Wait a bit since we don't know where the notification has arrived.
	await new Promise((resolve) => setTimeout(resolve, 500));

	expect(onClientNotification).toHaveBeenCalledTimes(1);
}, 4000);

test('room.close() closes clientPeer and serverPeer', async () =>
{
	const transport = new protooClient.WebSocketTransport(
		'ws://127.0.0.1:9999/?peerId=A', {	retry: { retries: 0 } });

	clientPeer = new protooClient.Peer(transport);

	await new Promise((resolve) => clientPeer.on('open', resolve));

	const onServerPeerClose = jest.fn();
	const onClientPeerClose = jest.fn();

	serverPeer.on('close', onServerPeerClose);
	clientPeer.on('close', onClientPeerClose);

	room.close();

	await new Promise((resolve) => clientPeer.on('close', resolve));

	expect(onServerPeerClose).toHaveBeenCalledTimes(1);
	expect(onClientPeerClose).toHaveBeenCalledTimes(1);
}, 4000);
