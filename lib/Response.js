/**
 * Expose the Response class.
 */
module.exports = Response;


function Response() {
	/**
	 * JSON fields.
	 * - id:     String (ro), mandatory.
	 * - status: Number (ro), mandatory.
	 * - reason: String (ro), optional.
	 * - data:   Object (rw), optional.
	 */

	/**
	 * Private attributes.
	 * - _toString: String, for toString() method.
	 */
}


/**
 * Class methods.
 */

Response.factory = function(msg) {
	msg.__proto__ = new Response();
	msg.init();

	return msg;
};


/**
 * Instance methods.
 */

Response.prototype.init = function() {
	this.reason = this.reason || '';
	this.data = this.data || {};
};


Response.prototype.toString = function() {
	return this._toString || (this._toString = '[id:' + this.id + ', status:' + this.status + ', reason:' + this.reason + ']');
};
Response.prototype.valueOf = Response.prototype.toString;


Response.prototype.json = function() {
	var res = {
		status:  this.status,
		reason:  this.reason,
		id:      this.id,
	};

	if (this.data)   { res.data = this.data; }

	return JSON.stringify(res);
};
