/**
 * Expose the Request class.
 */
module.exports = Request;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Request');
// var debugerror = require('debug')('protoo:ERROR:Request');


function Request(method, id, data) {
	debug('new() | [method:%s, id:%s]', method, id);

	// Attributes.
	this.method = method;
	this.id = id;
	this.data = data;
}


Request.prototype.isRequest = function() {
	return true;
};


Request.prototype.isResponse = function() {
	return false;
};
