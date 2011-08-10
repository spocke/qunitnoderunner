var fs = require('fs'),
	mimeMap = {};

exports.load = function(mime_file) {
	var mimeData = fs.readFileSync(mime_file);
	var lines = ("" + mimeData).split(/\r?\n/);

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];

		if (!/^.*#/.test(line) || /^\s*$/.test(line)) {
			var parts = line.split(/(\t+)|( +)/);

			for (var c = 1; c < parts.length; c++) {
				mimeMap[parts[c]] = parts[0];
			}
		}
	}
};

exports.get = function(path) {
	var idx = path.lastIndexOf('.');

	if (idx !== -1) {
		return mimeMap[path.substr(idx + 1)] || 'application/octet-stream';
	}

	return 'application/octet-stream';
};
