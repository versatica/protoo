'use strict';

const randomString = require('random-string');
const randomNumber = require('random-number');
const clone = require('clone');
const merge = require('utils-merge');
const flatten = require('array-flatten');
const slice = Array.prototype.slice;

const randomNumberGenerator = randomNumber.generator(
	{
		min     : 10000000,
		max     : 99999999,
		integer : true
	});

module.exports =
{
	isPositiveInteger: function(number)
	{
		return typeof number === 'number' && number >= 0 && number % 1 === 0;
	},

	randomString: function(length)
	{
		return randomString({ numeric: false, length: length || 8 }).toLowerCase();
	},

	randomNumber: randomNumberGenerator,

	cloneObject: function(obj)
	{
		if (!obj || typeof obj !== 'object' || Array.isArray(obj))
			return {};
		else
			return clone(obj, false);
	},

	mergeObject: function(defaultObj, obj)
	{
		return merge(defaultObj, obj);
	},

	flattenArray: function(array)
	{
		return flatten(array);
	},

	sliceArray: function(array, index)
	{
		return slice.call(array, index);
	}
};
