/**
 * Expose the WebSocketTransport class.
 */
module.exports = WebSocketTransport;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:WebSocketTransport');
var debugerror = require('debug')('protoo:ERROR:WebSocketTransport');
debugerror.log = console.warn.bind(console);


/**
 * WebSocket transport.
 *
 * @class WebSocketTransport
 * @constructor
 * @param {websocket.WebSocketConnection} connection
 */
function WebSocketTransport(connection) {
	var self = this;

	this.connection = connection;
	this.socket = connection.socket;  // The Node net.Socket instance.
	this.peer = null;  // The Peer attached to this transport.

	// Status attribute.
	this.closed = false;
	this.locally_closed = false;

	// TODO: figure out how to know if it is WS or WSS.
	this.tostring = '[' + (this.socket.encrypted ? 'WSS' : 'WS') + ' | address:' + this.socket.remoteAddress + ' | port:' + this.socket.remotePort + ']';

	// Events.
	this.connection.on('message', function(message) {
		onMessage.call(self, message);
	});
	this.connection.on('close', function(code, reason) {
		onClose.call(self, code, reason);
	});
	this.connection.on('error', function(error) {
		onError.call(self, error);
	});

	debug('new() | %s', this);
}


WebSocketTransport.prototype.toString = function() { return this.tostring; };
WebSocketTransport.prototype.valueOf  = function() { return this.tostring; };


WebSocketTransport.prototype.attachPeer = function(peer) {
	this.peer = peer;
};


WebSocketTransport.prototype.close = function(code, reason) {
	if (this.closed) { return; }

	debug('%s close() [code:%d | reason:%s]', this, code, reason);

	this.closed = true;
	this.locally_closed = true;

	try {
		this.connection.close(code, reason);
	}
	catch(error) {
		debugerror('close() | error closing the connection: %s', error);
	}
};


WebSocketTransport.prototype.drop = function(code, reason) {
	if (this.closed) { return; }

	debug('%s drop() [code:%d | reason:%s]', this, code, reason);

	this.closed = true;
	this.peer = null;

	try {
		// TODO: Check that this won't generate 'close' event!
		// Remove this when tested!
		this.connection.on('close', function() { console.error('--- NO!!!'); process.exit(1); });

		this.connection.drop(code, reason);
	}
	catch(error) {
		debugerror('drop() | error dropping the connection: %s', error);
	}
};


/**
 * Private API.
 */


function onMessage(message) {
	if (this.closed) { return; }

	debug('%s onMessage()', this);

	if (message.type === 'binary') {
		debug('onMessage(): ignoring binary message');
		return;
	}

	// Pass it to the Peer.
	if (this.peer) {
		this.peer.onMessage(message.utf8Data);
	}
}


function onClose(code, reason) {
	debug('%s onClose() [code:%d | reason:%s | locally closed:%s]', this, code, reason, this.locally_closed);

	this.closed = true;

	if (this.peer) {
		this.peer.onClose(code, reason, this.locally_closed);
	}
}


function onError(error) {
	debugerror('%s onError(): %s', this, error);
}
