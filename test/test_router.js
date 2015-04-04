var expect = require('expect.js'),
	createApp = require('./include/createApp');


describe('Router API', function () {

	var app;

	beforeEach(function (done) {
		app = createApp('ws://127.0.0.1:54321', null, done);
	});

	afterEach(function () {
		app.close(true);
	});

	it('routing methods', function (done) {
		var ws = app.connect('test_router'),
			count = 0,
			router1,
			router2,
			router3,
			router4;

		app.on('routingError', function (error) {
			throw error;
		});

		app.use(function (req, next) {
			expect(++count).to.be(1);
			expect(req.path).to.be('/users/alice');

			next();
		});

		router1 = app.Router();
		app.use(router1);

		router1.param('folder', function (req, next, folder) {
			expect(folder).to.be('users');

			next();
		});

		router1.param('user', function (req, next, user) {
			expect(user).to.be('alice');

			next();
		});

		router1.all('*', function (req, next) {
			expect(++count).to.be(2);
			expect(req.path).to.be('/users/alice');

			next();
		});

		router1.all('/:folder/:user', function (req, next) {
			expect(++count).to.be(3);
			expect(req.path).to.be('/users/alice');
			expect(req.params.folder).to.be('users');
			expect(req.params.user).to.be('alice');

			next();
		});

		router1.session('*', function (req, next) {
			expect(++count).to.be(4);
			expect(req.path).to.be('/users/alice');

			next();
		});

		router1.message('*', function () {
			expect().fail('should not match router1_message1');
		});

		router2 = app.Router({strict: true});
		router1.use('/users', router2);

		router2.session('/alice', function (req, next) {
			expect(++count).to.be(5);
			expect(req.path).to.be('/alice');
			expect(req.params.user).to.not.be('alice');

			next();
		});

		router2.all('/alice/', function () {
			expect().fail('should not match router2_all1 due to "strict routing"');
		});

		router2.route('/Alice')
			.all(function (req, next) {
				expect(++count).to.be(6);
				expect(req.path).to.be('/alice');

				next('route');
			})
			.session(function () {
				expect().fail('should not match router2_route_invite1 after next("route")');
			});

		router3 = app.Router();
		app.use('/USERS', router3);

		router3.all('*', function (req, next) {
			expect(++count).to.be(7);
			expect(req.path).to.be('/alice');

			next();
		});

		router4 = app.Router({caseSensitive: true});
		router3.use('/', router4);

		router4.session('/alice*', function (req, next) {
			expect(++count).to.be(8);
			expect(req.path).to.be('/alice');

			next();
		});

		router4.session('/ALICE*', function () {
			expect().fail('should not match router4_invite2 (case sensitive)');
		});

		router4.route('/Alice')
			.all(function () {
				expect().fail('should not match router4_route_all1 (case sensitive)');
			});

		app.use('/', function (req) {
			expect(++count).to.be(9);
			expect(req.path).to.be('/users/alice');

			done();
		});

		ws.onopen = function () {
			ws.sendRequest('session', '/users/alice');
		};

		ws.onerror = function () {
			expect().fail('ws should not fail');
		};
	});

	it('error handlers', function (done) {
		var ws = app.connect('test_app'),
			count = 0,
			router1;

		router1 = app.Router();
		app.use('/users', router1);

		router1.use('/', function (req, next) {  // jshint ignore:line
			expect(++count).to.be(1);

			throw new Error('BUMP');
		});

		router1.use('/alice', function (error, req, next) {  // jshint ignore:line
			expect(++count).to.be(2);
			expect(error.message).to.be('BUMP');

			// Ignore the error and pass the control to the next request handler.
			next();
		});

		router1.use('/*', function (req, next) {
			expect(++count).to.be(3);
			expect(req.method).to.be('session');

			next();
		});

		app.use(function (req, next) {  // jshint ignore:line
			expect(++count).to.be(4);

			done();
		});

		ws.onopen = function () {
			ws.sendRequest('session', '/users/alice');
		};

		ws.onerror = function () {
			expect().fail('ws should not fail');
		};
	});

	it('merge params', function (done) {
		var ws = app.connect('test_router'),
			count = 0,
			router1,
			router2,
			router3;

		app.on('routingError', function (error) {
			throw error;
		});

		app.session('/users/:username/:uuid', function (req, next) {
			expect(++count).to.be(1);
			expect(req.params.username).to.be('alice');
			expect(req.params.uuid).to.be('1234');

			next();
		});

		router1 = app.Router();
		app.use('/users/:username/:uuid', router1);

		router1.session('*', function (req, next) {
			expect(++count).to.be(2);
			expect(req.params.username).to.be(undefined);
			expect(req.params.uuid).to.be(undefined);

			next();
		});

		router2 = app.Router({mergeParams: true});
		app.use('/users/:username/:uuid', router2);

		router2.session('*', function (req, next) {
			expect(++count).to.be(3);
			expect(req.params.username).to.be('alice');
			expect(req.params.uuid).to.be('1234');

			next();
		});

		router3 = app.Router({mergeParams: true});
		app.use('/users/:uuid/:username', router3);

		router3.use(function (req, next) {
			expect(++count).to.be(4);
			expect(req.params.uuid).to.be('alice');
			expect(req.params.username).to.be('1234');

			next();
		});

		app.use('/', function () {
			expect(++count).to.be(5);

			done();
		});

		ws.onopen = function () {
			ws.sendRequest('session', '/users/alice/1234');
		};

		ws.onerror = function () {
			expect().fail('ws should not fail');
		};
	});

});
