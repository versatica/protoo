/**
 * Expose the Request class.
 */
module.exports = Request;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:Request');
// var debugerror = require('debug')('protoo:ERROR:Request');
var Utils = require('./Utils');


function Request(msg) {
	// Attributes.
	this.method = msg.method.toLowerCase();
	this.path = msg.path;
	this.id = msg.id;
	this.data = msg.data || {};

	// Associated peer (set by the Peer).
	this.peer = undefined;

	// Final reply was sent, no more replies allowed.
	this.ended = false;

	debug('new() | [method:%s, path:%s, id:%s]', this.method, this.path, this.id);
}


Request.prototype.isRequest = function() {
	return true;
};


Request.prototype.isResponse = function() {
	return false;
};


Request.prototype.reply = function(status, reason, data) {
	debug('reply() | [status:%d, reason:"%s"]', status, reason);

	var ended = false;

	if (! Utils.isPositiveInteger(status)) {
		throw new Error('protoo.Request.reply() | status must be positive integer');
	}

	if (status < 100 || status > 699) {
		throw new Error('protoo.Request.reply() | status must be 100..699');
	}

	if (status >= 200) {
		if (this.ended && status >= 200) {
			throw new Error('protoo.Request.reply() | request was already replied with a final response');
		}

		ended = true;
	}

	var response = {
		id: this.id,
		status: status,
		reason: reason,
		data: data || {}
	};

	this.peer.send(JSON.stringify(response));

	this.ended = ended;
};
