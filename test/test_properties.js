var protoo = require('../');
var expect = require('expect.js');
var pkg = require('../package.json');


describe('protoo properties', function() {

	it('must match version property', function() {
		expect(protoo.version).to.be(pkg.version);
	});

});
