var cmdline = require("./cmdline.js"),
	server = require("./server.js"),
	fs = require("fs"),
	url = require("url"),
	path = require("path"),
	querystring = require("querystring"),
	reporter = require("./reporter"),
	config = require("./config"),
	browser = require("./browser");

exports.main = function(argv) {
	// Output help if specified or missing arguments
	if (cmdline.has('h,help') || cmdline.isEmpty()) {
		console.log([
			"Usage: node qunitnoderunner [options] <testfile>",
			"",
			"Options:",
			"  -v, --version        print qunitnoderunner version",
			"  --verbose            verbose output",
			"  --port               http port to pass the test restuls to",
			"  --path               path to the wwwroot of the node server",
			"  --timeout            max time to wait for a test to complete",
			"  --reportdir          path where the junit xml files will be written",
			"  --config             config file to use defaults to ~/qunitnoderunner.conf",
			"  --query              query string to add to each request"
		].join("\n"));

		process.exit(1);
	}

	// Get test file to run
	var testFile = cmdline.item(0);
	if (!testFile) {
		console.error("You must specify a test file to run.");
		process.exit(1);
	}

	// Parse config and test file
	var conf = config.createConfig(cmdline.get('config'));
	var browsers = conf.getObj('browsers'), baseUrl;
	var currentBrowser, report, testIndex = 0, browserName, serverInstance, browserInfo;
	var reportBaseUrl = 'http://localhost:' + conf.getNum('port', 8088) + '/qunitnoderunner/';
	var query = querystring.parse(conf.getStr("query", ""));
	var tests = parseTestsFile(testFile);

	// Convert test file path to url
	testFile = path.resolve(testFile);
	basePath = path.resolve(conf.getStr('path', '.'));
	if (testFile.indexOf(basePath) !== 0) {
		console.log('Specified test file must be within specified base path.');
		process.exit(1);
	} else {
		baseUrl = 'http://localhost:' + conf.getNum('port', 8088) + '/' + path.dirname(testFile.substr(basePath.length + 1)).replace(/\\/g, '/') + '/';
	}

	function runNextTest() {	
		// Are we done with all tests for this browser
		if (++testIndex > tests.length - 1 || !currentBrowser) {
			if (currentBrowser && currentBrowser.pid) {
				currentBrowser.kill(runNextTest);
				return;
			}

			if (report) {
				report.close();
			}

			// Get next browser
			browserInfo = browsers.shift();
			if (browserInfo) {
				var reportDir = conf.getStr('reportdir', 'reports');

				if (!path.existsSync(reportDir)) {
					fs.mkdirSync(reportDir, 0755);
				}

				testIndex = 0;
				report = reporter.createReport(path.join(reportDir, browserInfo.name + '.xml'), browserInfo.name, conf.getBool('verbose'));
				browserName = browserInfo.name;
				query.reporturl = reportBaseUrl + browserInfo.name + '/' + testIndex;

				currentBrowser = browser.createBrowser({
					path: browserInfo.path,
					timeout: conf.getStr("timeout", "5m"),
					url: url.resolve(conf.getStr("baseurl", baseUrl), tests[testIndex].url) + "?" + querystring.stringify(query),

					crashed: function() {
						console.error(browserInfo.name + ' crashed.');
						process.exit(1);
					},

					hanged: function() {
						console.error(browserInfo.name + ' hanged.');
						process.exit(1);
					}
				});
			} else {
				currentBrowser.kill(function() {
					serverInstance.close();
					process.exit(0);
				});
			}
		} else {
			query.reporturl = reportBaseUrl + browserInfo.name + '/' + testIndex;

			return {
				url: url.resolve(conf.getStr("baseurl", baseUrl), tests[testIndex].url) + "?" + querystring.stringify(query)
			};
		}
	};

	// Start server that listens for unit test reports
	serverInstance = server.createServer({
		path: conf.getStr('path', '.'),
		port: conf.getNum('port', 8088),

		start: function() {
			runNextTest();
		},

		process: function(req, resp) {
			var urlParts = url.parse(req.url);

			if (urlParts.pathname == '/qunitnoderunner/' + browserInfo.name + '/' + testIndex) {
				var query = querystring.parse(urlParts.query);

				report.add(query);

				resp.writeHead(200, {
					'Content-Type': 'text/javascript'
				});

				if (query.event == "done") {
					resp.end('QUnitConnector.response(' + JSON.stringify(runNextTest()) + ');');
				} else {
					resp.end('QUnitConnector.response({});');
				}

				currentBrowser.touch();

				return true;
			}
		}
	});

	serverInstance.start();
};

function parseTestsFile(tests_file) {
	var tests = [];

	function provide(data) {
		if (data.url) {
			tests.push(data);
		} else if (data.tests) {
			provide(data.tests);
		} else {
			for (var i = 0; i < data.length; i++) {
				provide(data[i]);
			}
		}
	};

	eval(fs.readFileSync(tests_file, 'UTF8'));

	return tests;
};