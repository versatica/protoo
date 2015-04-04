var protoo = require('../'),
	expect = require('expect.js'),
	pkg = require('../package.json');


describe('protoo properties', function () {

	it('must match version property', function () {
		expect(protoo.version).to.be(pkg.version);
	});

});
