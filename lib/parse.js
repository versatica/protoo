/**
 * Expose the parse function.
 */
module.exports = parse;


/**
 * Dependencies.
 */
var debug = require('debug')('protoo:parse');
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

	if (msg.type === 'request') {
		return parseRequest(msg);
	}
	else if (msg.type === 'response') {
		return parseResponse(msg);
	}
	else {
		debugerror('wrong .type field: %s', msg.type);
		return;
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

	// Must have .url field.
	if (typeof msg.url !== 'string') {
		debugerror('parseRequest() | wrong .url field: %s', msg.url);
		return;
	}

	debug('parseRequest() | new Request');
	return new Request(msg);
}


function parseResponse(msg) {
	debug('parseResponse() | new Response');
	return new Response(msg);
}
