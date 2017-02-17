'use strict';

const logger = require('./logger')();
const Room = require('./Room');
const transports = require('./transports');
const PKG = require('../package.json');

logger.debug('%s version %s', PKG.name, PKG.version);

module.exports =
{
	/**
	 * Expose Room.
	 */
	Room : Room,

	/**
	 * Expose the built-in WebSocketServer.
	 */
	WebSocketServer : transports.WebSocketServer
};
