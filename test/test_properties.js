'use strict';

const expect = require('expect.js');

const protoo = require('../');
const PKG = require('../package.json');

describe('protoo properties', () =>
{
	it('must match version property', () =>
	{
		expect(protoo.version).to.be(PKG.version);
	});
});
