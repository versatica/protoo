const { version } = require('../package.json');
const Room = require('./Room');
const Peer = require('./Peer');
const WebSocketServer = require('./transports/WebSocketServer');

/**
 * Expose mediasoup version.
 *
 * @type {String}
 */
exports.version = version;

/**
 * Expose Room class.
 *
 * @type {Class}
 */
exports.Room = Room;

/**
 * Expose Peer class.
 *
 * @type {Class}
 */
exports.Peer = Peer;

/**
 * Expose WebSocketServer class.
 *
 * @type {Class}
 */
exports.WebSocketServer = WebSocketServer;
