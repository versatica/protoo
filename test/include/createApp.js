var protoo = require('../../');
var http = require('http');
var https = require('https');
var parseUrl = require('url').parse;
var path = require('path');
var fs = require('fs');
var W3CWebSocket = require('websocket').w3cwebsocket;


module.exports = function(url, requestListener, done) {
	var useWss = /^wss:/.test(url),
		parsedUrl = parseUrl(url),
		httpServer,
		app = protoo();

	if (useWss) {
		httpServer = https.createServer({
			cert: fs.readFileSync(path.resolve(__dirname, 'local.protoo.org.crt.pem')),
			key:  fs.readFileSync(path.resolve(__dirname, 'local.protoo.org.key.pem'))
		});
	}
	else {
		httpServer = http.createServer();
	}

	function defaultRequestListener(info, accept) {
		var u = parseUrl(info.req.url, true);
		var username = u.query.username;
		var uuid = u.query.uuid;

		accept(username, uuid, null);
	}

	app.websocket(httpServer, requestListener || defaultRequestListener);
	httpServer.listen(parsedUrl.port, parsedUrl.hostname, function() {
		done();
	});

	// Add a custom connect() method to the app for testing.
	app.connect = function(username, uuid, protocol) {
		username = username || Math.round(100000 * Math.random()).toString();
		uuid = uuid || Math.round(100000 * Math.random()).toString();

		if (protocol === undefined) {
			protocol = 'protoo';
		}

		var protocols = protocol ? [protocol] : [],
			options = {},
			connectUrl,
			client;

		connectUrl = url + '/?username=' + username + '&uuid=' + uuid;

		if (useWss) {
			options.rejectUnauthorized = false;
		}

		client = new W3CWebSocket(connectUrl, protocols, null, null, options);

		client.sendRequest = function(method, path) {
			var req = {
				method: method,
				id: Math.round(100000 * Math.random()),
				path: path
			};

			client.send(JSON.stringify(req));
		};

		return client;
	};

	return app;
};
