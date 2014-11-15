var protoo = require('../');
var pkg = require('../package.json');


module.exports = {
	'version': function(test) {
		test.equal(protoo.version, pkg.version);
		test.done();
	}
};
