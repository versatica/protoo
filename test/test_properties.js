var expect = require('expect.js');

var protoo = require('../');

const PKG = require('../package.json');

describe('protoo properties', function()
{
	it('must match version property', function()
	{
		expect(protoo.version).to.be(PKG.version);
	});
});
