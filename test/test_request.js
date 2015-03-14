var expect = require('expect.js');
var createApp = require('./include/createApp');


describe('Request API', function() {

	var app;

	beforeEach(function(done) {
		app = createApp('ws://127.0.0.1:54321', null, done);
	});

	afterEach(function() {
		app.close(true);
	});

	it('request properties', function(done) {
		var ws = app.connect('test_app'),
			peer;

		app.on('routingError', function(error) {
			throw error;
		});

		app.on('online', function(_peer) {
			peer = _peer;
		});

		app.all('/users/:username/:uuid', function app_all1(req) {
			expect(req.method).to.be('message');
			expect(req.path).to.be('/users/alice/1234');
			expect(req.id).to.be(7654321);
			expect(req.data).to.eql({foo: 123});

			expect(req.peer).to.be(peer);
			expect(req.app).to.be(app);
			expect(req.params).to.eql({username:'alice', uuid:'1234'});

			req.set('foo', 1234);
			expect(req.get('foo')).to.be(1234);

			done();
		});

		ws.onopen = function() {
			ws.sendRequest('message', '/users/alice/1234', {foo: 123}, 7654321);
		};

		ws.onerror = function() {
			expect().fail('ws should not fail');
		};
	});

	it('must emit "outgoingResponse"', function(done) {
		var ws = app.connect('test_app'),
			count = 0;

		app.on('routingError', function(error) {
			throw error;
		});

		app.use(function app_use1(req, next) {
			expect(++count).to.be(1);
			req.on('outgoingResponse', function(res) {
				expect(++count).to.be(4);
				res.data.count++;
			});

			next();
		});

		app.use(function app_use2(req, next) {
			expect(++count).to.be(2);
			req.on('outgoingResponse', function(res) {
				expect(++count).to.be(5);
				res.data.count++;
			});

			next();
		});

		app.use(function app_use3(req) {
			expect(++count).to.be(3);
			req.on('outgoingResponse', function(res) {
				expect(++count).to.be(6);
				res.data.count++;
				expect(res.data.count).to.be(3);
				done();
			});

			req.reply(200, 'ok', { count: 0 });
		});

		ws.onopen = function() {
			ws.sendRequest('message', '/users/alice/1234');
		};

		ws.onerror = function() {
			expect().fail('ws should not fail');
		};
	});

	it('must not send two final responses', function(done) {
		var ws = app.connect('test_app'),
			count = 0;

		app.on('routingError', function(error) {
			throw error;
		});

		app.use(function app_use1(req, next) {
			req.on('outgoingResponse', function() {
				expect(++count).to.be.within(1,2);

				if (count === 2) {
					setImmediate(function() {
						done();
					});
				}
			});

			req.reply(100, 'trying');
			expect(req.ended).to.be(false);
			req.reply(200, 'ok');
			expect(req.ended).to.be(true);

			expect(function() {
				req.reply(200, 'ok again');
			}).to.throwError();

			// This call to next() should be ignored after a final response.
			next();
		});

		app.use(function app_use2() {
			expect().fail('shoud not arrive here after a final response');
		});

		ws.onopen = function() {
			ws.sendRequest('message', '/users/alice/1234');
		};

		ws.onerror = function() {
			expect().fail('ws should not fail');
		};
	});

});
