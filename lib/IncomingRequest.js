/**
 * Expose the IncomingRequest class.
 */
module.exports = IncomingRequest;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:IncomingRequest');
// var debugerror = require('debug')('protoo:ERROR:IncomingRequest');
var OutgoingResponse = require('./OutgoingResponse');
var isPositiveInteger = require('./Utils').isPositiveInteger;


function IncomingRequest() {
	// Storage for custom data (use with set() and get() methods).
	this._settings = {};

	// Set by the transport.
	this.peer = undefined;

	// Final reply was sent, no more replies allowed.
	this.replied = false;

	// Listeners for generated replies.
	this._onresponse = [];
}


IncomingRequest.prototype.toString = function() {
	return JSON.stringify({
		method:  this.method,
		path:    this.path,
		id:      this.id,
		data:    this.data || {}
	});
};
IncomingRequest.prototype.valueOf = IncomingRequest.prototype.toString;


IncomingRequest.prototype.set = function(key, value) {
	this._settings[key] = value;
};


IncomingRequest.prototype.get = function(key) {
	return this._settings[key];
};


IncomingRequest.prototype.response = function(listener) {
	this._onresponse.push(listener);
};


IncomingRequest.prototype.reply = function(status, reason, data) {
	var replied = false,
		response,
		_onresponse = this._onresponse;

	if (! isPositiveInteger(status)) {
		throw new Error('protoo.IncomingRequest.reply() | status must be positive integer');
	}

	if (status < 100 || status > 699) {
		throw new Error('protoo.IncomingRequest.reply() | status must be 100..699');
	}

	if (status >= 200) {
		if (this.replied && status >= 200) {
			throw new Error('protoo.IncomingRequest.reply() | request was already replied with a final response');
		}

		replied = true;
	}

	// Create an OutgoingResponse instance.
	response = new OutgoingResponse(this.id, status, reason, data);

	// Execute response listeners in reverse order.
	for (var i=_onresponse.length; i-- > 0;) {
		_onresponse[i](response);
	}

	debug('reply() | %s', response);

	// Send it.
	this.peer.send(response);

	// Update replied flag.
	this.replied = replied;
};
