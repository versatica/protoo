#!/usr/bin/env node


/**
 * Enable debug
 */

// process.env.DEBUG = 'demoApp, protoo:ERROR:*, protoo:*'
process.env.DEBUG = '*'


/**
 * Dependencies.
 */

var protoo = require('./');
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var debug = require('debug')('demoApp');


var app;

debug('creating a "protoo" application');
app = protoo();  // My Protoo application.

debug('creating a HTTP server on port 10080');
var httpServer = http.createServer();
httpServer.listen(10080, '127.0.0.1');

debug('creating a HTTPS server on port 10443');
var httpsServer = https.createServer({
	cert: fs.readFileSync('./test/include/local.protoo.org.crt.pem'),
	key: fs.readFileSync('./test/include/local.protoo.org.key.pem')
});
httpsServer.listen(10443, '127.0.0.1');


var onConnection = function(info, accept, reject) {
	var req = info.req;
	var origin = info.origin;
	var socket = info.socket;
	var u = url.parse(req.url, true);
	var username = u.query.username;
	var uuid = u.query.uuid;

	debug('on(ws:connecting) | [method:%s | url:%s | origin:%s | src:%s:%s]',
		req.method, req.url, origin, socket.remoteAddress, socket.remotePort);

	var peerInfo = {
		username: username,
		uuid: uuid
	};

	var onPeerCb = function(peer) {
		debug('onPeerCb for peer %s', peer);
	};

	accept(peerInfo, onPeerCb);
};

debug('handle Protoo non-secure WebSocket access on the HTTP server');
app.websocket(httpServer, onConnection);

debug('handle Protoo secure WebSocket access on the HTTPS server');
app.websocket(httpsServer, onConnection);

app.on('error', function(error) {
	debug('on(error) | %s', error);
});

app.on('online', function(peer) {
	global.peer = peer;
	debug('online() | [username:%s | uuid:%s]', peer.username, peer.uuid);
});

app.on('offline', function(peer) {
	global.peer = peer;
	debug('offline()) | [username:%s | uuid:%s]', peer.username, peer.uuid);
});


// Run interactive Node REPL.

global.app = app;  // Make the app global.
global.d = function() { app.peerManager.dump(); };

var r = require('repl').start({
	prompt: '>>> ',
	useColors: true,
	useGlobal: true,
	ignoreUndefined: false
});
r.on('exit', function () {
	console.log();
	process.exit();
});


