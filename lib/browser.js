var sys = require('util'),
	path = require('path'),
	fs = require('fs'),
	os = require('os'),
	spawn = require('child_process').spawn,
	exec = require('child_process').exec;

function uuid() {
	var chars = '0123456789abcdef'.split('');
	var uuid = [], rnd = Math.random, r;
	uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
	uuid[14] = '4'; // version 4

	for (var i = 0; i < 36; i++) {
		if (!uuid[i]) {
			r = 0 | rnd()*16;
			uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
		}
	}

	return uuid.join('');
};

function rmdirSyncRecursive(path) {
var files = fs.readdirSync(path), currDir = path;

	for(var i = 0; i < files.length; i++) {
		var currFile = fs.statSync(currDir + "/" + files[i]);

		if (currFile.isDirectory())
			rmdirSyncRecursive(currDir + "/" + files[i]);
		else if(currFile.isSymbolicLink())
			fs.unlinkSync(currDir + "/" + files[i]);
		else
			fs.unlinkSync(currDir + "/" + files[i]);
	}

	return fs.rmdirSync(path);
};

function Browser(settings) {
	var self = this, flags = [], lastTouched = new Date(), timeout;

	timeout = parseInt(settings.timeout, 10) * 1000;
	if (settings.timeout.indexOf('m') != -1) {
		timeout *= 60;
	}

	if (/chrome/i.test(settings.path)) {
		flags = [
		  "--disable-prompt-on-repost",
		  "--disable-metrics",
		  "--disable-metrics-reporting",
		  "--no-default-browser-check",
		  "--disable-web-security",
		  "--temp-profile",
		  "--no-first-run",
		  "--disable-popup-blocking",
		  "--disable-translate",
		  "--start-maximized",
		  '"' + settings.url + '"'
		];
	} else if (/firefox/i.test(settings.path)) {
		if (os.platform() == "darwin") {
			flags = [
				'"' + settings.url + '"'
			];
		} else {
			flags = [
				settings.url
			];
		}

		// Firefox needs to be forcefully killed
		self.forceKill = true;
	} else if (/opera/i.test(settings.path)) {
		// Remove the last Opera session on Windows
		if (process.env.USERPROFILE) {
			[
				"AppData/Roaming/Opera/Opera",
				"Application Data/Opera"
			].forEach(function(del_path) {
				del_path = path.join(process.env.USERPROFILE, del_path);

				if (path.existsSync(del_path)) {
					rmdirSyncRecursive(del_path);
				}
			});
		}

		flags = [settings.url];
	} else if (/safari/i.test(settings.path)) {
		// On Mac we need to use the open command to launch the browser
		if (os.platform() == "darwin") {
			flags = ['-W -a Safari', '"' + settings.url + '"'];
			settings.path = '/usr/bin/open';
			this.pname = 'Safari';
			this.forceKill = true;
		} else {
			flags = [settings.url];
		}
	} else {
		flags = [settings.url];
	}

	if (os.platform() == "darwin") {
		var processInst = exec('"' + settings.path + '" ' + flags.join(" "));
	} else {
		var processInst = spawn(path.basename(settings.path), flags, {cwd: path.dirname(settings.path)});
	}

	if (processInst.pid) {
		this.pid = processInst.pid;

		//console.log("Browser started: [" + this.pid + "] " + settings.path);

		// Listen for premature exits
		processInst.on('exit', function(code, signal) {
			if (!self.manualExit) {
				if (settings.crashed) {
					settings.crashed();
				}
			} else {
				self.pid = 0;
				self.killCallback();
			}
		});

		function checkHang() {
			if (new Date().getTime() - lastTouched.getTime() > timeout) {
				self.kill(function() {
					if (settings.hanged) {
						settings.hanged();
					}
				}, true);
			} else {
				self.hangTimeout = setTimeout(checkHang, 1000);
			}
		};

		checkHang();
	} else {
		console.log("Failed to start browser: " + settings.path);
		process.exit(1);
	}

	this.touch = function() {
		lastTouched = new Date();
	};

	this.kill = function(callback, force) {
		clearTimeout(self.hangTimeout);

		if (this.pid) {
			this.manualExit = true;
			this.killCallback = callback;

			if (force || this.forceKill) {
				if (os.platform() == "win32") {
					exec("taskkill /F /T /PID " + this.pid);
				} else {
					if (this.pname) {
						exec("killall -9 " + this.pname);
					} else {
						exec("kill -9 " + this.pid);
					}
				}
			} else {
				processInst.kill();
			}
		} else {
			callback();
		}
	};
};

exports.createBrowser = function(settings) {
	return new Browser(settings);
};