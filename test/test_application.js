var expect = require('expect.js');
var createApp = require('./include/createApp');


describe('Application API', function() {

	var app;

	beforeEach(function(done) {
		var connectionListener = function(info, accept) {
			accept('test_app', 'test_uuid', null);
		};

		app = createApp('ws://127.0.0.1:54321', connectionListener, done);
	});

	afterEach(function() {
		app.close(true);
	});

	it('settings', function() {
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

	it('routing methods', function(done) {
		var ws = app.connect('test_app'),
			count = 0;

		app.on('error:route', function(error) {
			throw error;
		});

		function checkCount(expected) {
			if (++count !== expected) {
				throw new Error('check count error [expected:' + expected + ', count:' + count + ']');
			}
		}


		app.enable('strict routing');

		app.param('folder', function(req, next, folder) {
			expect(folder).to.be('users');
			next();
		});

		app.param('user', function(req, next, user) {
			expect(user).to.be('alice');
			next();
		});

		app.use(function app_use1(req, next) {
			checkCount(1);
			expect(req.path).to.be('/users/alice');
			next();
		});

		app.use('/NO', function app_use2() {
			throw new Error('should not match app_use2');
		});

		app.use('/', function app_use3(req, next) {
			checkCount(2);
			expect(req.path).to.be('/users/alice');
			next();
		});

		app.use('/users/', function app_use4(req, next) {
			checkCount(3);
			next();
		});

		app.invite('/:folder/:user', function app_invite1(req, next) {
			checkCount(4);
			expect(req.params.folder).to.be('users');
			expect(req.params.user).to.be('alice');
			expect(req.path).to.be('/users/alice');
			next();
		});

		app.invite('/:folder/:user/', function app_invite2() {
			throw new Error('should not match app_invite2 due to "strict routing"');
		});

		app.all('/USERS/:user', function app_all1(req, next) {
			checkCount(5);
			expect(req.params.user).to.be('alice');
			expect(req.path).to.be('/users/alice');
			next();
		});

		app.route('/users/:user')
			.invite(function app_route_invite1(req, next) {
				checkCount(6);
				expect(req.params.user).to.be('alice');
				expect(req.path).to.be('/users/alice');
				next();
			});

		app.use('/', function app_use_last(req) {
			checkCount(7);
			expect(req.path).to.be('/users/alice');
			done();
		});


		ws.onopen = function() {
			ws.sendRequest('invite', '/users/alice');
		};

		ws.onerror = function() {
			throw new Error('ws should not fail');
		};
	});

	it('final handler with error (1)', function(done) {
		var ws = app.connect('test_app');

		app.once('error:route', function(error) {
			expect(error.message).to.be('BUMP');
			done();
		});

		// Don't log the error stack.
		app.set('env', 'test');

		app.all('/users/:user', function app_all1() {
			throw new Error('BUMP');
		});

		app.all('/users/:user', function app_all2() {
			throw new Error('should not match app_all2');
		});


		ws.onopen = function() {
			ws.sendRequest('invite', '/users/alice');
		};

		ws.onerror = function() {
			throw new Error('ws should not fail');
		};
	});

	it('final handler with error (2)', function(done) {
		var ws = app.connect('test_app');

		app.once('error:route', function(error) {
			expect(error.message).to.be('BUMP');
			done();
		});

		// Don't log the error stack.
		app.set('env', 'test');

		app.all('/users/:user', function app_all1(req, next) {
			next(new Error('BUMP'));
		});

		app.all('/users/:user', function app_all2() {
			throw new Error('should not match app_all2');
		});


		ws.onopen = function() {
			ws.sendRequest('invite', '/users/alice');
		};

		ws.onerror = function() {
			throw new Error('ws should not fail');
		};
	});

});
