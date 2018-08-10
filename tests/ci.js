require("shelljs/global");
var _ = require("lodash");
var fs = require("fs-extra");
var path = require("path");
var spawn = require("cross-spawn");

var filename = __filename.replace(__dirname + "/", "");
var elmTest = "elm-test";

function run(testFile) {
  if (!testFile) {
    var cmd = [elmTest, "--color"].join(" ");

    echo("Running: " + cmd);
    return exec(cmd).code;
  } else {
    var cmd = [elmTest, testFile, "--color"].join(" ");

    echo("Running: " + cmd);
    return exec(cmd).code;
  }
}

function assertTestErrored(testfile) {
  var code = run(testfile);
  if (code !== 1) {
    exec(
      "echo " +
        filename +
        ": error: " +
        (testfile ? testfile + ": " : "") +
        "expected tests to exit with ERROR exit code, not exit code" +
        code +
        " >&2"
    );
    exit(1);
  }
}

function assertTestIncomplete(testfile) {
  var code = run(testfile);
  if (code !== 3) {
    exec(
      "echo " +
        filename +
        ": error: " +
        (testfile ? testfile + ": " : "") +
        "expected tests to exit with INCOMPLETE exit code, not exit code" +
        code +
        " >&2"
    );
    exit(1);
  }
}

function assertTestFailure(testfile) {
  var code = run(testfile);
  if (code < 2) {
    exec(
      "echo " +
        filename +
        ": error: " +
        (testfile ? testfile + ": " : "") +
        "expected tests to fail >&2"
    );
    exit(1);
  }
}

function assertTestSuccess(testFile) {
  var code = run(testFile);
  if (code !== 0) {
    exec(
      "echo " +
        filename +
        ": ERROR: " +
        (testFile ? testFile + ": " : "") +
        "Expected tests to pass >&2"
    );
    exit(1);
  }
}

echo(filename + ": Uninstalling old elm-test...");
exec("npm remove --ignore-scripts=false --global " + elmTest);

echo(filename + ": Installing elm-test...");
exec("npm link --ignore-scripts=false");

var interfacePath = require("elmi-to-json").paths["elmi-to-json"];

echo(filename + ": Verifying installed elmi-to-json...");
var interfaceResult = spawn.sync(interfacePath, ["--help"]);
var interfaceExitCode = interfaceResult.status;

if (interfaceExitCode !== 0) {
  echo(
    filename +
      ": Failed because `elmi-to-json` is present, but `elmi-to-json --help` returned with exit code " +
      interfaceExitCode
  );
  echo(interfaceResult.stdout.toString());
  echo(interfaceResult.stderr.toString());
  exit(1);
}

echo(filename + ": Verifying installed elm-test version...");
exec(elmTest + " --version");

echo("### Testing elm-test on example-application/");

cd("example-application");

assertTestSuccess(path.join("tests", "*Pass*"));
assertTestFailure(path.join("tests", "*Fail*"));
assertTestFailure();

cd("../");

echo("### Testing elm-test on example-package/");

cd("example-package");

assertTestSuccess(path.join("tests", "*Pass*"));
assertTestFailure(path.join("tests", "*Fail*"));
assertTestFailure();

cd("../");

ls("tests/*.elm").forEach(function(testToRun) {
  if (/Passing\.elm$/.test(testToRun)) {
    echo("\n### Testing " + testToRun + " (expecting it to pass)\n");
    assertTestSuccess(testToRun);
  } else if (/Failing\.elm$/.test(testToRun)) {
    echo("\n### Testing " + testToRun + " (expecting it to fail)\n");
    assertTestFailure(testToRun);
  } else if (/PortRuntimeException\.elm$/.test(testToRun)) {
    echo("\n### TODO " + testToRun + " (Elm 0.19 beta allows multiple ports with the same name?)");
    return;
    echo(
      "\n### Testing " +
        testToRun +
        " (expecting it to error with a runtime exception)\n"
    );
    assertTestErrored(testToRun);
  } else if (/Port\d\.elm$/.test(testToRun)){
    echo("\n### Skipping " + testToRun + " (helper file)\n");
    return;
  } else {
    echo(
      "Tried to run " +
        testToRun +
        ' but it has an invalid filename; node-test-runner tests should fit the pattern "*Passing.elm" or "*Failing.elm"'
    );
    process.exit(1);
  }
});

echo("### Testing elm-test init && elm-test");
rm("-Rf", "tmp");
mkdir("-p", "tmp");
cd("tmp");
exec(elmTest + " init --yes");
assertTestIncomplete();

cd("..");

echo("\n### Testing elm-test init on a non-empty directory\n");
rm("-Rf", "tmp");
cp("-R", "tests/init-test", "tmp");
cd("tmp");
exec(elmTest + " init --yes");
assertTestIncomplete();

cd("..");
rm("-Rf", "tmp");

echo("");
echo(filename + ": Everything looks good!");
echo("                                                            ");
echo("  __   ,_   _  __,  -/-     ,         __   __   _   ,    ,  ");
echo("_(_/__/ (__(/_(_/(__/_    _/_)__(_/__(_,__(_,__(/__/_)__/_)_");
echo(" _/_                                                        ");
echo("(/                                                          ");
