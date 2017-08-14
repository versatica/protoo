'use strict';

const randomNumber = require('random-number');

const randomNumberGenerator = randomNumber.generator(
	{
		min     : 1000000,
		max     : 9999999,
		integer : true
	});

module.exports =
{
	randomNumber : randomNumberGenerator
};
