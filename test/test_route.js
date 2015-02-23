var protoo = require('../');
var expect = require('expect.js');
var createApp = require('./include/createApp');


var app;


describe('Route API', function() {

	beforeEach(function(done) {
		var connectionListener = function(info, accept) {
			accept('test_route', 'test_uuid', null);
		};

		app = createApp('ws://127.0.0.1:54321', connectionListener, done);
	});

	afterEach(function() {
		app.close(true);
	});

	it('must match correct paths', function(done) {
		var ws = app.connect('test'),
			count = 0;

		function checkCount(expected) {
			if (++count !== expected) {
				throw new Error('check count error [expected:' + expected + ', count:' + count + ']');
			}
		}


		app.on('error', function(error) {
			throw error;
		});


		app.use(function app_use_1(req, next) {
			checkCount(1);
			next();
		});

		app.use('/NO', function app_use_2() {
			throw new Error('should not match: app_use_2');
		});

		app.use('/', function app_use_3(req, next) {
			checkCount(2);
			next();
		});

		app.use('/users', function app_use_4(req, next) {
			checkCount(3);
			next();
		});


		var router1 = protoo.Router();
		app.use(router1);

		router1.all('*', function route1_all_1(req, next) {
			checkCount(4);
			next();
		});

		router1.param('folder', function(req, next, folder) {
			expect(folder).to.be('users');
			next();
		});

		router1.param('user', function(req, next, user) {
			expect(user).to.be('alice');
			next();
		});

		router1.all('/:folder/:user', function route1_all_2(req, next) {
			checkCount(5);
			expect(req.params.folder).to.be('users');
			expect(req.params.user).to.be('alice');
			next();
		});

		router1.invite('*', function route1_invite_1(req, next) {
			checkCount(6);
			next();
		});

		router1.message('*', function route1_message_1() {
			throw new Error('should not match: route_message_1');
		});


		var router2 = protoo.Router();
		router1.use('/users', router2);

		router2.invite('/alice', function route2_invite_1(req, next) {
			checkCount(7);
			expect(req.params.user).to.not.be('alice');
			next();
		});

		router2.route('/alice')
			.all(function route2_all_1(req, next) {
				checkCount(8);
				next('route');
			})
			.invite(function route2_invite_2() {
				throw new Error('should not match after next("route")');
			});


		var router3 = protoo.Router();
		app.use('/users', router3);

		router3.all('*', function route3_all_1(req, next) {
			checkCount(9);
			next();
		});


		var router4 = protoo.Router();
		router3.use('/', router4);

		router4.invite('/ALICE*', function route4_invite_1(req, next) {
			checkCount(10);
			next();
		});


		app.use('/', function app_use_last() {
			checkCount(11);
			done();
		});


		ws.onopen = function() {
			sendRequest(ws, 'invite', '/users/alice');
		};

		ws.onerror = function() {
			done(new Error('ws should not fail'));
		};
	});

});


function sendRequest(ws, method, url) {
	var req = {
		type: 'request',
		method: method,
		id: Math.round(100000 * Math.random()),
		url: url
	};

	ws.send(JSON.stringify(req));
}
