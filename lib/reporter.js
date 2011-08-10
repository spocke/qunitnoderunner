var fs = require("fs"),
	xmlwriter = require("./xmlwriter"),
	path = require("path");

function Report(file, browser_name, verbose) {
	var testSuites = [], currentTestSuite, currentTestCase, indent = [];

	this.add = function(data) {
		switch (data.event) {
			case "begin":
				currentTestSuite = {
					name: data.name,
					testcases: [],
					failures: 0,
					tests: 0,
					time: 0,
					stdout : '',
					stderr : ''
				};

				testSuites.push(currentTestSuite);

				if (testSuites.length > 1) {
					this.info('');
				}

				this.info(data.name);
				break;

			case "moduleStart":
				currentTestSuite.name += ' - ' + data.name;
				indent.push(' ');
				this.info(data.name);
				break;
	
			case "moduleDone":
				indent.pop();
				break;

			case "testStart":
				currentTestCase = {
					name: data.name,
					failures: [],
					start: new Date
				};

				currentTestSuite.testcases.push(currentTestCase);
				assertCount = 0;
				indent.push(' ');
				this.info(data.name);
				break;

			case "testDone":
				currentTestCase.failed = data.failed;
				currentTestCase.total = data.total;
				currentTestSuite.failures += parseInt(data.failed);
				currentTestSuite.tests++;
				indent.pop();
				break;

			case "log":
				var message = message = '[' + (++assertCount) + '] ';

				if (typeof(data.expected) != "undefined") {
					message += "Expected: " + data.expected + ", got: " + data.actual;
				} else {
					message += "Expected: true, got: " + data.result;
				}

				if (data.message) {
					message += ', message: ' + data.message;
				}

				if (data.result === "false") {
					currentTestCase.failures.push(message);
				}

				this.info(' ' + (data.result === "true" ? '[PASSED]' : '[FAILED]') + ' ' + message);

				break;
				
			case "done":
				break;
		}

		//console.log(data);
	};

	this.err = function(message) {
		var line = indent.join('') + message;

		if (verbose) {
			console.error(line);
		}

		if (currentTestSuite) {
			currentTestSuite.stderr += line + '\n';
		}
	};

	this.info = function(message) {
		var line = indent.join('') + message;

		if (verbose) {
			console.log(line);
		}

		if (currentTestSuite) {
			currentTestSuite.stdout += line + '\n';
		}
	};
	
	this.close = function() {
		function ISODateString(d) {
			function pad(n) {
				return n < 10 ? '0' + n : n
			};

			return d.getUTCFullYear() + '-'
				+ pad(d.getUTCMonth() + 1)+'-'
				+ pad(d.getUTCDate()) + 'T'
				+ pad(d.getUTCHours()) + ':'
				+ pad(d.getUTCMinutes()) + ':'
				+ pad(d.getUTCSeconds()) + 'Z'
		};

		// Generate XML report
		var xmlWriter = xmlwriter.createXmlWriter({
			linebreak_at : "testsuites,testsuite,testcase,failure,system-out,system-err"
		});

		xmlWriter.start('testsuites');

		var now = new Date();

		testSuites.forEach(function(testsuite, index) {
			// Calculate time
			testsuite.testcases.forEach(function(testcase) {
				testcase.time = (now.getTime() - testcase.start.getTime()) / 1000;
				testsuite.time += testcase.time;
			});

			xmlWriter.start('testsuite', {
				id: "" + index,
				name: "[" + browser_name + "] "+ testsuite.name,
				errors: "0",
				failures: testsuite.failures,
				hostname: "localhost",
				tests: testsuite.tests,
				time: Math.round(testsuite.time * 1000) / 1000,
				timestamp: ISODateString(now)
			});

			testsuite.testcases.forEach(function(testcase) {
				xmlWriter.start('testcase', {
					name: testcase.name,
					total: testcase.total,
					failed: testcase.failed,
					time: Math.round(testcase.time * 1000) / 1000
				});

				testcase.failures.forEach(function(failure) {
					xmlWriter.start('failure', {type: "AssertionFailedError", message: failure}, true);
				});

				xmlWriter.end('testcase');
			});

			if (testsuite.stdout) {
				xmlWriter.start('system-out');
				xmlWriter.cdata('\n' + testsuite.stdout);
				xmlWriter.end('system-out');
			}

			if (testsuite.stderr) {
				xmlWriter.start('system-err');
				xmlWriter.cdata('\n' + testsuite.stderr);
				xmlWriter.end('system-err');
			}

			xmlWriter.end('testsuite');
		});

		xmlWriter.end('testsuites');

		// Remove existing report
		if (path.existsSync(file)) {
			fs.unlinkSync(file);
		}

		// Write report XML to file
		fs.writeFileSync(file, xmlWriter.getString());
	};
};

exports.createReport = function(path, browser_name, verbose) {
	return new Report(path, browser_name, verbose);
};
