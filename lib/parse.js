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
	var method = msg.method,
		id = msg.id,
		data = msg.data || {};

	// Must have .method field.
	if (typeof method !== 'string') {
		debugerror('parseRequest() | wrong .method field: %s', method);
		return;
	}

	// .data is an optional object.
	if (typeof data !== 'object') {
		debugerror('parseRequest() | wrong .data field: %s', data);
		return;
	}

	debug('parseRequest() | new Request');
	return new Request(method.toLowerCase(), id, data);
}


function parseResponse(msg) {
	var id = msg.id,
		data = msg.data || {};

	// .data is an optional object.
	if (typeof data !== 'object') {
		debugerror('parseResponse() | wrong .data field: %s', data);
		return;
	}

	debug('parseResponse() | new Response');
	return new Response(id, data);
}
