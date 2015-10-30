var expect = require('expect.js');
var eventcollector = require('eventcollector');

var protoo = require('../');
var createApp = require('./include/createApp');

describe('Application API', function()
{
	var app;

	beforeEach(function(done)
	{
		app = createApp('ws://127.0.0.1:54321', null, done);
	});

	afterEach(function()
	{
		app.close(true);
	});

	it('settings', function()
	{
		app.set('foo1', 'FOO1');
		app.set('foo2', 'FOO2');
		app.enable('foo3');
		app.disable('foo4');

		expect(app.get('foo1')).to.be('FOO1');
		expect(app.get('foo2')).to.be('FOO2');
		expect(app.get('foo3')).to.be.ok();
		expect(app.get('foo4')).to.not.be.ok();
		expect(app.enabled('foo3')).to.be.ok();
		expect(app.enabled('foo4')).to.not.be.ok();

		app.disable('foo3');
		expect(app.enabled('foo3')).to.not.be.ok();
	});

	it('routing methods', function(done)
	{
		var ws = app.connect('test_app');
		var count = 0;

		app.on('routingError', function(error)
		{
			throw error;
		});

		app.enable('strict routing');

		app.param('folder', function(req, next, folder)
		{
			expect(folder).to.be('users');

			next();
		});

		app.param('user', function(req, next, user)
		{
			expect(user).to.be('alice');

			next();
		});

		app.use(function(req, next)
		{
			expect(++count).to.be(1);
			expect(req.path).to.be('/users/alice');

			next();
		});

		app.use('/NO', function()
		{
			expect().fail('should not match app_use2');
		});

		app.use('/', function(req, next)
		{
			expect(++count).to.be(2);
			expect(req.path).to.be('/users/alice');

			next();
		});

		app.use('/users/', function(req, next)
		{
			expect(++count).to.be(3);

			next();
		});

		app.session('/:folder/:user', function(req, next)
		{
			expect(++count).to.be(4);
			expect(req.params.folder).to.be('users');
			expect(req.params.user).to.be('alice');
			expect(req.path).to.be('/users/alice');

			next();
		});

		app.session('/:folder/:user/', function()
		{
			expect().fail('should not match app_invite2 due to "strict routing"');
		});

		app.all('/USERS/:user', function(req, next)
		{
			expect(++count).to.be(5);
			expect(req.params.user).to.be('alice');
			expect(req.path).to.be('/users/alice');

			next();
		});

		app.route('/users/:user')
			.session(function(req, next)
			{
				expect(++count).to.be(6);
				expect(req.params.user).to.be('alice');
				expect(req.path).to.be('/users/alice');

				next();
			});

		app.use('/', function(req)
		{
			expect(++count).to.be(7);
			expect(req.path).to.be('/users/alice');

			done();
		});

		ws.onopen = function()
		{
			ws.sendRequest('session', '/users/alice');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};
	});

	it('get method', function(done)
	{
		var ws = app.connect('test_app');

		app.set('setting1', 'FOO');
		expect(app.get('setting1')).to.be('FOO');

		app.on('routingError', function(error)
		{
			throw error;
		});

		app.get('/photo/:id', function(req)
		{
			expect(req.params.id).to.be('test.png');
			expect(req.path).to.be('/photo/test.png');

			done();
		});

		ws.onopen = function()
		{
			ws.sendRequest('get', '/photo/test.png');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};
	});

	it('params (1)', function(done)
	{
		var ws = app.connect('test_app');
		var count = 0;

		app.on('routingError', function(error)
		{
			throw error;
		});

		// Validation rule for number: should be one or more digits.
		app.message('/number/:number([0-9]+)', function(req, next)
		{
			expect(++count).to.be(1);
			expect(req.params.number).to.be('1234');

			next();
		});

		app.use('/', function(req)
		{
			expect(++count).to.be(2);
			// Params should not remain cross-router.
			expect(req.params.number).to.not.be('1234');

			done();
		});

		ws.onopen = function()
		{
			ws.sendRequest('message', '/number/1234');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};
	});

	it('params (2)', function(done)
	{
		var ws = app.connect('test_app');
		var count = 0;

		app.on('routingError', function(error)
		{
			throw error;
		});

		app.param('range', function(req, next, range)
		{
			expect(++count).to.be(1);
			expect(range).to.be('abcd..1234');

			setImmediate(function()
			{
				next();
			});
		});

		app.param('range', function(req, next, range)
		{
			expect(++count).to.be(2);
			expect(range).to.be('abcd..1234');

			next();
		});

		app.message('/range/:range(\\w+\.\.\\w+)', function(req, next)
		{
			// All the app.param() should be executed before the route.
			expect(++count).to.be(4);
			expect(req.params.range).to.be('abcd..1234');

			next();
		});

		app.param('range', function(req, next, range)
		{
			expect(++count).to.be(3);
			expect(range).to.be('abcd..1234');

			next();
		});

		app.use('/', function()
		{
			expect(++count).to.be(5);

			done();
		});

		ws.onopen = function()
		{
			ws.sendRequest('message', '/range/abcd..1234');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};
	});

	it('error handlers', function(done)
	{
		var ws = app.connect('test_app');
		var count = 0;

		app.on('routingError', function(error)
		{
			throw error;
		});

		app.use(function()
		{
			// Throw an error.
			throw new Error('BUMP');
		});

		app.use(function(error, req, next)
		{  // jshint ignore:line
			expect(++count).to.be(1);
			expect(error.message).to.be('BUMP');

			// Pass the error to the next error handler.
			next(error);
		});

		app.use(function(error, req, next)
		{  // jshint ignore:line
			expect(++count).to.be(2);
			expect(error.message).to.be('BUMP');

			// Ignore the error and pass the control to the next request handler.
			next();
		});

		app.use(function(req, next)  // jshint ignore:line
		{
			expect(++count).to.be(3);
			expect(req.method).to.be('session');

			done();
		});

		ws.onopen = function()
		{
			ws.sendRequest('session', '/users/alice');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};
	});

	it('final handler with error (1)', function(done)
	{
		var ws = app.connect('test_app');

		app.once('routingError', function(error)
		{
			expect(error.message).to.be('BUMP');

			done();
		});

		app.all('/users/:user', function()
		{
			throw new Error('BUMP');
		});

		app.all('/users/:user', function()
		{
			expect().fail('should not match app_all2');
		});

		ws.onopen = function()
		{
			ws.sendRequest('session', '/users/alice');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};
	});

	it('final handler with error (2)', function(done)
	{
		var ws = app.connect('test_app');

		app.once('routingError', function(error)
		{
			expect(error.message).to.be('BUMP');

			done();
		});

		app.all('/users/:user', function(req, next)
		{
			next(new Error('BUMP'));
		});

		app.all('/users/:user', function()
		{
			expect().fail('should not match app_all2');
		});

		ws.onopen = function()
		{
			ws.sendRequest('session', '/users/alice');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};
	});

	it('get peers by username', function(done)
	{
		var ec1 = eventcollector(3);
		var ec2 = eventcollector(3);
		var numPeers;
		var ws1a = false;
		var ws1b = false;
		var ws2a = false;

		app.on('online', function()
		{
			ec1.done();
		});

		ec1.on('alldone', function()
		{
			numPeers = app.peers('ws0');
			expect(numPeers).to.be(0);

			numPeers = app.peers('ws0', '1234');
			expect(numPeers).to.be(0);
			expect(app.peer('ws0', '1234')).to.be(undefined);

			numPeers = app.peers('ws1', 'NOT');
			expect(numPeers).to.be(0);
			expect(app.peer('ws1', 'NOT')).to.be(undefined);

			numPeers = app.peers('ws1', null, function(peer)
			{
				expect(peer.username).to.be('ws1');

				switch (peer.uuid)
				{
					case '___1a___':
						if (ws1a)
						{
							expect().fail('ws1a already found');
						}
						ws1a = true;
						ec2.done();
						break;
					case '___1b___':
						if (ws1b)
						{
							expect().fail('ws1b already found');
						}
						ws1b = true;
						ec2.done();
						break;
					default:
						expect().fail('unkown peer "ws1" with uuid "' + peer.uuid + '"');
				}
			});
			expect(numPeers).to.be(2);
			expect(app.peer('ws1', '___1a___')).to.be.ok();
			expect(app.peer('ws1', '___1b___')).to.be.ok();

			numPeers = app.peers('ws2', function(peer)
			{
				expect(peer.username).to.be('ws2');

				switch (peer.uuid)
				{
					case '___2a___':
						if (ws2a)
						{
							expect().fail('ws2a already found');
						}
						ws2a = true;
						ec2.done();
						break;
					default:
						expect().fail('unkown peer "ws2" with uuid "' + peer.uuid + '"');
				}
			});
			expect(numPeers).to.be(1);
			expect(app.peer('ws2', '___2a___')).to.be.ok();
		});

		ec2.on('alldone', function()
		{
			done();
		});

		app.connect('ws1', '___1a___');
		app.connect('ws1', '___1b___');
		app.connect('ws2', '___2a___');
	});

	it('get all the peers', function(done)
	{
		var ec1 = eventcollector(3);
		var ec2 = eventcollector(3);
		var numPeers;
		var ws1a = false;
		var ws1b = false;
		var ws2a = false;

		app.on('online', function()
		{
			ec1.done();
		});

		ec1.on('alldone', function()
		{
			numPeers = app.peers(function(peer)
			{
				switch (peer.username)
				{
					case 'ws1':
						switch (peer.uuid)
						{
							case '___1a___':
								if (ws1a)
								{
									expect().fail('ws1a already found');
								}
								ws1a = true;
								ec2.done();
								break;
							case '___1b___':
								if (ws1b)
								{
									expect().fail('ws1b already found');
								}
								ws1b = true;
								ec2.done();
								break;
							default:
								expect().fail('unkown peer "ws1" with uuid "' + peer.uuid + '"');
						}
						break;

					case 'ws2':
						switch (peer.uuid)
						{
							case '___2a___':
								if (ws2a)
								{
									expect().fail('ws2a already found');
								}
								ws2a = true;
								ec2.done();
								break;
							default:
								expect().fail('unkown peer "ws2" with uuid "' + peer.uuid + '"');
						}
						break;
				}
			});
			expect(numPeers).to.be(3);
		});

		ec2.on('alldone', function()
		{
			done();
		});

		app.connect('ws1', '___1a___');
		app.connect('ws1', '___1b___');
		app.connect('ws2', '___2a___');
	});

	it('unknown method gets 404', function(done)
	{
		var ws = app.connect('test_app');

		app.on('routingError', function(error)
		{
			throw error;
		});

		ws.onopen = function()
		{
			ws.sendRequest('chicken', '/users/alice');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};

		ws.onmessage = function(event)
		{
			var res = JSON.parse(event.data);

			expect(res.status).to.be(404);
			done();
		};
	});

	it('add custom method', function(done)
	{
		var ws = app.connect('test_app');
		var count = 0;
		var router;

		protoo.addMethod('chicken');

		expect(function()
		{
			protoo.addMethod('chicken');
		}).to.throwError();

		expect(function()
		{
			protoo.addMethod('all');
		}).to.throwError();

		app.on('routingError', function(error)
		{
			throw error;
		});

		app.chicken('/users/*', function(req, next)
		{
			expect(++count).to.be(1);
			next();
		});

		app.route('/users/*')
			.chicken(function(req, next)
			{
				expect(++count).to.be(2);
				next();
			});

		router = app.Router();
		app.use(router);

		router.chicken('/users/*', function(req, next)
		{
			expect(++count).to.be(3);
			next();
		});

		router.route('/users/*')
			.chicken(function()
			{
				expect(++count).to.be(4);
				done();
			});

		ws.onopen = function()
		{
			ws.sendRequest('chicken', '/users/alice');
		};

		ws.onerror = function()
		{
			expect().fail('ws should not fail');
		};
	});
});
