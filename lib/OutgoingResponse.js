/**
 * Expose the OutgoingResponse class.
 */
module.exports = OutgoingResponse;


function OutgoingResponse(id, status, reason, data) {
	this.id = id;
	this.status = status;
	this.reason = reason || 'no reason';
	this.data = data || {};
}


OutgoingResponse.prototype.toString = function() {
	return JSON.stringify({
		status:  this.status,
		reason:  this.reason,
		id:      this.id,
		data:    this.data
	});
};


OutgoingResponse.prototype.valueOf = OutgoingResponse.prototype.toString;
