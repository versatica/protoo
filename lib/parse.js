/**
 * Expose the parse function.
 */
module.exports = parse;


/**
 * Dependencies.
 */
var debugerror = require('debug')('protoo:ERROR:parse');
var Request = require('./Request');
var Response = require('./Response');


function parse(data) {
	var msg;

	// Must be a JSON object.
	try {
		msg = JSON.parse(data);
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

	// Must have .id field and must be a number.
	if (! msg.hasOwnProperty('id') || typeof msg.id !== 'number') {
		debugerror('missing .id field');
		return;
	}

	// .data is an optional object.
	if (msg.data && typeof msg.data !== 'object') {
		debugerror('wrong .data field: %o', msg.data);
		return;
	}

	if (msg.hasOwnProperty('method') && msg.hasOwnProperty('path')) {
		return parseRequest(msg);
	}
	else {
		return parseResponse(msg);
	}
}


/**
 * Private API.
 */


function parseRequest(msg) {
	// Must have .method field.
	if (typeof msg.method !== 'string') {
		debugerror('parseRequest() | wrong .method field: %s', msg.method);
		return;
	}

	// Must have .path field.
	if (typeof msg.path !== 'string') {
		debugerror('parseRequest() | wrong .path field: %s', msg.path);
		return;
	}

	return new Request(msg);
}


function parseResponse(msg) {
	return new Response(msg);
}
