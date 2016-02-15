'use strict';

const expect = require('expect.js');

const createApp = require('./include/createApp');

describe('Router API', () =>
{
	var app;

	beforeEach((done) =>
	{
		app = createApp('ws://127.0.0.1:54321', null, done);
	});

	afterEach(() =>
	{
		app.close(true);
	});

	it('routing methods', (done) =>
	{
		var ws = app.connect('test_router');
		var count = 0;
		var router1;
		var router2;
		var router3;
		var router4;

		app.on('routingerror', (error) =>
		{
			throw error;
		});

		app.use((req, next) =>
		{
			expect(++count).to.be(1);
			expect(req.path).to.be('/users/alice');

			next();
		});

		router1 = app.Router();
		app.use(router1);

		router1.param('folder', (req, next, folder) =>
		{
			expect(folder).to.be('users');

			next();
		});

		router1.param('user', (req, next, user) =>
		{
			expect(user).to.be('alice');

			next();
		});

		router1.all('*', (req, next) =>
		{
			expect(++count).to.be(2);
			expect(req.path).to.be('/users/alice');

			next();
		});

		router1.all('/:folder/:user', (req, next) =>
		{
			expect(++count).to.be(3);
			expect(req.path).to.be('/users/alice');
			expect(req.params.folder).to.be('users');
			expect(req.params.user).to.be('alice');

			next();
		});

		router1.session('*', (req, next) =>
		{
			expect(++count).to.be(4);
			expect(req.path).to.be('/users/alice');

			next();
		});

		router1.message('*', () =>
		{
			expect().fail('should not match router1_message1');
		});

		router2 = app.Router({ strict: true });
		router1.use('/users', router2);

		router2.session('/alice', (req, next) =>
		{
			expect(++count).to.be(5);
			expect(req.path).to.be('/alice');
			expect(req.params.user).to.not.be('alice');

			next();
		});

		router2.all('/alice/', () =>
		{
			expect().fail('should not match router2_all1 due to "strict routing"');
		});

		router2.route('/Alice')
			.all((req, next) =>
			{
				expect(++count).to.be(6);
				expect(req.path).to.be('/alice');

				next('route');
			})
			.session(() =>
			{
				expect().fail('should not match router2_route_invite1 after next("route")');
			});

		router3 = app.Router();
		app.use('/USERS', router3);

		router3.all('*', (req, next) =>
		{
			expect(++count).to.be(7);
			expect(req.path).to.be('/alice');

			next();
		});

		router4 = app.Router({ caseSensitive: true });
		router3.use('/', router4);

		router4.session('/alice*', (req, next) =>
		{
			expect(++count).to.be(8);
			expect(req.path).to.be('/alice');

			next();
		});

		router4.session('/ALICE*', () =>
		{
			expect().fail('should not match router4_invite2 (case sensitive)');
		});

		router4.route('/Alice')
			.all(() =>
			{
				expect().fail('should not match router4_route_all1 (case sensitive)');
			});

		app.use('/', (req) =>
		{
			expect(++count).to.be(9);
			expect(req.path).to.be('/users/alice');

			done();
		});

		ws.onopen = () =>
		{
			ws.sendRequest('session', '/users/alice');
		};

		ws.onerror = () =>
		{
			expect().fail('ws should not fail');
		};
	});

	it('error handlers', (done) =>
	{
		var ws = app.connect('test_app');
		var count = 0;
		var router1;

		router1 = app.Router();
		app.use('/users', router1);

		router1.use('/', (req, next) => // jshint ignore:line
		{
			expect(++count).to.be(1);

			throw new Error('BUMP');
		});

		router1.use('/alice', (error, req, next) => // jshint ignore:line
		{
			expect(++count).to.be(2);
			expect(error.message).to.be('BUMP');

			// Ignore the error and pass the control to the next request handler
			next();
		});

		router1.use('/*', (req, next) =>
		{
			expect(++count).to.be(3);
			expect(req.method).to.be('session');

			next();
		});

		app.use((req, next) => // jshint ignore:line
		{
			expect(++count).to.be(4);

			done();
		});

		ws.onopen = () =>
		{
			ws.sendRequest('session', '/users/alice');
		};

		ws.onerror = () =>
		{
			expect().fail('ws should not fail');
		};
	});

	it('merge params', (done) =>
	{
		var ws = app.connect('test_router');
		var count = 0;
		var router1;
		var router2;
		var router3;

		app.on('routingerror', (error) =>
		{
			throw error;
		});

		app.session('/users/:username/:uuid', (req, next) =>
		{
			expect(++count).to.be(1);
			expect(req.params.username).to.be('alice');
			expect(req.params.uuid).to.be('1234');

			next();
		});

		router1 = app.Router();
		app.use('/users/:username/:uuid', router1);

		router1.session('*', (req, next) =>
		{
			expect(++count).to.be(2);
			expect(req.params.username).to.be(undefined);
			expect(req.params.uuid).to.be(undefined);

			next();
		});

		router2 = app.Router({ mergeParams: true });
		app.use('/users/:username/:uuid', router2);

		router2.session('*', (req, next) =>
		{
			expect(++count).to.be(3);
			expect(req.params.username).to.be('alice');
			expect(req.params.uuid).to.be('1234');

			next();
		});

		router3 = app.Router({ mergeParams: true });
		app.use('/users/:uuid/:username', router3);

		router3.use((req, next) =>
		{
			expect(++count).to.be(4);
			expect(req.params.uuid).to.be('alice');
			expect(req.params.username).to.be('1234');

			next();
		});

		app.use('/', () =>
		{
			expect(++count).to.be(5);

			done();
		});

		ws.onopen = () =>
		{
			ws.sendRequest('session', '/users/alice/1234');
		};

		ws.onerror = () =>
		{
			expect().fail('ws should not fail');
		};
	});
});
