var Done = function(test, must_do) {
	this.test = test;
	this.must_do = must_do;
	this.dones = 0;
}


Done.prototype.done = function() {
	this.dones++;
	if (this.dones === this.must_do) {
		this.test.done();
	}
}


module.exports = Done;
