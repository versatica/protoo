#!/usr/bin/env node


/**
 * Dependencies.
 */

var protoo = require('./');
var PrettyError = require('pretty-error');
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');


// Some funny stuff.
var pe = new PrettyError();
function logError(error) {
	console.error(pe.render(error));
}


console.log('protoo version: %s', protoo.version);

var app = protoo();  // My Protoo application.

var httpServer = http.createServer();
httpServer.listen(10080, '127.0.0.1');

var httpsServer = https.createServer({
	cert: fs.readFileSync('./test/local.protoo.org.crt.pem'),
	key: fs.readFileSync('./test/local.protoo.org.key.pem')
});
httpsServer.listen(10443, '127.0.0.1');

app.handleWebSocket(httpServer);


app.on('error', function(error) {
	logError(error);
});


app.on('ws:connecting', function(connectingInfo, acceptCb, rejectCb, waitCb) {
	var req = connectingInfo.req;
	var origin = connectingInfo.origin;
	var socket = connectingInfo.socket;
	var u = url.parse(req.url, true);
	var username = u.query.username;
	var uuid = u.query.uuid;

	// console.log(u);

	console.log('app.on(ws:connection) | [method:%s | url:"%s" | origin:"%s" | src:%s:%s]',
		req.method, req.url, origin, socket.remoteAddress, socket.remotePort);

	// setTimeout(function() {
		acceptCb(username, uuid);
		// rejectCb(403, 'Y U NOT ALLOWED');
	// }, 5000);

	// waitCb();
	// setTimeout(function() {
		// socket.end();
	// }, 2000);
});


app.on('peer:connected', function(peer) {
	console.log('app.on(peer:connected) | [username:%s | uuid:%s]', peer.username, peer.uuid);
});


app.on('peer:disconnected', function(peer) {
	console.log('app.on(peer:disconnected) | [username:%s | uuid:%s]', peer.username, peer.uuid);
});





// Run interactive Node REPL.

global.app = app;  // Make the app global.
var r = require('repl').start({
	prompt: '>>>\n',
	useColors: true,
	useGlobal: true,
	ignoreUndefined: true
});
r.on('exit', function () {
	console.log();
	process.exit();
});

