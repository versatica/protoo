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
			req.reply(200, 'ok');

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
