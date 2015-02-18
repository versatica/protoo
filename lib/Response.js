/**
 * Expose the Response class.
 */
module.exports = Response;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Response');
var debugerror = require('debug')('protoo:ERROR:Response');
debugerror.log = console.warn.bind(console);


function Response(id, data) {
	debug('new() | [id:%s]', id);

	// Attributes.
	this.id = id;
	this.data = data;
}


Response.prototype.isResponse = function() {
	return true;
};


Response.prototype.isRequest = function() {
	return false;
};
