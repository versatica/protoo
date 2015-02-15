#!/usr/bin/env node


/**
 * Enable debug
 */

process.env.DEBUG = '*'


/**
 * Dependencies.
 */

var debug = require('debug')('demoClient');
var W3CWebSocket = require('websocket').w3cwebsocket;


function run(username, uuid, protocol) {
	username = username || 'demouser';
	uuid = uuid || '1234';
	protocol = protocol || 'protoo';

	var ws = new W3CWebSocket('http://127.0.0.1:10080/?username=' + username + '&uuid=' + uuid, protocol);

	ws.onopen = function() {
		debug('connected');
	};

	ws.onerror = function(error) {
		debug('connection error: %s', error.msg);
	};

	ws.onclose = function(event) {
		debug('connection closed [code:%d, reason:"%s", wasClean:"%s"]', event.code, event.reason, event.wasClean);
	};

	ws.onmessage = function(msg) {
		debug('message received: %s', msg);
	};

	return ws;
}


// Run interactive Node REPL.

global.run = run;

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


