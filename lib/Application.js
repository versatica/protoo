/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var WebSocketServer = require('./WebSocketServer');


/**
 * The Application constructor.
 *
 * @class Application
 */

var Application = function() {
	events.EventEmitter.call(this);

	// TODO
	this.servers = [];
};

util.inherits(Application, events.EventEmitter);


Application.prototype.handleWebSocket = function(httpServer, path) {
	var wsServer = new WebSocketServer(this, httpServer, path);

	this.servers.push(wsServer);
};


/**
 * Expose the Application class.
 */

Object.freeze(Application);
module.exports = Application;
