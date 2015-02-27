/**
 * Expose the IncomingRequest class.
 */
module.exports = IncomingRequest;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:IncomingRequest');
// var debugerror = require('debug')('protoo:ERROR:IncomingRequest');
var Utils = require('./Utils');


/**
 * Local variables.
 */
var hiddenProperty = {
	writable: true,
	enumerable: false,
	configurable: true
};


function IncomingRequest(msg) {
	// Attributes.
	this.method = msg.method.toLowerCase();
	this.path = msg.path;
	this.id = msg.id;
	this.data = msg.data || {};

	// Set by the app.
	this.app = undefined;
	this.peer = undefined;

	// Final reply was sent, no more replies allowed.
	this.ended = false;

	// Properties added by the Application or Router (must be hidden).
	Object.defineProperties(this, {
		'params':        hiddenProperty,
		'basePath':      hiddenProperty,
		'originalPath':  hiddenProperty,
		'next':          hiddenProperty,
		'route':         hiddenProperty,
		'peer':          hiddenProperty
	});
}


IncomingRequest.prototype.toString = function() {
	return this.tostring || (this.tostring = '[method:' + this.method + ' | path:' + this.path + ' | id:' + this.id + ']');
};
IncomingRequest.prototype.valueOf = IncomingRequest.prototype.toString;


IncomingRequest.prototype.reply = function(status, reason, data) {
	debug('reply() | [status:%d, reason:"%s"]', status, reason);

	var ended = false;

	if (! Utils.isPositiveInteger(status)) {
		throw new Error('protoo.IncomingRequest.reply() | status must be positive integer');
	}

	if (status < 100 || status > 699) {
		throw new Error('protoo.IncomingRequest.reply() | status must be 100..699');
	}

	if (status >= 200) {
		if (this.ended && status >= 200) {
			throw new Error('protoo.IncomingRequest.reply() | request was already replied with a final response');
		}

		ended = true;
	}

	var response = {
		id: this.id,
		status: status,
		reason: reason,
		data: data || {}
	};
	// TODO: jejejej
	response.stringify = response.toString;

	this.peer.send(response);

	this.ended = ended;
};


IncomingRequest.prototype.stringify = function() {
	return JSON.stringify(this, null, '  ');
};
