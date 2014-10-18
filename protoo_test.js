#!/usr/bin/env node


/**
 * Dependencies.
 */

var protoo = require('./');
var PrettyError = require('pretty-error');
var http = require('http');


// Some funny stuff.
var pe = new PrettyError();
function logError(error) {
	console.error(pe.render(error));
}


console.log('protoo version: %s', protoo.version);

var app = protoo();  // My Protoo application.
var httpServer = http.createServer();

httpServer.listen(10080, '127.0.0.1');

app.handleWebSocket(httpServer, {
	// path: '/qwe'
});



app.on('error', function(error) {
	logError(error);
});


app.on('ws:connection', function(data, acceptCb, rejectCb, waitCb) {
	var req = data.req;
	var origin = data.origin;
	var socket = req.socket;

	console.log('app.on(ws:connection) | [method:%s | url:"%s" | origin:"%s" | src:%s:%s]',
		req.method, req.url, origin, req.socket.remoteAddress, req.socket.remotePort);

	// setTimeout(function() {
		acceptCb('ibc', '110ec58a-a0f2-4ac4-8393-c866d813b8d1');
		// rejectCb(666, 'Y U NOT ALLOWED');
	// }, 5000);

	// waitCb();
	// setTimeout(function() {
		// socket.end();
	// }, 2000);
});


app.on('user:connected', function(socket, user, uuid, transport) {
	console.log('app.on(user:connected) | [user:%s | uuid:%s]', user, uuid);
});


// Run interactive Node REPL.

global.app = app;  // Make the app global.
var r = require('repl').start({
	prompt: '>>> ',
	useColors: true,
	useGlobal: true,
	ignoreUndefined: true
});
r.on('exit', function () {
	console.log();
	process.exit();
});

