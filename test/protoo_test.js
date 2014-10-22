var protoo = require('../');
var pkg = require('../package.json');
var http = require('http');
var url = require('url');
var WebSocket = require('ws');
var debug = require('debug')('test');


// The global Protoo app.
var app = null;


// Show uncaught errors.
process.on('uncaughtException', function(error) {
	console.error('uncaught exception:');
	console.error(error.stack);
	process.exit(1);
});


function runApp(done) {
	app = protoo();

	var httpServer = http.createServer();

	app.handleWebSocket(httpServer);

	httpServer.listen(54321, '127.0.0.1', function() {
		done();
	});

	app.on('error', function(error) {
		debug(error);
	});

	app.on('ws:connecting', function(connectingInfo, acceptCb, rejectCb, waitCb) {  // jshint ignore:line
		var u = url.parse(connectingInfo.req.url, true);
		var test = u.query.test;
		var uuid = 'abcd-1234';

		switch(test) {
			case 'sync_accept':
				acceptCb(test, uuid);
				break;

			case 'sync_reject':
				rejectCb(403, test);
				break;

			case 'async_accept':
				waitCb();
				process.nextTick(function() {
					acceptCb(test, uuid);
				});
				break;

			case 'async_reject':
				waitCb();
				process.nextTick(function() {
					rejectCb(403, test);
				});
				break;

			case 'no_cb_called':
				break;
		}
	});
}


function stopApp(done) {
	app.close(true);

	process.nextTick(function() {
		done();
	});
}


function wsConnect(test, protocol) {
	return new WebSocket('ws://127.0.0.1:54321?test=' + test, {protocol: protocol});
}


var Done = function(test, must_do) {
	this.test = test;
	this.must_do = must_do;
	this.dones = 0;
}

Done.prototype.done = function() {
	this.dones++;
	if (this.dones === this.must_do) {
		this.test.done();
	}
}


exports['version'] = function(test) {
	test.equal(protoo.version, pkg.version);
	test.done();
};


exports['test Protoo server'] = {
	setUp: function(done) {
		runApp(done);
	},

	tearDown: function(done) {
		stopApp(done);
	},

	'peer fails to connect if WS "protoo" sub-protocol is not given': function(test) {
		test.expect(1);
		var ws = wsConnect('fail');

		ws.on('open', function() {
			test.ok(false);
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	},

	'peer sync accept': function(test) {
		test.expect(2);
		var done = new Done(test, 2);
		var ws = wsConnect('sync_accept', 'protoo');

		ws.on('open', function() {
			test.ok(true);
			ws.close();
			done.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(false);
			this.done();
		});

		app.once('peer:online', function(peer) {
			test.strictEqual(peer.username, 'sync_accept');
			done.done();
		});
	},

	'peer sync reject': function(test) {
		test.expect(1);
		var ws = wsConnect('sync_reject', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	},

	'peer async accept': function(test) {
		test.expect(2);
		var done = new Done(test, 2);
		var ws = wsConnect('async_accept', 'protoo');

		ws.on('open', function() {
			test.ok(true);
			ws.close();
			done.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(false);
			test.done();
		});

		app.once('peer:online', function(peer) {
			test.strictEqual(peer.username, 'async_accept');
			done.done();
		});
	},

	'peer async reject': function(test) {
		test.expect(1);
		var ws = wsConnect('async_reject', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			test.done();
		});
	},

	'peer fails to connect if no callback is called on "ws:connecting"': function(test) {
		test.expect(1);
		var done = new Done(test, 2);
		var ws = wsConnect('no_cb_called', 'protoo');

		ws.on('open', function() {
			test.ok(false);
			ws.close();
			test.done();
		});

		ws.on('error', function(error) {
			debug(error.message);
			test.ok(true);
			done.done();
		});

		app.once('error', function() {
			done.done();
		});
	}
};
