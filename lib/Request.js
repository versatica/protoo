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
	this.url = msg.url;
	this.id = msg.id;
	this.data = msg.data || {};

	debug('new() | [method:%s, url:%s, id:%s]', this.method, this.url, this.id);
}


Request.prototype.isRequest = function() {
	return true;
};


Request.prototype.isResponse = function() {
	return false;
};
