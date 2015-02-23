var protoo = require('../../');
var http = require('http');
var https = require('https');
var parseUrl = require('url').parse;
var path = require('path');
var fs = require('fs');
var W3CWebSocket = require('websocket').w3cwebsocket;


module.exports = function(url, connectionListener, done) {
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

	app.websocket(httpServer, connectionListener);
	httpServer.listen(parsedUrl.port, parsedUrl.hostname, function() {
		done();
	});

	// Add a custom connect() method to the app for testing.
	app.connect = function(username, uuid, protocol) {
		if (protocol === undefined) {
			protocol = 'protoo';
		}

		var protocols = protocol ? [protocol] : [],
			options = {},
			connectUrl;

		uuid = uuid || Math.round(100000 * Math.random()).toString();
		connectUrl = url + '/?username=' + username + '&uuid=' + uuid;

		if (useWss) {
			options.rejectUnauthorized = false;
		}

		return new W3CWebSocket(connectUrl, protocols, null, null, options);
	};

	return app;
};
