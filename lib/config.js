var cmdline = require('./cmdline'),
	fs = require('fs');

function Config(config_path) {
	var configData;

	if (!config_path) {
		config_path = './qunitnoderunner.conf';
	}

	configData = JSON.parse(fs.readFileSync(config_path));

	this.getObj = function(name, def) {
		var value = configData[name];

		return typeof(value) != "undefined" ? value : def;
	};

	this.getStr = function(name, def) {
		var value = cmdline.has(name) ? cmdline.get(name) : configData[name];

		return typeof(value) != "undefined" ? value : def;
	};

	this.getNum = function(name, def) {
		var value = cmdline.has(name) ? cmdline.get(name) : configData[name];

		return parseInt(typeof(value) != "undefined" ? value : def);
	};

	this.getBool = function(name, def) {
		return cmdline.has(name) || configData[name] ? true : def;
	};
};

exports.createConfig = function(config_path) {
	return new Config(config_path);
};