/**
 * Expose the IncomingResponse class.
 */
module.exports = IncomingResponse;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:IncomingResponse');
// var debugerror = require('debug')('protoo:ERROR:IncomingResponse');


function IncomingResponse(msg) {
	// Attributes.
	this.id = msg.id;
	this.data = msg.data || {};

	debug('new() | [id:%s]', this.id);
}
