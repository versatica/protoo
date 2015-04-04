var Utils = module.exports = {};


Utils.isPositiveInteger = function (number) {
	return typeof number === 'number' && number >= 0 && number % 1 === 0;
};
