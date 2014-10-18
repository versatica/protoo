/**
 * Dependencies.
 */

var events = require('events');
var util = require('util');
var WebSocketServer = require('./WebSocketServer');


/**
 * Class events.
 */

var EVENTS = [
	/**
	 * Fired upon an usage or internal error.
	 *
	 * @event error
	 * @param {Error} error.
	 */
	'error',

	/**
	 * Fired upon a WebSocket connection.
	 *
	 * @event ws:connection
	 * @param {Object} data
	 * @param {http.IncomingRequest} data.req  The HTTP request of the client handshake.
	 * @param {String} data.origin  The Origin header value in the client request (may be `null`).
	 * @param {Function} acceptCb  Callback the user must invoke to accept the connection by providing information about the connected Protoo user.
	 * @param {String} acceptCb.user  Username of the user.
	 * @param {String} acceptCb.uuid  UUID of the user.
	 * @param {Function} rejectCb  Callback the user must invoke to reject the connection.
	 * @param {Number} rejectCb.code  Rejection cause code.
	 * @param {String} rejectCb.reason  Rejection description.
	 * @param {Function} waitCb  Callback the user must invoke to announce that it will call `acceptCb` or `rejectCb` later (maybe after a DB query or whatever asynchronous operation).
	 */
	'ws:connection'
];



/**
 * The application the user is provided with.
 *
 * @class Application
 * @constructor
 */

var Application = function() {
	events.EventEmitter.call(this);

	// The servers container.
	this.servers = [];
};

util.inherits(Application, events.EventEmitter);


/**
 * Handle WebSocket connections.
 *
 * @method handleWebSocket
 * @param  {http.Server|https.Server} httpServer A Node HTTP or HTTPS server.
 * @param  {Object} [options] Options.
 * @chainable
 */
Application.prototype.handleWebSocket = function(httpServer, options) {
	var wsServer = new WebSocketServer(this, httpServer, options || {});

	this.servers.push(wsServer);
	return this;
};


/**
 * Close the application and connections. The `code` and `reason` options are used to inform clients about the WebSocket disconnection cause.
 *
 * @method close
 * @param  {Object} [options].
 * @param  {Boolean} [options.closeServers=false] Close the servers added with {{#crossLink "Application/handleWebSocket"}}{{/crossLink}}.
 * @param  {Number} [options.code=1001] Numeric close code.
 * @param  {String} [options.reason] Textual description.
 */

Application.prototype.close = function(options) {
	options = options || {};
	options.code = options.code || 1001;

	this.servers.forEach(function(server) {
		server.close(options);
	});
};


/**
 * Expose the Application class.
 */

Object.freeze(Application);
module.exports = Application;
