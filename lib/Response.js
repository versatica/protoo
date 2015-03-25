/**
 * Expose the Response class.
 */
module.exports = Response;


/**
 * Dependencies.
 */
var isPositiveInteger = require('./Utils').isPositiveInteger;


function Response() {
	/**
	 * JSON fields.
	 * - id:     String (ro), mandatory.
	 * - status: Number (ro), mandatory.
	 * - reason: String (ro), optional.
	 * - data:   Object (rw), optional.
	 */

	/**
	 * Public attributes.
	 * - isProvisional:  Boolean (ro).
	 * - isAccept:  Boolean (ro).
	 * - isReject:  Boolean (ro).
	 */

	/**
	 * Private attributes.
	 * - _toString: String, for toString() method.
	 */
}


/**
 * Class methods.
 */

Response.factory = function(res) {
	/**
	 * Validation
	 */
	if (! isPositiveInteger(res.status) || res.status < 100 || res.status > 699) {
		throw new Error('protoo.Response.factory() | status must be 100..699');
	}

	res.__proto__ = new Response();
	res.init();

	return res;
};


/**
 * Instance methods.
 */

Response.prototype.init = function() {
	this.reason = this.reason || '';
	this.data = this.data || {};

	if (this.status < 200) {
		this.isProvisional = true;
	}
	else if (this.status < 300) {
		this.isAccept = true;
	}
	else {
		this.isReject = true;
	}
};


Response.prototype.toString = function() {
	return this._toString || (this._toString = '[id:' + this.id + ', status:' + this.status + ', reason:"' + this.reason + '"]');
};


Response.prototype.json = function() {
	var res = {
		status:  this.status,
		reason:  this.reason,
		id:      this.id,
	};

	if (this.data)   { res.data = this.data; }

	return JSON.stringify(res);
};
