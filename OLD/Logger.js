"use strict";


// External dependencies.
var chalk = require("chalk");
var events = require("events");
var util = require("util");

// The exported singleton.
var Logger;

// Internal variables.
var Level = {
	DEBUG: 1,
	INFO:  2,
	WARN:  3,
	ERROR: 4
};

// stdout&stderr logger.
var stdLogger = function() {
	var C = {
		STR_DEBUG:    chalk.gray("DEBUG:") + " ",
		STR_INFO:     chalk.cyan("INFO:")  + "  ",
		STR_WARN:     chalk.yellow("WARN:") + "  ",
		STR_ERROR:    chalk.red.bold("ERROR:") + " ",
		STR_NEWLINE:  "\r\n"
	};

	this.debug = function() {
		if (this.level > Level.DEBUG) { return; }
		process.stdout.write(C.STR_DEBUG);
		process.stdout.write(util.format.apply(null, arguments));
		process.stdout.write(C.STR_NEWLINE);
	};

	this.info = function() {
		if (this.level > Level.INFO) { return; }
		process.stdout.write(C.STR_INFO);
		process.stdout.write(util.format.apply(null, arguments));
		process.stdout.write(C.STR_NEWLINE);
	};

	this.warn = function() {
		if (this.level > Level.WARN) { return; }
		process.stderr.write(C.STR_WARN);
		process.stderr.write(util.format.apply(null, arguments));
		process.stderr.write(C.STR_NEWLINE);
	};

	this.error = function() {
		process.stderr.write(C.STR_ERROR);
		process.stderr.write(chalk.red(util.format.apply(null, arguments)));
		process.stderr.write(C.STR_NEWLINE);
	};
};


Logger = function() {
	// Default level.
	this.level = Level.DEBUG;
};


// Inherit from EventEmitter.
util.inherits(Logger, events.EventEmitter);


/**
 * Public API.
 */

Logger.prototype.setLevel = function(level) {
	switch(level) {
		case "debug":  this.level = Level.DEBUG;  break;
		case "info":   this.level = Level.INFO;   break;
		case "warn":   this.level = Level.WARN;   break;
		case "error":  this.level = Level.ERROR;  break;
		default:
			this.error("Logger.setLevel() | invalid level '%s'", level);
			this.emit("error", "invalid level given '" + level + "'");
	}
};


Logger.prototype.hasDebugLevel = function() {
	return this.level === Level.DEBUG;
};


// Logger instance.
var logger = new Logger();

// By default log to stdout/stderr.
stdLogger.call(logger);

// Export a singleton of Logger class.
module.exports = logger;
