var protoo = require('../');
var expect = require('expect.js');
var pkg = require('../package.json');


describe('properties in package.json', function() {

	it('must match version property', function() {
		expect(protoo.version).to.be(pkg.version);
	});

});
