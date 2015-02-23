/**
 * Expose the Request class.
 */
module.exports = Request;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Request');
// var debugerror = require('debug')('protoo:ERROR:Request');


function Request(msg) {
	// Attributes.
	this.method = msg.method.toLowerCase();
	this.path = msg.path;
	this.id = msg.id;
	this.data = msg.data || {};

	debug('new() | [method:%s, path:%s, id:%s]', this.method, this.path, this.id);
}


Request.prototype.isRequest = function() {
	return true;
};


Request.prototype.isResponse = function() {
	return false;
};
