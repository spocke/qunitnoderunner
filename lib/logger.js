const DEBUG = 1, INFO = 2, WARN = 3, FATAL = 4;

exports.setLevel = function(level) {
	
};

exports.setPath = function(path) {
	this.path = path;
};

exports.debug = function(message) {
	this.log(DEBUG, message);
};

exports.info = function(message) {
	this.log(INFO, message);
};

exports.warn = function(message) {
	this.log(WARN, message);
};

exports.fatal = function(message) {
	this.log(FATAL, message);
};

exports.log = function(level, message) {
	if (this.path) {
		// Write to log
	} else {
		console.log(message);
	}
};
