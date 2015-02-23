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
	this.id = msg.id;
	this.url = msg.url;
	this.data = msg.data || {};

	debug('new() | [method:%s, id:%s, url:%s]', this.method, this.id, this.url);
}


Request.prototype.isRequest = function() {
	return true;
};


Request.prototype.isResponse = function() {
	return false;
};
