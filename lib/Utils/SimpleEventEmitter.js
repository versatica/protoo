/**
 * Expose the SimpleEventEmitter class.
 */
module.exports = SimpleEventEmitter;


/**
 * Very simple event emitter implementation with methods:
 * - on(type, fn)
 * - off(type, [fn])
 * - emit(type, [data])  // max 4 arguments in data.
 *
 * In order to inherit from SimpleEventEmitter just add in the child class
 * constructor:
 *
 *     SimpleEventEmitter.call(this);
 */
function SimpleEventEmitter() {
	var events = {};

	function getOrCreateEvent(type) {
		return events[type] || (events[type] = []);
	}

	this.on = function(type, fn) {
		getOrCreateEvent(type).push(fn);
	};

	this.off = function(type, fn) {
		if (! fn) {
			delete events[type];
		}
		else {
			var fns = events[type];
			if (! fns) { return; }

			var i = fns.indexOf(fn);
			if (i >= 0) {
				fns.splice(i,1);
			}
		}
	};

	this.emit = function(type) {
		var fns = events[type];
		if (! fns) { return; }

		for(var i=0, len=fns.length; i<len; i++) {
			// fns[i](data);
			var fn = fns[i];

			switch (arguments.length) {
				case 1:
					fn.call(this);
					break;
				case 2:
					fn.call(this, arguments[1]);
					break;
				case 3:
					fn.call(this, arguments[1], arguments[2]);
					break;
				case 4:
					fn.call(this, arguments[1], arguments[2], arguments[3]);
					break;
				case 5:
					fn.call(this, arguments[1], arguments[2], arguments[3], arguments[4]);
					break;
				default:
					throw new Error('SimpleEventEmitter.emit(): maximum 4 data arguments');
			}
		}
	};
}
