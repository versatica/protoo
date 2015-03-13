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
var Request = require('./Request');
var Response = require('./Response');


// TODO: Validate lenght of .method, .path, .id, etc etc etc !!!


function parse(raw) {
	var msg,
		isRequest,
		isResponse,
		id,
		method,
		path,
		status,
		reason,
		data = {};


	/**
	 * Basic syntax check.
	 */

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

	if (! msg.id) {
		debugerror('missing .id field');
		return;
	}


	/**
	 * Detect request or response.
	 */

	if (msg.method && msg.path) {
		isRequest = true;
	}
	else if (msg.status) {
		isResponse = true;
	}
	else {
		debugerror('not a request nor a response');
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
				if (isResponse) {
					delete msg.method;
					break;
				}

				method = msg.method;
				if (methods.indexOf(method) === -1) {
					debugerror('unknown .method');
					return;
				}
				break;

			case 'path':
				if (isResponse) {
					delete msg.path;
					break;
				}

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

			case 'status':
				if (isRequest) {
					delete msg.status;
					break;
				}

				status = msg.status;
				if (! isPositiveInteger(status) || status < 100 || status > 699) {
					debugerror('invalid .status');
					return;
				}
				break;

			case 'reason':
				if (isRequest) {
					delete msg.reason;
					break;
				}

				reason = msg.reason;
				if (typeof reason !== 'string') {
					debugerror('.reason must be a string');
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
	 * Create a Request or Response instance.
	 */

	if (isRequest) {
		return Request.factory(msg);
	}
	else {
		return Response.factory(msg);
	}
}
