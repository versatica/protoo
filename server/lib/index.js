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
 * @typedef {Room} room
 * @class {room}
 */
exports.Room = Room;

/**
 * Expose Peer class.
 *
 * @typedef {Peer} peer
 * @class {peer}
 */
exports.Peer = Peer;

/**
 * Expose WebSocketServer class.
 *
 * @typedef {WebSocketServer} webSocketServer
 * @class {webSocketServer}
 */
exports.WebSocketServer = WebSocketServer;
