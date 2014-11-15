var Utils = {};


/**
 * Export the Utils module.
 */
module.exports = Utils;


/**
 * Flatten the given array.
 *
 * @param {Array} arr
 * @return {Array}
 * @private
 */
Utils.flatten = function(arr, ret){
	ret = ret || [];
	for (var i=0, len=arr.length; i<len; ++i) {
		if (Array.isArray(arr[i])) {
			Utils.flatten(arr[i], ret);
		}
		else {
			ret.push(arr[i]);
		}
	}
	return ret;
};


/**
 * The Array slice method.
 */
Utils.slice = Array.prototype.slice;
