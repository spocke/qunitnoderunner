qunitnoderunner
================
This is a NodeJS application that runs qunit tests in various browsers and writes the test results to JUnit XML files to be used in Jenkins or other build servers.

Command line usage
-------------------
	Usage: node qunitnoderunner [options] <testfile>

	Options:
	  -v, --version        print qunitnoderunner version
	  --verbose            verbose output
	  --port               http port to pass the test restuls to
	  --path               path to the wwwroot of the node server
	  --timeout            max time to wait for a test to complete
	  --reportdir          path where the junit xml files will be written
	  --config             config file to use defaults to ~/.qunitnoderunner"
