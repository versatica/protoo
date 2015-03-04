/**
 * Expose the WebSocketTransport class.
 */
module.exports = WebSocketTransport;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:WebSocketTransport');
var debugerror = require('debug')('protoo:ERROR:WebSocketTransport');


function WebSocketTransport(connection) {
	var self = this;

	this.connection = connection;  // WebSocket-Node.WebSocketConnection instance.
	this.socket = connection.socket;  // The Node net.Socket instance.

	// Events (set via setEvents()).
	this.events = null;

	// Status attributes.
	this.closed = false;
	this.locallyClosed = false;
	this.ignoreOnClose = false;

	this.tostring = (this.socket.encrypted ? 'WSS' : 'WS') + '/' + this.socket.remoteAddress + '/' + this.socket.remotePort;
	debug('new() | %s', this);

	// Events.

	this.connection.on('message', function(raw) {
		self.events.message(raw);
	});

	this.connection.on('close', function(code, reason) {
		if (self.ignoreOnClose) { return; }
		debug('onClose() | %s [code:%d, reason:%s, locally closed:%s]', self, code, reason, self.locallyClosed);

		self.closed = true;
		self.events.close(code, reason, self.locallyClosed);
	});

	this.connection.on('error', function(error) {
		debugerror('%s [error: %s]', self, error);
	});
}


WebSocketTransport.prototype.toString = function() { return this.tostring; };
WebSocketTransport.prototype.valueOf  = function() { return this.tostring; };


WebSocketTransport.prototype.setEvents = function(events) {
	this.events = events;
};


WebSocketTransport.prototype.close = function(code, reason) {
	if (this.closed) { return; }
	debug('close() | %s [code:%d, reason:"%s"]', this, code, reason);

	var self = this;

	this.closed = true;
	this.locallyClosed = true;

	// Don't wait for the WebSocket 'close' event. Do it now.
	this.events.close(code, reason, self.locallyClosed);
	this.ignoreOnClose = true;  // Ignore the network 'close' event.

	try {
		this.connection.close(code, reason);
	}
	catch(error) {
		debugerror('close() | error closing the connection: %s', error);
	}
};


WebSocketTransport.prototype.drop = function(code, reason) {
	if (this.closed) { return; }
	debug('drop() | %s [code:%d, reason:"%s"]', this, code, reason);

	this.closed = true;
	this.ignoreOnClose = true;  // Ignore the network 'close' event.

	try {
		this.connection.drop(code, reason);
	}
	catch(error) {
		debugerror('drop() | error dropping the connection: %s', error);
	}
};


WebSocketTransport.prototype.send = function(msg) {
	if (this.closed) { return false; }

	global.KK = msg;

	try {
		this.connection.sendUTF(msg.toString());
		return true;
	}
	catch(error) {
		// TODO: let's see...
		throw error;
		// debugerror('send() | error sending: %s', error.toString());
		// return false;
	}
};
