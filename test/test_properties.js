var protoo = require('../');
var pkg = require('../package.json');


exports['version'] = function(test) {
	test.equal(protoo.version, pkg.version);
	test.done();
};


var tests = {
	'version': function(test) {
		test.equal(protoo.version, pkg.version);
		test.done();
	}
};


module.exports = tests;
