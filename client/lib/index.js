const Peer = require('./Peer');
const transports = require('./transports');

module.exports =
{
	/**
	 * Expose Peer.
	 */
	Peer : Peer,

	/**
	 * Expose the built-in WebSocketTransport.
	 */
	WebSocketTransport : transports.WebSocketTransport
};
