var http = require('http'),
	url = require('url'),
	path = require('path'),
	fs = require('fs'),
	mimetypes = require('./mimetypes');

function Server(settings) {
	this.start = function() {
		mimetypes.load(settings.mimetypes || path.join(__dirname, '/mimes.txt'));

		this.server = http.createServer();
		this.server.addListener("request", this.handleRequest);
		this.server.listen(settings.port || 8088, settings.start);
	};

	this.handleRequest = function(request, response) {
		// Disable cache
		response.setHeader('Expires', '0');
		response.setHeader('Cache-Control', 'must-revalidate, post-check=0, pre-check=0');
		response.setHeader('Cache-Control', 'private');

		// Process custom logic or default to serving static files
		if (settings.process(request, response)) {
			
		} else {
			// Serve static files
			var urlParts = url.parse(request.url);
			var absFilePath = path.resolve(path.join(settings.path, urlParts.pathname));

			// Send back back static file
			if (path.existsSync(absFilePath)) {
				response.writeHead(200, {
					'Content-Type': mimetypes.get(absFilePath)
				});

				response.end(fs.readFileSync(absFilePath));
			} else {
				response.writeHead(404, {
					'Content-Type': 'text/plain'
				});

				response.end('404 Page not found: ' + absFilePath + '.\n');
			}
		}
	};

	this.on = function(name, cb) {
		this.server.on(name, cb);
	};
	
	this.close = function() {
		this.server.close();
	};
};

exports.createServer = function(settings) {
	return new Server(settings);
};