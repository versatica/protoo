/**
 * Expose the parse function.
 */
module.exports = parse;


/**
 * Dependencies.
 */
var debugerror = require('debug')('protoo:ERROR:parse');
var methods = require('./methods');
var isPositiveInteger = require('./Utils').isPositiveInteger;
var IncomingRequest = require('./IncomingRequest');
var IncomingResponse = require('./IncomingResponse');


// TODO: Validate lenght of .method, .path, .id, etc etc etc !!!


function parse(raw) {
	var msg,
		id,
		method,
		path,
		data = {};

	// Must be a JSON object.
	try {
		msg = JSON.parse(raw);
	}
	catch(error) {
		debugerror('invalid JSON: %s', error);
		return;
	}
	if (typeof msg !== 'object') {
		debugerror('not an object');
		return;
	}
	if (Array.isArray(msg)) {
		debugerror('cannot be an array');
		return;
	}


	/**
	 * Filter unknown keys and validate known keys' value.
	 */

	for(var key in msg) {
		switch(key) {
			case 'id':
				id = msg.id;
				if (! isPositiveInteger(id)) {
					debugerror('.id must be a positive integer');
					return;
				}
				break;

			case 'method':
				method = msg.method;
				if (methods.indexOf(method) === -1) {
					debugerror('unknown .method');
					return;
				}
				break;

			case 'path':
				path = msg.path;
				if (typeof path !== 'string') {
					debugerror('.path must be a string');
					return;
				}
				if (path[0] !== '/') {
					debugerror('.path must start with /');
					return;
				}
				break;

			case 'data':
				data = msg.data;
				if (typeof data !== 'object') {
					debugerror('.data must be a object');
					return;
				}
				break;

			default:
				debugerror('deleting unknown field .%s', key);
				delete msg[key];
		}
	}


	/**
	 * Validate fields.
	 */

	if (! id) {
		debugerror('missing .id field');
		return;
	}


	/**
	 * Create a IncomingRequest or IncomingResponse instance.
	 */

	msg.data = msg.data || {};

	if (method && path) {
		msg.__proto__ = new IncomingRequest();
	}
	else {
		msg.__proto__ = new IncomingResponse();
	}

	return msg;
}
