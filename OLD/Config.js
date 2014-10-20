"use strict";


// External dependencies.
// NOTE: 'config' loaded in runtime.
var events = require("events");
var util = require("util");
var fs = require("fs");
var posix = require("posix");

// Internal dependencies.
var Logger = require("rekuire")("lib/Logger.js");

// The exported singleton.
var Config;


Config = function() {
	// Needed.
	events.EventEmitter.call(this);

	this.config = null;  // Configuration object.
	this.hasTLS = false;
};


// Inherit from EventEmitter.
util.inherits(Config, events.EventEmitter);


/**
 * Private API.
 */

function validateConfigDir(path) {
	var files = fs.readdirSync(path);
	var default_json_found = false;

	for(var i=0, len=files.length; i<len; i++) {
		if (files[i] === "default.json") {
			return;
		}
	}

	if (! default_json_found) {
		throw "no 'default.json' file";
	}
}


function preProcessConfig() {
	// Append tls.cert and tls.key with the content of the certificate and key.
	if (this.config.get("tls.certFile") && this.config.get("tls.keyFile")) {
		this.hasTLS = true;

		this.config.tls.cert = fs.readFileSync(String(this.config.tls.certFile));
		this.config.tls.key = fs.readFileSync(String(this.config.tls.keyFile));
	}
}


function validateConfig() {
	var assert = function(field, func) {
		if (! func(this.config.get(field))) {
			throw "wrong value for '" + field + "': '" + this.config.get(field) + "'";
		}
	}.bind(this);

	if (this.config.get("transport.webSocket.secure") && ! this.hasTLS) {
		throw "cannot use secure WebSocket transport without TLS set";
	}

	assert("log.level", function(level) {
		return ["debug", "info", "warn", "error"].indexOf(level) !== -1;
	});

	// TODO
	// assert("WebSocket.listenIP", function(ip) {
	// 	return typeof(ip) === "string";
	// });

	// assert("WebSocket.listenPort", function(port) {
	// 	return port > 0 && port < 65535;
	// });
}


/**
* Public API.
*/

Config.prototype.load = function(configDir) {
	// Validate config dir.
	if (configDir) {
		try {
			validateConfigDir.call(this, configDir);
		}
		catch(error) {
			Logger.error("Config.load() | invalid configuration directory '%s': %s", configDir, error);
			this.emit("error", error);
			return;
		}

		process.env.NODE_CONFIG_DIR = configDir;
	}

	// Set hostname (as HOST or HOSTNAME are not usually in env).
	process.env.HOSTNAME = posix.gethostname();

	// Generate the resulting config object.
	try {
		this.config = require("config");
	}
	catch(error) {
		Logger.error("Config.load() | %s", error);
		this.emit("error", error);
		return;
	}

	// Allow modifications in the resulting config object.
	process.env.ALLOW_CONFIG_MUTATIONS = 1;

	// Pre-process and validate config object.
	try {
		preProcessConfig.call(this);
		validateConfig.call(this);
	}
	catch(error) {
		Logger.error("Config.load() | configuration error: %s", error);
		this.emit("error", error);
		return;
	}
};


Config.prototype.get = function(path) {
	try {
		return this.config.get(path);
	}
	catch(error) {
		Logger.error("Config.get() | %s", error);
		this.emit("error", error);
	}
};


Config.prototype.has = function(path) {
	return this.config.has(path);
};


// Export a singleton of Config class.
module.exports = new Config();
