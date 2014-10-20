/*
 * ProtooServer
 * https://bitbucket.org/ibc_aliax/protooserver
 *
 * Copyright (c) 2014 Iñaki Baz Castillo
 * Licensed under the MIT license.
 */


"use strict";


// External dependencies.
var posix = require("posix");

// Internal dependencies.
var pkg = require("rekuire")("package.json");
var Logger = require("rekuire")("lib/Logger.js");
var Config = require("rekuire")("lib/Config.js");
var App = require("rekuire")("lib/App.js");
var Transport = require("rekuire")("lib/Transport.js");

// The exported class.
var ProtooServer;

// Private constants.
var C = {
	NOFILE_LIMIT: 131072
};


/**
 * Private API.
 */

function increaseKernelLimits() {
	var nofile = posix.getrlimit("nofile");
	var error;

	// NOTE: Ignore null hard limit (theorically unlimited) as, for example in OSX, it means nothing.
	if ((nofile.soft !== null && nofile.soft < C.NOFILE_LIMIT) || (nofile.hard === null || nofile.hard < C.NOFILE_LIMIT)) {
		try {
			posix.setrlimit("nofile", { soft: C.NOFILE_LIMIT, hard: C.NOFILE_LIMIT });
		}
		catch(e) {
			error = e;
		}
	}

	nofile = posix.getrlimit("nofile");
	if (nofile.soft !== null && nofile.soft < C.NOFILE_LIMIT) {
		error = error || { message: "unknown error" };

		switch(process.platform) {
			case "linux":
				if (posix.geteuid() !== 0) {
					Logger.warn("ProtooServer.increaseKernelLimits() | cannot increase 'nofile' limit (%s), execute 'sysctl -w fs.nr_open=%d; ulimit -n %d' as root before running ProtooServer", error.message, C.NOFILE_LIMIT, C.NOFILE_LIMIT);
				}
				else {
					Logger.warn("ProtooServer.increaseKernelLimits() | cannot increase 'nofile' limit (%s), execute 'sysctl -w fs.nr_open=%d' as root before running ProtooServer", error.message, C.NOFILE_LIMIT);
				}
				break;
			case "darwin":
			case "freebsd":
				if (posix.geteuid() !== 0) {
					Logger.warn("ProtooServer.increaseKernelLimits() | cannot increase 'nofile' limit (%s), execute 'sysctl -w kern.maxfiles=%d; ulimit -n %d' as root before running ProtooServer", error.message, C.NOFILE_LIMIT, C.NOFILE_LIMIT);
				}
				else {
					Logger.warn("ProtooServer.increaseKernelLimits() | cannot increase 'nofile' limit (%s), execute 'sysctl -w kern.maxfiles=%d' as root before running ProtooServer", error.message, C.NOFILE_LIMIT);
				}
				break;
			default:
				Logger.warn("ProtooServer.increaseKernelLimits() | cannot increase 'nofile' limit to %d (%s), increase it as root before running ProtooServer", C.NOFILE_LIMIT, error.message);
		}
	}
}


function setUserGroup() {
	// Set GID.
	if (this.options.gid) {
		try {
			process.setgid(this.options.gid);
		}
		catch(error) {
			Logger.error("ProtooServer.setUserGroup() | error setting process gid to '%s': %s", this.options.gid, error);
			this.exitError();
		}
	}

	// Set UID.
	if (this.options.uid) {
		try {
			process.setuid(this.options.uid);
		}
		catch(error) {
			Logger.error("ProtooServer.setUserGroup() | error setting process uid to '%s': %s", this.options.uid, error);
			this.exitError();
		}
	}

}


function showInfo() {
	Logger.debug("information:");
	Logger.debug("- ProtooServer version: %s", ProtooServer.version);
	Logger.debug("- Node.js version: %s", process.version);
	Logger.debug("- architecture: %s %s", process.platform, process.arch);
	Logger.debug("- process: [pid: %d | name:%s | uid:%s | gid:%s | cwd:%s]", process.pid, process.title, process.getuid(), process.getgid(), process.cwd());
	Logger.debug("- kernel 'nofile' limit: [soft:%s | hard:%s]", posix.getrlimit("nofile").soft, posix.getrlimit("nofile").hard);
	Logger.debug("- config directory: %s", Config.config.util.getEnv("NODE_CONFIG_DIR"));
	Logger.debug("- hostname: %s", Config.config.util.getEnv("HOSTNAME"));
}


/**
 * Public API.
 */

ProtooServer = function(options, app_path) {
	this.options = options || {};

	// Set process name.
	if (this.options.processName) {
		process.title = this.options.processName;
	}

	// Load configuration.
	Config.on("error", function() {
		this.exitError();
	}.bind(this));

	Config.load(this.options.configDir);

	// Set logger.
	Logger.on("error", function() {
		this.exitError();
	}.bind(this));

	Logger.setLevel(Config.get("log.level"));

	// Load the app.
	App.on("error", function() {
		this.exitError();
	}.bind(this));

	App.load(app_path);

	// Move to the working directory.
	try {
		process.chdir(this.options.workingDir);
	}
	catch(error) {
		Logger.error("ProtooServer() | error changing the working directory to '%s': %s", this.options.workingDir, error);
		this.exitError();
	}

	// Attempt to increase "nofile" limits.
	increaseKernelLimits.call(this);

	// Run the WebSocket transport server.
	try {
		this.wsServer = new Transport.WebSocketServer();
	}
	catch(error) {
		Logger.error("ProtooServer() | error creating the WebSocket transport: %s", error);
		this.exitError();
	}

	this.wsServer.on("error", function() {
		this.exitError();
	}.bind(this));

	// Wait a tick (since listen() is not called immediately) and set UID/GID if requested.
	process.nextTick(function() {
		setUserGroup.call(this);

		// And show resulting process/enviornment information.
		showInfo();
	}.bind(this));
};


ProtooServer.prototype.exit = function() {
	Logger.info("ProtooServer.exit() | exiting with success status");
	process.exit(0);
};


ProtooServer.prototype.exitError = function(error) {
	if (error) {
		Logger.warn("ProtooServer.exitError() | exiting with error: %s", error);
	}
	else {
		Logger.warn("ProtooServer.exitError() | exiting with error");
	}
	process.exit(1);
};


Object.defineProperties(ProtooServer, {
	version: {
		get: function() { return "v" + pkg.version; }
	}
});


ProtooServer.run = function(options, app_path) {
	if (ProtooServer.instance) {
		throw "already running ProtooServer";
	}

	ProtooServer.instance = new ProtooServer(options, app_path);
};


// Export the ProtooServer class.
module.exports = ProtooServer;
