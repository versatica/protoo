const { toBeType } = require('jest-tobetype');
const protooServer = require('../../server');
const protooClient = require('../../client');
const protooServerPkg = require('../../server/package.json');
const protooClientPkg = require('../../client/package.json');

expect.extend({ toBeType });

test('protooClient.version exposes the protoo-client package version', () =>
{
	expect(protooClient.version).toBeType('string');
	expect(protooClient.version).toBe(protooClientPkg.version);
}, 500);

test('protooServer.version exposes the protoo-server package version', () =>
{
	expect(protooServer.version).toBeType('string');
	expect(protooServer.version).toBe(protooServerPkg.version);
}, 500);
