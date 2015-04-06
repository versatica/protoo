/**
 * Expose the WebSocketTransport class.
 */
module.exports = WebSocketTransport;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:WebSocketTransport'),
	debugerror = require('debug')('protoo:ERROR:WebSocketTransport'),
	parse = require('./parse'),
	Request = require('./Request');


function WebSocketTransport(connection) {
	var self = this;

	this.connection = connection;  // WebSocket-Node.WebSocketConnection instance.
	this.socket = connection.socket;  // The Node net.Socket instance.

	// Events (set via setEvents()).
	this.events = null;

	// Status attributes.
	this.locallyClosed = false;
	this.ignoreOnClose = false;

	this.tostring = (this.socket.encrypted ? 'WSS' : 'WS') + '/' + this.socket.remoteAddress + '/' + this.socket.remotePort;
	debug('new() | %s', this);

	// Events.

	this.connection.on('message', function (raw) {
		var msg;

		if (raw.type === 'binary') {
			debugerror('%s ignoring binary message', self);
			return;
		}

		msg = parse(raw.utf8Data);
		if (!msg) {
			return;
		}

		if (msg instanceof Request) {
			self.events.request(msg);
		} else {
			self.events.response(msg);
		}
	});

	this.connection.on('close', function (code, reason) {
		if (self.ignoreOnClose) {
			return;
		}
		debug('onClose() | %s [code:%d, reason:"%s", locally closed:%s]', self, code, reason, self.locallyClosed);

		self.events.close(code, reason, self.locallyClosed);
	});

	this.connection.on('error', function (error) {
		debugerror('%s [error: %s]', self, error);
	});
}


WebSocketTransport.prototype.toString = function () {
	return this.tostring;
};


WebSocketTransport.prototype.setEvents = function (events) {
	this.events = events;
};


WebSocketTransport.prototype.close = function (code, reason) {
	var self = this;

	if (!this.connection.connected) {
		return;
	}

	debug('close() | %s [code:%d, reason:"%s"]', this, code, reason);

	this.locallyClosed = true;

	// Don't wait for the WebSocket 'close' event. Do it now.
	this.events.close(code, reason, self.locallyClosed);
	this.ignoreOnClose = true;  // Ignore the network 'close' event.

	try {
		this.connection.close(code, reason);
	} catch (error) {
		debugerror('close() | error closing the connection: %s', error);
	}
};


WebSocketTransport.prototype.drop = function (code, reason) {
	if (!this.connection.connected) {
		return;
	}

	debug('drop() | %s [code:%d, reason:"%s"]', this, code, reason);

	this.ignoreOnClose = true;  // Ignore the network 'close' event.

	try {
		this.connection.close(code, reason);
	} catch (error) {
		debugerror('drop() | error dropping the connection: %s', error);
	}
};


/**
 * Sends the given request or response.
 * Returns true if it sent, null if it could not be sent now, and false if
 * it failed for other reasons.
 */
WebSocketTransport.prototype.send = function (msg) {
	if (!this.connection.connected) {
		return null;
	}

	try {
		this.connection.sendUTF(msg.json());
		return true;
	} catch (error) {
		debugerror('send() | error sending message: %s', error);
		return false;
	}
};
