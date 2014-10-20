"use strict";


// External dependencies.
var events = require("events");
var util = require("util");

// Internal dependencies.
var Logger = require("rekuire")("lib/Logger.js");

// The exported singleton.
var App;


App = function() {
	// Needed.
	events.EventEmitter.call(this);

	// Attributes.
	this.listener = null;  // The user provided app.
};


// Inherit from EventEmitter.
util.inherits(App, events.EventEmitter);


App.prototype.load = function(path) {
	try {
		this.listener = require(path);
	}
	catch(error) {
		Logger.error("App.load() | cannot load application '%s': %s", path, error);
		this.emit("error", error);
		return;
	}

	Logger.debug("App.load() | application '%s' loaded", path);

	this.listener.hello();
};


// Export a singleton of App class.
module.exports = new App();
