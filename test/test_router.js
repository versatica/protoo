var protoo = require('../');
var expect = require('expect.js');
var createApp = require('./include/createApp');


describe('Router API', function() {

	var app;

	beforeEach(function(done) {
		var connectionListener = function(info, accept) {
			accept('test_router', 'test_uuid', null);
		};

		app = createApp('ws://127.0.0.1:54321', connectionListener, done);
	});

	afterEach(function() {
		app.close(true);
	});

	it('routing methods', function(done) {
		var ws = app.connect('test_router'),
			count = 0;

		function checkCount(expected) {
			if (++count !== expected) {
				throw new Error('check count error [expected:' + expected + ', count:' + count + ']');
			}
		}


		app.use(function app_use1(req, next) {
			checkCount(1);
			expect(req.path).to.be('/users/alice');
			next();
		});


		var router1 = protoo.Router();
		app.use(router1);

		router1.param('folder', function(req, next, folder) {
			expect(folder).to.be('users');
			next();
		});

		router1.param('user', function(req, next, user) {
			expect(user).to.be('alice');
			next();
		});

		router1.all('*', function router1_all1(req, next) {
			checkCount(2);
			expect(req.path).to.be('/users/alice');
			next();
		});

		router1.all('/:folder/:user', function router1_all2(req, next) {
			checkCount(3);
			expect(req.path).to.be('/users/alice');
			expect(req.params.folder).to.be('users');
			expect(req.params.user).to.be('alice');
			next();
		});

		router1.invite('*', function router1_invite1(req, next) {
			checkCount(4);
			expect(req.path).to.be('/users/alice');
			next();
		});

		router1.message('*', function router1_message1() {
			throw new Error('should not match router1_message1');
		});


		var router2 = protoo.Router();
		router1.use('/users', router2);

		router2.invite('/alice', function router2_invite1(req, next) {
			checkCount(5);
			expect(req.path).to.be('/alice');
			expect(req.params.user).to.not.be('alice');
			next();
		});

		router2.route('/alice')
			.all(function router2_route_all1(req, next) {
				checkCount(6);
				expect(req.path).to.be('/alice');
				next('route');
			})
			.invite(function router2_route_invite1() {
				throw new Error('should not match router2_route_invite1 after next("route")');
			});


		var router3 = protoo.Router();
		app.use('/USERS', router3);

		router3.all('*', function router3_all1(req, next) {
			checkCount(7);
			expect(req.path).to.be('/alice');
			next();
		});


		var router4 = protoo.Router({caseSensitive: true});
		router3.use('/', router4);

		router4.invite('/alice*', function router4_invite1(req, next) {
			checkCount(8);
			expect(req.path).to.be('/alice');
			next();
		});

		router4.invite('/ALICE*', function router4_invite2() {
			throw new Error('should not match router4_invite2 (case sensitive)');
		});

		router4.route('/Alice')
			.all(function router4_route_all1() {
				throw new Error('should not match router4_route_all1 (case sensitive)');
			});


		app.use('/', function app_use_last(req) {
			checkCount(9);
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

});
