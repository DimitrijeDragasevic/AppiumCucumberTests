"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMostRecentChromedriver = getMostRecentChromedriver;
exports.default = exports.CD_VER = exports.CHROMEDRIVER_CHROME_MAPPING = exports.Chromedriver = void 0;

require("source-map-support/register");

var _events = _interopRequireDefault(require("events"));

var _appiumBaseDriver = require("appium-base-driver");

var _child_process = _interopRequireDefault(require("child_process"));

var _appiumSupport = require("appium-support");

var _asyncbox = require("asyncbox");

var _teen_process = require("teen_process");

var _bluebird = _interopRequireDefault(require("bluebird"));

var _utils = require("./utils");

var _semver = _interopRequireDefault(require("semver"));

var _lodash = _interopRequireDefault(require("lodash"));

var _path = _interopRequireDefault(require("path"));

const log = _appiumSupport.logger.getLogger('Chromedriver');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 9515;
const CHROMEDRIVER_CHROME_MAPPING = {
  '2.46': '71.0.3578',
  '2.45': '70.0.0',
  '2.44': '69.0.3497',
  '2.43': '69.0.3497',
  '2.42': '68.0.3440',
  '2.41': '67.0.3396',
  '2.40': '66.0.3359',
  '2.39': '66.0.3359',
  '2.38': '65.0.3325',
  '2.37': '64.0.3282',
  '2.36': '63.0.3239',
  '2.35': '62.0.3202',
  '2.34': '61.0.3163',
  '2.33': '60.0.3112',
  '2.32': '59.0.3071',
  '2.31': '58.0.3029',
  '2.30': '58.0.3029',
  '2.29': '57.0.2987',
  '2.28': '55.0.2883',
  '2.27': '54.0.2840',
  '2.26': '53.0.2785',
  '2.25': '53.0.2785',
  '2.24': '52.0.2743',
  '2.23': '51.0.2704',
  '2.22': '49.0.2623',
  '2.21': '46.0.2490',
  '2.20': '43.0.2357',
  '2.19': '43.0.2357',
  '2.18': '43.0.2357',
  '2.17': '42.0.2311',
  '2.16': '42.0.2311',
  '2.15': '40.0.2214',
  '2.14': '39.0.2171',
  '2.13': '38.0.2125',
  '2.12': '36.0.1985',
  '2.11': '36.0.1985',
  '2.10': '33.0.1751',
  '2.9': '31.0.1650',
  '2.8': '30.0.1573',
  '2.7': '30.0.1573',
  '2.6': '29.0.1545',
  '2.5': '29.0.1545',
  '2.4': '29.0.1545',
  '2.3': '28.0.1500',
  '2.2': '27.0.1453',
  '2.1': '27.0.1453',
  '2.0': '27.0.1453'
};
exports.CHROMEDRIVER_CHROME_MAPPING = CHROMEDRIVER_CHROME_MAPPING;
const CHROME_BUNDLE_ID = 'com.android.chrome';
const WEBVIEW_BUNDLE_IDS = ['com.google.android.webview', 'com.android.webview'];
const CHROMEDRIVER_TUTORIAL = 'https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/web/chromedriver.md';
const CD_VER = process.env.npm_config_chromedriver_version || process.env.CHROMEDRIVER_VERSION || getMostRecentChromedriver();
exports.CD_VER = CD_VER;
const CD_VERSION_TIMEOUT = 5000;

function getMostRecentChromedriver(mapping = CHROMEDRIVER_CHROME_MAPPING) {
  if (_lodash.default.isEmpty(mapping)) {
    throw new Error('Unable to get most recent Chromedriver from empty mapping');
  }

  return _lodash.default.keys(mapping).map(_semver.default.coerce).sort(_semver.default.rcompare).map(v => `${_semver.default.major(v)}.${_semver.default.minor(v)}`)[0];
}

class Chromedriver extends _events.default.EventEmitter {
  constructor(args = {}) {
    super();
    const {
      host = DEFAULT_HOST,
      port = DEFAULT_PORT,
      useSystemExecutable = false,
      executable,
      executableDir = (0, _utils.getChromedriverDir)(),
      bundleId,
      mappingPath,
      cmdArgs,
      adb,
      verbose,
      logPath,
      disableBuildCheck
    } = args;
    this.proxyHost = host;
    this.proxyPort = port;
    this.adb = adb;
    this.cmdArgs = cmdArgs;
    this.proc = null;
    this.useSystemExecutable = useSystemExecutable;
    this.chromedriver = executable;
    this.executableDir = executableDir;
    this.mappingPath = mappingPath;
    this.bundleId = bundleId;
    this.executableVerified = false;
    this.state = Chromedriver.STATE_STOPPED;
    this.jwproxy = new _appiumBaseDriver.JWProxy({
      server: this.proxyHost,
      port: this.proxyPort
    });
    this.verbose = verbose;
    this.logPath = logPath;
    this.disableBuildCheck = !!disableBuildCheck;
  }

  async getMapping() {
    let mapping = CHROMEDRIVER_CHROME_MAPPING;

    if (this.mappingPath) {
      log.debug(`Attempting to use Chromedriver-Chrome mapping from '${this.mappingPath}'`);

      if (!(await _appiumSupport.fs.exists(this.mappingPath))) {
        log.warn(`No file found at '${this.mappingPath}'. Using default mapping`);
      } else {
        try {
          mapping = JSON.parse((await _appiumSupport.fs.readFile(this.mappingPath)));
        } catch (err) {
          log.error(`Error parsing mapping from '${this.mappingPath}': ${err.message}`);
          log.warn('Using default mapping');
        }
      }
    }

    for (const [cdVersion, chromeVersion] of _lodash.default.toPairs(mapping)) {
      mapping[cdVersion] = _semver.default.coerce(chromeVersion);
    }

    return mapping;
  }

  async getChromedrivers(mapping) {
    const executables = await _appiumSupport.fs.glob(`${this.executableDir}/*`);
    log.debug(`Found ${executables.length} executable${executables.length === 1 ? '' : 's'} ` + `in '${this.executableDir}'`);
    const cds = (await (0, _asyncbox.asyncmap)(executables, async function (executable) {
      const logError = ({
        message,
        stdout = null,
        stderr = null
      }) => {
        let errMsg = `Cannot retrieve version number from '${_path.default.basename(executable)}' Chromedriver binary. ` + `Make sure it returns a valid version string in response to '--version' command line argument. ${message}`;

        if (stdout) {
          errMsg += `\nStdout: ${stdout}`;
        }

        if (stderr) {
          errMsg += `\nStderr: ${stderr}`;
        }

        log.warn(errMsg);
        return null;
      };

      let stdout;
      let stderr;

      try {
        ({
          stdout,
          stderr
        } = await (0, _teen_process.exec)(executable, ['--version'], {
          timeout: CD_VERSION_TIMEOUT
        }));
      } catch (err) {
        if (!(err.message || '').includes('timed out') && !(err.stdout || '').includes('Starting ChromeDriver')) {
          return logError(err);
        }

        stdout = err.stdout;
      }

      const match = /ChromeDriver\s+\(?v?([\d.]+)\)?/i.exec(stdout);

      if (!match) {
        return logError({
          message: 'Cannot parse the version string',
          stdout,
          stderr
        });
      }

      const versionObj = _semver.default.coerce(match[1], true);

      if (!versionObj) {
        return logError({
          message: 'Cannot coerce the version number',
          stdout,
          stderr
        });
      }

      const version = `${versionObj.major}.${versionObj.minor}`;
      return {
        executable,
        version,
        minCDVersion: mapping[version]
      };
    })).filter(cd => !!cd).sort((a, b) => _semver.default.gte(_semver.default.coerce(b.version), _semver.default.coerce(a.version)) ? 1 : -1);

    if (_lodash.default.isEmpty(cds)) {
      log.errorAndThrow(`No Chromedrivers found in '${this.executableDir}'`);
    }

    log.debug(`The following Chromedriver executables were found:`);

    for (const cd of cds) {
      log.debug(`    ${cd.executable} (minimum Chrome version '${cd.minCDVersion ? cd.minCDVersion : 'Unknown'}')`);
    }

    return cds;
  }

  async getChromeVersion() {
    let chromeVersion;

    if (this.adb && (await this.adb.getApiLevel()) >= 24) {
      this.bundleId = CHROME_BUNDLE_ID;
    }

    if (!this.bundleId) {
      this.bundleId = CHROME_BUNDLE_ID;

      for (const bundleId of WEBVIEW_BUNDLE_IDS) {
        chromeVersion = await (0, _utils.getChromeVersion)(this.adb, bundleId);

        if (chromeVersion) {
          this.bundleId = bundleId;
          break;
        }
      }
    }

    if (!chromeVersion) {
      chromeVersion = await (0, _utils.getChromeVersion)(this.adb, this.bundleId);
    }

    return chromeVersion ? _semver.default.coerce(chromeVersion) : null;
  }

  async getCompatibleChromedriver() {
    if (!this.adb) {
      return await (0, _utils.getChromedriverBinaryPath)();
    }

    const mapping = await this.getMapping();
    const cds = await this.getChromedrivers(mapping);

    if (this.disableBuildCheck) {
      const cd = cds[0];
      log.warn(`Chrome build check disabled. Using most recent Chromedriver version (${cd.version}, at '${cd.executable}')`);
      log.warn(`If this is wrong, set 'chromedriverDisableBuildCheck' capability to 'false'`);
      return cd.executable;
    }

    const chromeVersion = await this.getChromeVersion();

    if (!chromeVersion) {
      let cd = cds[0];
      log.warn(`Unable to discover Chrome version. Using Chromedriver ${cd.version} at '${cd.executable}'`);
      return cd.executable;
    }

    log.debug(`Found Chrome bundle '${this.bundleId}' version '${chromeVersion}'`);

    if (_semver.default.gt(chromeVersion, _lodash.default.values(mapping)[0]) && !_lodash.default.isUndefined(cds[0]) && _lodash.default.isUndefined(cds[0].minCDVersion)) {
      let cd = cds[0];
      log.warn(`No known Chromedriver available to automate Chrome version '${chromeVersion}'.\n` + `Using Chromedriver version '${cd.version}', which has not been tested with Appium.`);
      return cd.executable;
    }

    const workingCds = cds.filter(cd => {
      return !_lodash.default.isUndefined(cd.minCDVersion) && _semver.default.gte(chromeVersion, cd.minCDVersion);
    });

    if (_lodash.default.isEmpty(workingCds)) {
      log.errorAndThrow(`No Chromedriver found that can automate Chrome '${chromeVersion}'. ` + `See ${CHROMEDRIVER_TUTORIAL} for more details.`);
    }

    const binPath = workingCds[0].executable;
    log.debug(`Found ${workingCds.length} Chromedriver executable${workingCds.length === 1 ? '' : 's'} ` + `capable of automating Chrome '${chromeVersion}'.\n` + `Choosing the most recent, '${binPath}'.`);
    log.debug('If a specific version is required, specify it with the `chromedriverExecutable`' + 'desired capability.');
    return binPath;
  }

  async initChromedriverPath() {
    if (this.executableVerified) return;

    if (!this.chromedriver) {
      this.chromedriver = this.useSystemExecutable ? await (0, _utils.getChromedriverBinaryPath)() : await this.getCompatibleChromedriver();
    }

    if (!(await _appiumSupport.fs.exists(this.chromedriver))) {
      throw new Error(`Trying to use a chromedriver binary at the path ` + `${this.chromedriver}, but it doesn't exist!`);
    }

    this.executableVerified = true;
    log.info(`Set chromedriver binary as: ${this.chromedriver}`);
  }

  async start(caps, emitStartingState = true) {
    this.capabilities = _lodash.default.cloneDeep(caps);
    this.capabilities.loggingPrefs = this.capabilities.loggingPrefs || {};

    if (_lodash.default.isEmpty(this.capabilities.loggingPrefs.browser)) {
      this.capabilities.loggingPrefs.browser = 'ALL';
    }

    if (emitStartingState) {
      this.changeState(Chromedriver.STATE_STARTING);
    }

    let args = ['--url-base=wd/hub', `--port=${this.proxyPort}`];

    if (this.adb && this.adb.adbPort) {
      args = args.concat([`--adb-port=${this.adb.adbPort}`]);
    }

    if (this.cmdArgs) {
      args = args.concat(this.cmdArgs);
    }

    if (this.logPath) {
      args = args.concat([`--log-path=${this.logPath}`]);
    }

    if (this.disableBuildCheck) {
      args = args.concat(['--disable-build-check']);
    }

    args = args.concat(['--verbose']);

    const startDetector = stdout => {
      return stdout.indexOf('Starting ') === 0;
    };

    let processIsAlive = false;
    let webviewVersion;

    try {
      await this.initChromedriverPath();
      await this.killAll();
      this.proc = new _teen_process.SubProcess(this.chromedriver, args);
      processIsAlive = true;
      this.proc.on('output', (stdout, stderr) => {
        const out = stdout + stderr;
        let match = /"Browser": "(.*)"/.exec(out);

        if (match) {
          webviewVersion = match[1];
          log.debug(`Webview version: '${webviewVersion}'`);
        }

        match = /Starting ChromeDriver ([.\d]+)/.exec(out);

        if (match) {
          log.debug(`Chromedriver version: '${match[1]}'`);
        }

        if (this.verbose) {
          for (let line of (stdout || '').trim().split('\n')) {
            if (!line.trim().length) continue;
            log.debug(`[STDOUT] ${line}`);
          }

          for (let line of (stderr || '').trim().split('\n')) {
            if (!line.trim().length) continue;
            log.error(`[STDERR] ${line}`);
          }
        }
      });
      this.proc.on('exit', (code, signal) => {
        processIsAlive = false;

        if (this.state !== Chromedriver.STATE_STOPPED && this.state !== Chromedriver.STATE_STOPPING && this.state !== Chromedriver.STATE_RESTARTING) {
          let msg = `Chromedriver exited unexpectedly with code ${code}, ` + `signal ${signal}`;
          log.error(msg);
          this.changeState(Chromedriver.STATE_STOPPED);
        }
      });
      log.info(`Spawning chromedriver with: ${this.chromedriver} ` + `${args.join(' ')}`);
      await this.proc.start(startDetector);
      await this.waitForOnline();
      await this.startSession();
    } catch (e) {
      this.emit(Chromedriver.EVENT_ERROR, e);

      if (processIsAlive) {
        await this.proc.stop();
      }

      let message = '';

      if (e.message.includes('Chrome version must be')) {
        message += 'Unable to automate Chrome version because it is too old for this version of Chromedriver.\n';

        if (webviewVersion) {
          message += `Chrome version on the device: ${webviewVersion}\n`;
        }

        message += `Visit '${CHROMEDRIVER_TUTORIAL}' to troubleshoot the problem.\n`;
      }

      message += e.message;
      log.errorAndThrow(message);
    }
  }

  sessionId() {
    if (this.state !== Chromedriver.STATE_ONLINE) {
      return null;
    }

    return this.jwproxy.sessionId;
  }

  async restart() {
    log.info('Restarting chromedriver');

    if (this.state !== Chromedriver.STATE_ONLINE) {
      throw new Error("Can't restart when we're not online");
    }

    this.changeState(Chromedriver.STATE_RESTARTING);
    await this.stop(false);
    await this.start(this.capabilities, false);
  }

  async waitForOnline() {
    let chromedriverStopped = false;
    await (0, _asyncbox.retryInterval)(20, 200, async () => {
      if (this.state === Chromedriver.STATE_STOPPED) {
        chromedriverStopped = true;
        return;
      }

      await this.getStatus();
    });

    if (chromedriverStopped) {
      throw new Error('ChromeDriver crashed during startup.');
    }
  }

  async getStatus() {
    return await this.jwproxy.command('/status', 'GET');
  }

  async startSession() {
    await (0, _asyncbox.retryInterval)(4, 200, async () => {
      try {
        let res = await this.jwproxy.command('/session', 'POST', {
          desiredCapabilities: this.capabilities
        });

        if (res.status) {
          throw new Error(res.value.message);
        }
      } catch (err) {
        log.errorAndThrow(`Failed to start Chromedriver session: ${err.message}`);
      }
    });
    this.changeState(Chromedriver.STATE_ONLINE);
  }

  async stop(emitStates = true) {
    if (emitStates) {
      this.changeState(Chromedriver.STATE_STOPPING);
    }

    try {
      await this.jwproxy.command('', 'DELETE');
      await this.proc.stop('SIGTERM', 20000);

      if (emitStates) {
        this.changeState(Chromedriver.STATE_STOPPED);
      }
    } catch (e) {
      log.error(e);
    }
  }

  changeState(state) {
    this.state = state;
    log.debug(`Changed state to '${state}'`);
    this.emit(Chromedriver.EVENT_CHANGED, {
      state
    });
  }

  async sendCommand(url, method, body) {
    return await this.jwproxy.command(url, method, body);
  }

  async proxyReq(req, res) {
    return await this.jwproxy.proxyReqRes(req, res);
  }

  async killAll() {
    let cmd = _appiumSupport.system.isWindows() ? `wmic process where "commandline like '%chromedriver.exe%--port=${this.proxyPort}%'" delete` : `pkill -15 -f "${this.chromedriver}.*--port=${this.proxyPort}"`;
    log.debug(`Killing any old chromedrivers, running: ${cmd}`);

    try {
      await _bluebird.default.promisify(_child_process.default.exec)(cmd);
      log.debug('Successfully cleaned up old chromedrivers');
    } catch (err) {
      log.warn('No old chromedrivers seem to exist');
    }

    if (this.adb) {
      log.debug(`Cleaning any old adb forwarded port socket connections`);

      try {
        for (let conn of await this.adb.getForwardList()) {
          if (conn.indexOf('webview_devtools') !== -1) {
            let params = conn.split(/\s+/);

            if (params.length > 1) {
              await this.adb.removePortForward(params[1].replace(/[\D]*/, ''));
            }
          }
        }
      } catch (err) {
        log.warn(`Unable to clean forwarded ports. Error: '${err.message}'. Continuing.`);
      }
    }
  }

  async hasWorkingWebview() {
    try {
      await this.jwproxy.command('/url', 'GET');
      return true;
    } catch (e) {
      return false;
    }
  }

}

exports.Chromedriver = Chromedriver;
Chromedriver.EVENT_ERROR = 'chromedriver_error';
Chromedriver.EVENT_CHANGED = 'stateChanged';
Chromedriver.STATE_STOPPED = 'stopped';
Chromedriver.STATE_STARTING = 'starting';
Chromedriver.STATE_ONLINE = 'online';
Chromedriver.STATE_STOPPING = 'stopping';
Chromedriver.STATE_RESTARTING = 'restarting';
var _default = Chromedriver;
exports.default = _default;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9jaHJvbWVkcml2ZXIuanMiXSwibmFtZXMiOlsibG9nIiwibG9nZ2VyIiwiZ2V0TG9nZ2VyIiwiREVGQVVMVF9IT1NUIiwiREVGQVVMVF9QT1JUIiwiQ0hST01FRFJJVkVSX0NIUk9NRV9NQVBQSU5HIiwiQ0hST01FX0JVTkRMRV9JRCIsIldFQlZJRVdfQlVORExFX0lEUyIsIkNIUk9NRURSSVZFUl9UVVRPUklBTCIsIkNEX1ZFUiIsInByb2Nlc3MiLCJlbnYiLCJucG1fY29uZmlnX2Nocm9tZWRyaXZlcl92ZXJzaW9uIiwiQ0hST01FRFJJVkVSX1ZFUlNJT04iLCJnZXRNb3N0UmVjZW50Q2hyb21lZHJpdmVyIiwiQ0RfVkVSU0lPTl9USU1FT1VUIiwibWFwcGluZyIsIl8iLCJpc0VtcHR5IiwiRXJyb3IiLCJrZXlzIiwibWFwIiwic2VtdmVyIiwiY29lcmNlIiwic29ydCIsInJjb21wYXJlIiwidiIsIm1ham9yIiwibWlub3IiLCJDaHJvbWVkcml2ZXIiLCJldmVudHMiLCJFdmVudEVtaXR0ZXIiLCJjb25zdHJ1Y3RvciIsImFyZ3MiLCJob3N0IiwicG9ydCIsInVzZVN5c3RlbUV4ZWN1dGFibGUiLCJleGVjdXRhYmxlIiwiZXhlY3V0YWJsZURpciIsImJ1bmRsZUlkIiwibWFwcGluZ1BhdGgiLCJjbWRBcmdzIiwiYWRiIiwidmVyYm9zZSIsImxvZ1BhdGgiLCJkaXNhYmxlQnVpbGRDaGVjayIsInByb3h5SG9zdCIsInByb3h5UG9ydCIsInByb2MiLCJjaHJvbWVkcml2ZXIiLCJleGVjdXRhYmxlVmVyaWZpZWQiLCJzdGF0ZSIsIlNUQVRFX1NUT1BQRUQiLCJqd3Byb3h5IiwiSldQcm94eSIsInNlcnZlciIsImdldE1hcHBpbmciLCJkZWJ1ZyIsImZzIiwiZXhpc3RzIiwid2FybiIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlIiwiZXJyIiwiZXJyb3IiLCJtZXNzYWdlIiwiY2RWZXJzaW9uIiwiY2hyb21lVmVyc2lvbiIsInRvUGFpcnMiLCJnZXRDaHJvbWVkcml2ZXJzIiwiZXhlY3V0YWJsZXMiLCJnbG9iIiwibGVuZ3RoIiwiY2RzIiwibG9nRXJyb3IiLCJzdGRvdXQiLCJzdGRlcnIiLCJlcnJNc2ciLCJwYXRoIiwiYmFzZW5hbWUiLCJ0aW1lb3V0IiwiaW5jbHVkZXMiLCJtYXRjaCIsImV4ZWMiLCJ2ZXJzaW9uT2JqIiwidmVyc2lvbiIsIm1pbkNEVmVyc2lvbiIsImZpbHRlciIsImNkIiwiYSIsImIiLCJndGUiLCJlcnJvckFuZFRocm93IiwiZ2V0Q2hyb21lVmVyc2lvbiIsImdldEFwaUxldmVsIiwiZ2V0Q29tcGF0aWJsZUNocm9tZWRyaXZlciIsImd0IiwidmFsdWVzIiwiaXNVbmRlZmluZWQiLCJ3b3JraW5nQ2RzIiwiYmluUGF0aCIsImluaXRDaHJvbWVkcml2ZXJQYXRoIiwiaW5mbyIsInN0YXJ0IiwiY2FwcyIsImVtaXRTdGFydGluZ1N0YXRlIiwiY2FwYWJpbGl0aWVzIiwiY2xvbmVEZWVwIiwibG9nZ2luZ1ByZWZzIiwiYnJvd3NlciIsImNoYW5nZVN0YXRlIiwiU1RBVEVfU1RBUlRJTkciLCJhZGJQb3J0IiwiY29uY2F0Iiwic3RhcnREZXRlY3RvciIsImluZGV4T2YiLCJwcm9jZXNzSXNBbGl2ZSIsIndlYnZpZXdWZXJzaW9uIiwia2lsbEFsbCIsIlN1YlByb2Nlc3MiLCJvbiIsIm91dCIsImxpbmUiLCJ0cmltIiwic3BsaXQiLCJjb2RlIiwic2lnbmFsIiwiU1RBVEVfU1RPUFBJTkciLCJTVEFURV9SRVNUQVJUSU5HIiwibXNnIiwiam9pbiIsIndhaXRGb3JPbmxpbmUiLCJzdGFydFNlc3Npb24iLCJlIiwiZW1pdCIsIkVWRU5UX0VSUk9SIiwic3RvcCIsInNlc3Npb25JZCIsIlNUQVRFX09OTElORSIsInJlc3RhcnQiLCJjaHJvbWVkcml2ZXJTdG9wcGVkIiwiZ2V0U3RhdHVzIiwiY29tbWFuZCIsInJlcyIsImRlc2lyZWRDYXBhYmlsaXRpZXMiLCJzdGF0dXMiLCJ2YWx1ZSIsImVtaXRTdGF0ZXMiLCJFVkVOVF9DSEFOR0VEIiwic2VuZENvbW1hbmQiLCJ1cmwiLCJtZXRob2QiLCJib2R5IiwicHJveHlSZXEiLCJyZXEiLCJwcm94eVJlcVJlcyIsImNtZCIsInN5c3RlbSIsImlzV2luZG93cyIsIkIiLCJwcm9taXNpZnkiLCJjcCIsImNvbm4iLCJnZXRGb3J3YXJkTGlzdCIsInBhcmFtcyIsInJlbW92ZVBvcnRGb3J3YXJkIiwicmVwbGFjZSIsImhhc1dvcmtpbmdXZWJ2aWV3Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFFQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFHQSxNQUFNQSxHQUFHLEdBQUdDLHNCQUFPQyxTQUFQLENBQWlCLGNBQWpCLENBQVo7O0FBRUEsTUFBTUMsWUFBWSxHQUFHLFdBQXJCO0FBQ0EsTUFBTUMsWUFBWSxHQUFHLElBQXJCO0FBQ0EsTUFBTUMsMkJBQTJCLEdBQUc7QUFFbEMsVUFBUSxXQUYwQjtBQUdsQyxVQUFRLFFBSDBCO0FBSWxDLFVBQVEsV0FKMEI7QUFLbEMsVUFBUSxXQUwwQjtBQU1sQyxVQUFRLFdBTjBCO0FBT2xDLFVBQVEsV0FQMEI7QUFRbEMsVUFBUSxXQVIwQjtBQVNsQyxVQUFRLFdBVDBCO0FBVWxDLFVBQVEsV0FWMEI7QUFXbEMsVUFBUSxXQVgwQjtBQVlsQyxVQUFRLFdBWjBCO0FBYWxDLFVBQVEsV0FiMEI7QUFjbEMsVUFBUSxXQWQwQjtBQWVsQyxVQUFRLFdBZjBCO0FBZ0JsQyxVQUFRLFdBaEIwQjtBQWlCbEMsVUFBUSxXQWpCMEI7QUFrQmxDLFVBQVEsV0FsQjBCO0FBbUJsQyxVQUFRLFdBbkIwQjtBQW9CbEMsVUFBUSxXQXBCMEI7QUFxQmxDLFVBQVEsV0FyQjBCO0FBc0JsQyxVQUFRLFdBdEIwQjtBQXVCbEMsVUFBUSxXQXZCMEI7QUF3QmxDLFVBQVEsV0F4QjBCO0FBeUJsQyxVQUFRLFdBekIwQjtBQTBCbEMsVUFBUSxXQTFCMEI7QUEyQmxDLFVBQVEsV0EzQjBCO0FBNEJsQyxVQUFRLFdB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LE1BQXJCLEVBQTZCLEtBQTdCLENBQU47QUFDQSxhQUFPLElBQVA7QUFDRCxLQUhELENBR0UsT0FBT1QsQ0FBUCxFQUFVO0FBQ1YsYUFBTyxLQUFQO0FBQ0Q7QUFDRjs7QUExZDRDOzs7QUE2ZC9DekcsWUFBWSxDQUFDMkcsV0FBYixHQUEyQixvQkFBM0I7QUFDQTNHLFlBQVksQ0FBQ3dILGFBQWIsR0FBNkIsY0FBN0I7QUFDQXhILFlBQVksQ0FBQ3VCLGFBQWIsR0FBNkIsU0FBN0I7QUFDQXZCLFlBQVksQ0FBQ21GLGNBQWIsR0FBOEIsVUFBOUI7QUFDQW5GLFlBQVksQ0FBQzhHLFlBQWIsR0FBNEIsUUFBNUI7QUFDQTlHLFlBQVksQ0FBQ21HLGNBQWIsR0FBOEIsVUFBOUI7QUFDQW5HLFlBQVksQ0FBQ29HLGdCQUFiLEdBQWdDLFlBQWhDO2VBS2VwRyxZIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHJhbnNwaWxlOm1haW5cblxuaW1wb3J0IGV2ZW50cyBmcm9tICdldmVudHMnO1xuaW1wb3J0IHsgSldQcm94eSB9IGZyb20gJ2FwcGl1bS1iYXNlLWRyaXZlcic7XG5pbXBvcnQgY3AgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBzeXN0ZW0sIGZzLCBsb2dnZXIgfSBmcm9tICdhcHBpdW0tc3VwcG9ydCc7XG5pbXBvcnQgeyByZXRyeUludGVydmFsLCBhc3luY21hcCB9IGZyb20gJ2FzeW5jYm94JztcbmltcG9ydCB7IFN1YlByb2Nlc3MsIGV4ZWMgfSBmcm9tICd0ZWVuX3Byb2Nlc3MnO1xuaW1wb3J0IEIgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IHsgZ2V0Q2hyb21lVmVyc2lvbiwgZ2V0Q2hyb21lZHJpdmVyRGlyLCBnZXRDaHJvbWVkcml2ZXJCaW5hcnlQYXRoIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cblxuY29uc3QgbG9nID0gbG9nZ2VyLmdldExvZ2dlcignQ2hyb21lZHJpdmVyJyk7XG5cbmNvbnN0IERFRkFVTFRfSE9TVCA9ICcxMjcuMC4wLjEnO1xuY29uc3QgREVGQVVMVF9QT1JUID0gOTUxNTtcbmNvbnN0IENIUk9NRURSSVZFUl9DSFJPTUVfTUFQUElORyA9IHtcbiAgLy8gQ2hyb21lZHJpdmVyIHZlcnNpb246IG1pbnVtdW0gQ2hyb21lIHZlcnNpb25cbiAgJzIuNDYnOiAnNzEuMC4zNTc4JyxcbiAgJzIuNDUnOiAnNzAuMC4wJyxcbiAgJzIuNDQnOiAnNjkuMC4zNDk3JyxcbiAgJzIuNDMnOiAnNjkuMC4zNDk3JyxcbiAgJzIuNDInOiAnNjguMC4zNDQwJyxcbiAgJzIuNDEnOiAnNjcuMC4zMzk2JyxcbiAgJzIuNDAnOiAnNjYuMC4zMzU5JyxcbiAgJzIuMzknOiAnNjYuMC4zMzU5JyxcbiAgJzIuMzgnOiAnNjUuMC4zMzI1JyxcbiAgJzIuMzcnOiAnNjQuMC4zMjgyJyxcbiAgJzIuMzYnOiAnNjMuMC4zMjM5JyxcbiAgJzIuMzUnOiAnNjIuMC4zMjAyJyxcbiAgJzIuMzQnOiAnNjEuMC4zMTYzJyxcbiAgJzIuMzMnOiAnNjAuMC4zMTEyJyxcbiAgJzIuMzInOiAnNTkuMC4zMDcxJyxcbiAgJzIuMzEnOiAnNTguMC4zMDI5JyxcbiAgJzIuMzAnOiAnNTguMC4zMDI5JyxcbiAgJzIuMjknOiAnNTcuMC4yOTg3JyxcbiAgJzIuMjgnOiAnNTUuMC4yODgzJyxcbiAgJzIuMjcnOiAnNTQuMC4yODQwJyxcbiAgJzIuMjYnOiAnNTMuMC4yNzg1JyxcbiAgJzIuMjUnOiAnNTMuMC4yNzg1JyxcbiAgJzIuMjQnOiAnNTIuMC4yNzQzJyxcbiAgJzIuMjMnOiAnNTEuMC4yNzA0JyxcbiAgJzIuMjInOiAnNDkuMC4yNjIzJyxcbiAgJzIuMjEnOiAnNDYuMC4yNDkwJyxcbiAgJzIuMjAnOiAnNDMuMC4yMzU3JyxcbiAgJzIuMTknOiAnNDMuMC4yMzU3JyxcbiAgJzIuMTgnOiAnNDMuMC4yMzU3JyxcbiAgJzIuMTcnOiAnNDIuMC4yMzExJyxcbiAgJzIuMTYnOiAnNDIuMC4yMzExJyxcbiAgJzIuMTUnOiAnNDAuMC4yMjE0JyxcbiAgJzIuMTQnOiAnMzkuMC4yMTcxJyxcbiAgJzIuMTMnOiAnMzguMC4yMTI1JyxcbiAgJzIuMTInOiAnMzYuMC4xOTg1JyxcbiAgJzIuMTEnOiAnMzYuMC4xOTg1JyxcbiAgJzIuMTAnOiAnMzMuMC4xNzUxJyxcbiAgJzIuOSc6ICczMS4wLjE2NTAnLFxuICAnMi44JzogJzMwLjAuMTU3MycsXG4gICcyLjcnOiAnMzAuMC4xNTczJyxcbiAgJzIuNic6ICcyOS4wLjE1NDUnLFxuICAnMi41JzogJzI5LjAuMTU0NScsXG4gICcyLjQnOiAnMjkuMC4xNTQ1JyxcbiAgJzIuMyc6ICcyOC4wLjE1MDAnLFxuICAnMi4yJzogJzI3LjAuMTQ1MycsXG4gICcyLjEnOiAnMjcuMC4xNDUzJyxcbiAgJzIuMCc6ICcyNy4wLjE0NTMnLFxufTtcbmNvbnN0IENIUk9NRV9CVU5ETEVfSUQgPSAnY29tLmFuZHJvaWQuY2hyb21lJztcbmNvbnN0IFdFQlZJRVdfQlVORExFX0lEUyA9IFtcbiAgJ2NvbS5nb29nbGUuYW5kcm9pZC53ZWJ2aWV3JyxcbiAgJ2NvbS5hbmRyb2lkLndlYnZpZXcnLFxuXTtcbmNvbnN0IENIUk9NRURSSVZFUl9UVVRPUklBTCA9ICdodHRwczovL2dpdGh1Yi5jb20vYXBwaXVtL2FwcGl1bS9ibG9iL21hc3Rlci9kb2NzL2VuL3dyaXRpbmctcnVubmluZy1hcHBpdW0vd2ViL2Nocm9tZWRyaXZlci5tZCc7XG5cbmNvbnN0IENEX1ZFUiA9IHByb2Nlc3MuZW52Lm5wbV9jb25maWdfY2hyb21lZHJpdmVyX3ZlcnNpb24gfHxcbiAgICAgICAgICAgICAgIHByb2Nlc3MuZW52LkNIUk9NRURSSVZFUl9WRVJTSU9OIHx8XG4gICAgICAgICAgICAgICBnZXRNb3N0UmVjZW50Q2hyb21lZHJpdmVyKCk7XG5cbmNvbnN0IENEX1ZFUlNJT05fVElNRU9VVCA9IDUwMDA7XG5cbmZ1bmN0aW9uIGdldE1vc3RSZWNlbnRDaHJvbWVkcml2ZXIgKG1hcHBpbmcgPSBDSFJPTUVEUklWRVJfQ0hST01FX01BUFBJTkcpIHtcbiAgaWYgKF8uaXNFbXB0eShtYXBwaW5nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGdldCBtb3N0IHJlY2VudCBDaHJvbWVkcml2ZXIgZnJvbSBlbXB0eSBtYXBwaW5nJyk7XG4gIH1cbiAgcmV0dXJuIF8ua2V5cyhtYXBwaW5nKVxuICAgIC5tYXAoc2VtdmVyLmNvZXJjZSlcbiAgICAuc29ydChzZW12ZXIucmNvbXBhcmUpXG4gICAgLm1hcCgodikgPT4gYCR7c2VtdmVyLm1ham9yKHYpfS4ke3NlbXZlci5taW5vcih2KX1gKVswXTtcbn1cblxuY2xhc3MgQ2hyb21lZHJpdmVyIGV4dGVuZHMgZXZlbnRzLkV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yIChhcmdzID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgY29uc3Qge1xuICAgICAgaG9zdCA9IERFRkFVTFRfSE9TVCxcbiAgICAgIHBvcnQgPSBERUZBVUxUX1BPUlQsXG4gICAgICB1c2VTeXN0ZW1FeGVjdXRhYmxlID0gZmFsc2UsXG4gICAgICBleGVjdXRhYmxlLFxuICAgICAgZXhlY3V0YWJsZURpciA9IGdldENocm9tZWRyaXZlckRpcigpLFxuICAgICAgYnVuZGxlSWQsXG4gICAgICBtYXBwaW5nUGF0aCxcbiAgICAgIGNtZEFyZ3MsXG4gICAgICBhZGIsXG4gICAgICB2ZXJib3NlLFxuICAgICAgbG9nUGF0aCxcbiAgICAgIGRpc2FibGVCdWlsZENoZWNrLFxuICAgIH0gPSBhcmdzO1xuXG4gICAgdGhpcy5wcm94eUhvc3QgPSBob3N0O1xuICAgIHRoaXMucHJveHlQb3J0ID0gcG9ydDtcbiAgICB0aGlzLmFkYiA9IGFkYjtcbiAgICB0aGlzLmNtZEFyZ3MgPSBjbWRBcmdzO1xuICAgIHRoaXMucHJvYyA9IG51bGw7XG4gICAgdGhpcy51c2VTeXN0ZW1FeGVjdXRhYmxlID0gdXNlU3lzdGVtRXhlY3V0YWJsZTtcbiAgICB0aGlzLmNocm9tZWRyaXZlciA9IGV4ZWN1dGFibGU7XG4gICAgdGhpcy5leGVjdXRhYmxlRGlyID0gZXhlY3V0YWJsZURpcjtcbiAgICB0aGlzLm1hcHBpbmdQYXRoID0gbWFwcGluZ1BhdGg7XG4gICAgdGhpcy5idW5kbGVJZCA9IGJ1bmRsZUlkO1xuICAgIHRoaXMuZXhlY3V0YWJsZVZlcmlmaWVkID0gZmFsc2U7XG4gICAgdGhpcy5zdGF0ZSA9IENocm9tZWRyaXZlci5TVEFURV9TVE9QUEVEO1xuICAgIHRoaXMuandwcm94eSA9IG5ldyBKV1Byb3h5KHtzZXJ2ZXI6IHRoaXMucHJveHlIb3N0LCBwb3J0OiB0aGlzLnByb3h5UG9ydH0pO1xuICAgIHRoaXMudmVyYm9zZSA9IHZlcmJvc2U7XG4gICAgdGhpcy5sb2dQYXRoID0gbG9nUGF0aDtcbiAgICB0aGlzLmRpc2FibGVCdWlsZENoZWNrID0gISFkaXNhYmxlQnVpbGRDaGVjaztcbiAgfVxuXG4gIGFzeW5jIGdldE1hcHBpbmcgKCkge1xuICAgIGxldCBtYXBwaW5nID0gQ0hST01FRFJJVkVSX0NIUk9NRV9NQVBQSU5HO1xuICAgIGlmICh0aGlzLm1hcHBpbmdQYXRoKSB7XG4gICAgICBsb2cuZGVidWcoYEF0dGVtcHRpbmcgdG8gdXNlIENocm9tZWRyaXZlci1DaHJvbWUgbWFwcGluZyBmcm9tICcke3RoaXMubWFwcGluZ1BhdGh9J2ApO1xuICAgICAgaWYgKCFhd2FpdCBmcy5leGlzdHModGhpcy5tYXBwaW5nUGF0aCkpIHtcbiAgICAgICAgbG9nLndhcm4oYE5vIGZpbGUgZm91bmQgYXQgJyR7dGhpcy5tYXBwaW5nUGF0aH0nLiBVc2luZyBkZWZhdWx0IG1hcHBpbmdgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWFwcGluZyA9IEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUodGhpcy5tYXBwaW5nUGF0aCkpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoYEVycm9yIHBhcnNpbmcgbWFwcGluZyBmcm9tICcke3RoaXMubWFwcGluZ1BhdGh9JzogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICBsb2cud2FybignVXNpbmcgZGVmYXVsdCBtYXBwaW5nJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtYWtlIHN1cmUgdGhhdCB0aGUgdmFsdWVzIGZvciBtaW5pbXVtIGNocm9tZSB2ZXJzaW9uIGFyZSBzZW12ZXIgY29tcGxpYW50XG4gICAgZm9yIChjb25zdCBbY2RWZXJzaW9uLCBjaHJvbWVWZXJzaW9uXSBvZiBfLnRvUGFpcnMobWFwcGluZykpIHtcbiAgICAgIG1hcHBpbmdbY2RWZXJzaW9uXSA9IHNlbXZlci5jb2VyY2UoY2hyb21lVmVyc2lvbik7XG4gICAgfVxuICAgIHJldHVybiBtYXBwaW5nO1xuICB9XG5cbiAgYXN5bmMgZ2V0Q2hyb21lZHJpdmVycyAobWFwcGluZykge1xuICAgIC8vIGdvIHRocm91Z2ggdGhlIHZlcnNpb25zIGF2YWlsYWJsZVxuICAgIGNvbnN0IGV4ZWN1dGFibGVzID0gYXdhaXQgZnMuZ2xvYihgJHt0aGlzLmV4ZWN1dGFibGVEaXJ9LypgKTtcbiAgICBsb2cuZGVidWcoYEZvdW5kICR7ZXhlY3V0YWJsZXMubGVuZ3RofSBleGVjdXRhYmxlJHtleGVjdXRhYmxlcy5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ30gYCArXG4gICAgICBgaW4gJyR7dGhpcy5leGVjdXRhYmxlRGlyfSdgKTtcbiAgICBjb25zdCBjZHMgPSAoYXdhaXQgYXN5bmNtYXAoZXhlY3V0YWJsZXMsIGFzeW5jIGZ1bmN0aW9uIChleGVjdXRhYmxlKSB7XG4gICAgICBjb25zdCBsb2dFcnJvciA9ICh7bWVzc2FnZSwgc3Rkb3V0ID0gbnVsbCwgc3RkZXJyID0gbnVsbH0pID0+IHtcbiAgICAgICAgbGV0IGVyck1zZyA9IGBDYW5ub3QgcmV0cmlldmUgdmVyc2lvbiBudW1iZXIgZnJvbSAnJHtwYXRoLmJhc2VuYW1lKGV4ZWN1dGFibGUpfScgQ2hyb21lZHJpdmVyIGJpbmFyeS4gYCArXG4gICAgICAgICAgYE1ha2Ugc3VyZSBpdCByZXR1cm5zIGEgdmFsaWQgdmVyc2lvbiBzdHJpbmcgaW4gcmVzcG9uc2UgdG8gJy0tdmVyc2lvbicgY29tbWFuZCBsaW5lIGFyZ3VtZW50LiAke21lc3NhZ2V9YDtcbiAgICAgICAgaWYgKHN0ZG91dCkge1xuICAgICAgICAgIGVyck1zZyArPSBgXFxuU3Rkb3V0OiAke3N0ZG91dH1gO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGRlcnIpIHtcbiAgICAgICAgICBlcnJNc2cgKz0gYFxcblN0ZGVycjogJHtzdGRlcnJ9YDtcbiAgICAgICAgfVxuICAgICAgICBsb2cud2FybihlcnJNc2cpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG5cbiAgICAgIGxldCBzdGRvdXQ7XG4gICAgICBsZXQgc3RkZXJyO1xuICAgICAgdHJ5IHtcbiAgICAgICAgKHtzdGRvdXQsIHN0ZGVycn0gPSBhd2FpdCBleGVjKGV4ZWN1dGFibGUsIFsnLS12ZXJzaW9uJ10sIHtcbiAgICAgICAgICB0aW1lb3V0OiBDRF9WRVJTSU9OX1RJTUVPVVQsXG4gICAgICAgIH0pKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoIShlcnIubWVzc2FnZSB8fCAnJykuaW5jbHVkZXMoJ3RpbWVkIG91dCcpICYmICEoZXJyLnN0ZG91dCB8fCAnJykuaW5jbHVkZXMoJ1N0YXJ0aW5nIENocm9tZURyaXZlcicpKSB7XG4gICAgICAgICAgcmV0dXJuIGxvZ0Vycm9yKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB0aGlzIGhhcyB0aW1lZCBvdXQsaXQgaGFzIGFjdHVhbGx5IHN0YXJ0ZWQgQ2hyb21lZHJpdmVyLFxuICAgICAgICAvLyBpbiB3aGljaCBjYXNlIHRoZXJlIHdpbGwgYWxzbyBiZSB0aGUgdmVyc2lvbiBzdHJpbmcgaW4gdGhlIG91dHB1dFxuICAgICAgICBzdGRvdXQgPSBlcnIuc3Rkb3V0O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaCA9IC9DaHJvbWVEcml2ZXJcXHMrXFwoP3Y/KFtcXGQuXSspXFwpPy9pLmV4ZWMoc3Rkb3V0KTsgLy8gaHR0cHM6Ly9yZWdleDEwMS5jb20vci96cGo1d0EvMVxuICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICByZXR1cm4gbG9nRXJyb3Ioe21lc3NhZ2U6ICdDYW5ub3QgcGFyc2UgdGhlIHZlcnNpb24gc3RyaW5nJywgc3Rkb3V0LCBzdGRlcnJ9KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZlcnNpb25PYmogPSBzZW12ZXIuY29lcmNlKG1hdGNoWzFdLCB0cnVlKTtcbiAgICAgIGlmICghdmVyc2lvbk9iaikge1xuICAgICAgICByZXR1cm4gbG9nRXJyb3Ioe21lc3NhZ2U6ICdDYW5ub3QgY29lcmNlIHRoZSB2ZXJzaW9uIG51bWJlcicsIHN0ZG91dCwgc3RkZXJyfSk7XG4gICAgICB9XG4gICAgICBjb25zdCB2ZXJzaW9uID0gYCR7dmVyc2lvbk9iai5tYWpvcn0uJHt2ZXJzaW9uT2JqLm1pbm9yfWA7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBleGVjdXRhYmxlLFxuICAgICAgICB2ZXJzaW9uLFxuICAgICAgICBtaW5DRFZlcnNpb246IG1hcHBpbmdbdmVyc2lvbl0sXG4gICAgICB9O1xuICAgIH0pKVxuICAgICAgLmZpbHRlcigoY2QpID0+ICEhY2QpXG4gICAgICAuc29ydCgoYSwgYikgPT4gc2VtdmVyLmd0ZShzZW12ZXIuY29lcmNlKGIudmVyc2lvbiksIHNlbXZlci5jb2VyY2UoYS52ZXJzaW9uKSkgPyAxIDogLTEpO1xuICAgIGlmIChfLmlzRW1wdHkoY2RzKSkge1xuICAgICAgbG9nLmVycm9yQW5kVGhyb3coYE5vIENocm9tZWRyaXZlcnMgZm91bmQgaW4gJyR7dGhpcy5leGVjdXRhYmxlRGlyfSdgKTtcbiAgICB9XG4gICAgbG9nLmRlYnVnKGBUaGUgZm9sbG93aW5nIENocm9tZWRyaXZlciBleGVjdXRhYmxlcyB3ZXJlIGZvdW5kOmApO1xuICAgIGZvciAoY29uc3QgY2Qgb2YgY2RzKSB7XG4gICAgICBsb2cuZGVidWcoYCAgICAke2NkLmV4ZWN1dGFibGV9IChtaW5pbXVtIENocm9tZSB2ZXJzaW9uICcke2NkLm1pbkNEVmVyc2lvbiA/IGNkLm1pbkNEVmVyc2lvbiA6ICdVbmtub3duJ30nKWApO1xuICAgIH1cbiAgICByZXR1cm4gY2RzO1xuICB9XG5cbiAgYXN5bmMgZ2V0Q2hyb21lVmVyc2lvbiAoKSB7XG4gICAgbGV0IGNocm9tZVZlcnNpb247XG5cbiAgICAvLyBvbiBBbmRyb2lkIDcrIHdlYnZpZXdzIGFyZSBiYWNrZWQgYnkgdGhlIG1haW4gQ2hyb21lLCBub3QgdGhlIHN5c3RlbSB3ZWJ2aWV3XG4gICAgaWYgKHRoaXMuYWRiICYmIGF3YWl0IHRoaXMuYWRiLmdldEFwaUxldmVsKCkgPj0gMjQpIHtcbiAgICAgIHRoaXMuYnVuZGxlSWQgPSBDSFJPTUVfQlVORExFX0lEO1xuICAgIH1cblxuICAgIC8vIHRyeSBvdXQgd2Vidmlld3Mgd2hlbiBubyBidW5kbGUgaWQgaXMgc2VudCBpblxuICAgIGlmICghdGhpcy5idW5kbGVJZCkge1xuICAgICAgLy8gZGVmYXVsdCB0byB0aGUgZ2VuZXJpYyBDaHJvbWUgYnVuZGxlXG4gICAgICB0aGlzLmJ1bmRsZUlkID0gQ0hST01FX0JVTkRMRV9JRDtcblxuICAgICAgLy8gd2UgaGF2ZSBhIHdlYnZpZXcgb2Ygc29tZSBzb3J0LCBzbyB0cnkgdG8gZmluZCB0aGUgYnVuZGxlIHZlcnNpb25cbiAgICAgIGZvciAoY29uc3QgYnVuZGxlSWQgb2YgV0VCVklFV19CVU5ETEVfSURTKSB7XG4gICAgICAgIGNocm9tZVZlcnNpb24gPSBhd2FpdCBnZXRDaHJvbWVWZXJzaW9uKHRoaXMuYWRiLCBidW5kbGVJZCk7XG4gICAgICAgIGlmIChjaHJvbWVWZXJzaW9uKSB7XG4gICAgICAgICAgdGhpcy5idW5kbGVJZCA9IGJ1bmRsZUlkO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgZG8gbm90IGhhdmUgYSBjaHJvbWUgdmVyc2lvbiwgaXQgbXVzdCBub3QgYmUgYSB3ZWJ2aWV3XG4gICAgaWYgKCFjaHJvbWVWZXJzaW9uKSB7XG4gICAgICBjaHJvbWVWZXJzaW9uID0gYXdhaXQgZ2V0Q2hyb21lVmVyc2lvbih0aGlzLmFkYiwgdGhpcy5idW5kbGVJZCk7XG4gICAgfVxuXG4gICAgLy8gbWFrZSBzdXJlIGl0IGlzIHNlbXZlciwgc28gbGF0ZXIgY2hlY2tzIHdvbid0IGZhaWxcbiAgICByZXR1cm4gY2hyb21lVmVyc2lvbiA/IHNlbXZlci5jb2VyY2UoY2hyb21lVmVyc2lvbikgOiBudWxsO1xuICB9XG5cbiAgYXN5bmMgZ2V0Q29tcGF0aWJsZUNocm9tZWRyaXZlciAoKSB7XG4gICAgaWYgKCF0aGlzLmFkYikge1xuICAgICAgcmV0dXJuIGF3YWl0IGdldENocm9tZWRyaXZlckJpbmFyeVBhdGgoKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXBwaW5nID0gYXdhaXQgdGhpcy5nZXRNYXBwaW5nKCk7XG4gICAgY29uc3QgY2RzID0gYXdhaXQgdGhpcy5nZXRDaHJvbWVkcml2ZXJzKG1hcHBpbmcpO1xuXG4gICAgaWYgKHRoaXMuZGlzYWJsZUJ1aWxkQ2hlY2spIHtcbiAgICAgIGNvbnN0IGNkID0gY2RzWzBdO1xuICAgICAgbG9nLndhcm4oYENocm9tZSBidWlsZCBjaGVjayBkaXNhYmxlZC4gVXNpbmcgbW9zdCByZWNlbnQgQ2hyb21lZHJpdmVyIHZlcnNpb24gKCR7Y2QudmVyc2lvbn0sIGF0ICcke2NkLmV4ZWN1dGFibGV9JylgKTtcbiAgICAgIGxvZy53YXJuKGBJZiB0aGlzIGlzIHdyb25nLCBzZXQgJ2Nocm9tZWRyaXZlckRpc2FibGVCdWlsZENoZWNrJyBjYXBhYmlsaXR5IHRvICdmYWxzZSdgKTtcbiAgICAgIHJldHVybiBjZC5leGVjdXRhYmxlO1xuICAgIH1cblxuICAgIGNvbnN0IGNocm9tZVZlcnNpb24gPSBhd2FpdCB0aGlzLmdldENocm9tZVZlcnNpb24oKTtcblxuICAgIGlmICghY2hyb21lVmVyc2lvbikge1xuICAgICAgLy8gdW5hYmxlIHRvIGdldCB0aGUgY2hyb21lIHZlcnNpb25cbiAgICAgIGxldCBjZCA9IGNkc1swXTtcbiAgICAgIGxvZy53YXJuKGBVbmFibGUgdG8gZGlzY292ZXIgQ2hyb21lIHZlcnNpb24uIFVzaW5nIENocm9tZWRyaXZlciAke2NkLnZlcnNpb259IGF0ICcke2NkLmV4ZWN1dGFibGV9J2ApO1xuICAgICAgcmV0dXJuIGNkLmV4ZWN1dGFibGU7XG4gICAgfVxuXG4gICAgbG9nLmRlYnVnKGBGb3VuZCBDaHJvbWUgYnVuZGxlICcke3RoaXMuYnVuZGxlSWR9JyB2ZXJzaW9uICcke2Nocm9tZVZlcnNpb259J2ApO1xuXG4gICAgaWYgKHNlbXZlci5ndChjaHJvbWVWZXJzaW9uLCBfLnZhbHVlcyhtYXBwaW5nKVswXSkgJiZcbiAgICAgICAgIV8uaXNVbmRlZmluZWQoY2RzWzBdKSAmJiBfLmlzVW5kZWZpbmVkKGNkc1swXS5taW5DRFZlcnNpb24pKSB7XG4gICAgICAvLyB0aGlzIGlzIGEgY2hyb21lIGFib3ZlIHRoZSBsYXRlc3QgdmVyc2lvbiB3ZSBrbm93IGFib3V0LFxuICAgICAgLy8gYW5kIHdlIGhhdmUgYSBjaHJvbWVkcml2ZXIgdGhhdCBpcyBiZXlvbmQgd2hhdCB3ZSBrbm93LFxuICAgICAgLy8gc28gdXNlIHRoZSBtb3N0IHJlY2VudCBjaHJvbWVkcml2ZXIgdGhhdCB3ZSBmb3VuZFxuICAgICAgbGV0IGNkID0gY2RzWzBdO1xuICAgICAgbG9nLndhcm4oYE5vIGtub3duIENocm9tZWRyaXZlciBhdmFpbGFibGUgdG8gYXV0b21hdGUgQ2hyb21lIHZlcnNpb24gJyR7Y2hyb21lVmVyc2lvbn0nLlxcbmAgK1xuICAgICAgICAgICAgICAgYFVzaW5nIENocm9tZWRyaXZlciB2ZXJzaW9uICcke2NkLnZlcnNpb259Jywgd2hpY2ggaGFzIG5vdCBiZWVuIHRlc3RlZCB3aXRoIEFwcGl1bS5gKTtcbiAgICAgIHJldHVybiBjZC5leGVjdXRhYmxlO1xuICAgIH1cblxuICAgIGNvbnN0IHdvcmtpbmdDZHMgPSBjZHMuZmlsdGVyKChjZCkgPT4ge1xuICAgICAgcmV0dXJuICFfLmlzVW5kZWZpbmVkKGNkLm1pbkNEVmVyc2lvbikgJiYgc2VtdmVyLmd0ZShjaHJvbWVWZXJzaW9uLCBjZC5taW5DRFZlcnNpb24pO1xuICAgIH0pO1xuXG4gICAgaWYgKF8uaXNFbXB0eSh3b3JraW5nQ2RzKSkge1xuICAgICAgbG9nLmVycm9yQW5kVGhyb3coYE5vIENocm9tZWRyaXZlciBmb3VuZCB0aGF0IGNhbiBhdXRvbWF0ZSBDaHJvbWUgJyR7Y2hyb21lVmVyc2lvbn0nLiBgICtcbiAgICAgICAgICAgICAgICAgICAgICAgIGBTZWUgJHtDSFJPTUVEUklWRVJfVFVUT1JJQUx9IGZvciBtb3JlIGRldGFpbHMuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgYmluUGF0aCA9IHdvcmtpbmdDZHNbMF0uZXhlY3V0YWJsZTtcbiAgICBsb2cuZGVidWcoYEZvdW5kICR7d29ya2luZ0Nkcy5sZW5ndGh9IENocm9tZWRyaXZlciBleGVjdXRhYmxlJHt3b3JraW5nQ2RzLmxlbmd0aCA9PT0gMSA/ICcnIDogJ3MnfSBgICtcbiAgICAgICAgICAgICAgYGNhcGFibGUgb2YgYXV0b21hdGluZyBDaHJvbWUgJyR7Y2hyb21lVmVyc2lvbn0nLlxcbmAgK1xuICAgICAgICAgICAgICBgQ2hvb3NpbmcgdGhlIG1vc3QgcmVjZW50LCAnJHtiaW5QYXRofScuYCk7XG4gICAgbG9nLmRlYnVnKCdJZiBhIHNwZWNpZmljIHZlcnNpb24gaXMgcmVxdWlyZWQsIHNwZWNpZnkgaXQgd2l0aCB0aGUgYGNocm9tZWRyaXZlckV4ZWN1dGFibGVgJyArXG4gICAgICAgICAgICAgICdkZXNpcmVkIGNhcGFiaWxpdHkuJyk7XG4gICAgcmV0dXJuIGJpblBhdGg7XG4gIH1cblxuICBhc3luYyBpbml0Q2hyb21lZHJpdmVyUGF0aCAoKSB7XG4gICAgaWYgKHRoaXMuZXhlY3V0YWJsZVZlcmlmaWVkKSByZXR1cm47IC8vZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuXG4gICAgLy8gdGhlIGV4ZWN1dGFibGUgbWlnaHQgYmUgc2V0IChpZiBwYXNzZWQgaW4pXG4gICAgLy8gb3Igd2UgbWlnaHQgd2FudCB0byB1c2UgdGhlIGJhc2ljIG9uZSBpbnN0YWxsZWQgd2l0aCB0aGlzIGRyaXZlclxuICAgIC8vIG9yIHdlIHdhbnQgdG8gZmlndXJlIG91dCB0aGUgYmVzdCBvbmVcbiAgICBpZiAoIXRoaXMuY2hyb21lZHJpdmVyKSB7XG4gICAgICB0aGlzLmNocm9tZWRyaXZlciA9IHRoaXMudXNlU3lzdGVtRXhlY3V0YWJsZVxuICAgICAgICA/IGF3YWl0IGdldENocm9tZWRyaXZlckJpbmFyeVBhdGgoKVxuICAgICAgICA6IGF3YWl0IHRoaXMuZ2V0Q29tcGF0aWJsZUNocm9tZWRyaXZlcigpO1xuICAgIH1cblxuICAgIGlmICghYXdhaXQgZnMuZXhpc3RzKHRoaXMuY2hyb21lZHJpdmVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUcnlpbmcgdG8gdXNlIGEgY2hyb21lZHJpdmVyIGJpbmFyeSBhdCB0aGUgcGF0aCBgICtcbiAgICAgICAgICAgICAgICAgICAgICBgJHt0aGlzLmNocm9tZWRyaXZlcn0sIGJ1dCBpdCBkb2Vzbid0IGV4aXN0IWApO1xuICAgIH1cbiAgICB0aGlzLmV4ZWN1dGFibGVWZXJpZmllZCA9IHRydWU7XG4gICAgbG9nLmluZm8oYFNldCBjaHJvbWVkcml2ZXIgYmluYXJ5IGFzOiAke3RoaXMuY2hyb21lZHJpdmVyfWApO1xuICB9XG5cbiAgYXN5bmMgc3RhcnQgKGNhcHMsIGVtaXRTdGFydGluZ1N0YXRlID0gdHJ1ZSkge1xuICAgIHRoaXMuY2FwYWJpbGl0aWVzID0gXy5jbG9uZURlZXAoY2Fwcyk7XG5cbiAgICAvLyBzZXQgdGhlIGxvZ2dpbmcgcHJlZmVyZW5jZXMgdG8gQUxMIHRoZSBjb25zb2xlIGxvZ3NcbiAgICB0aGlzLmNhcGFiaWxpdGllcy5sb2dnaW5nUHJlZnMgPSB0aGlzLmNhcGFiaWxpdGllcy5sb2dnaW5nUHJlZnMgfHwge307XG4gICAgaWYgKF8uaXNFbXB0eSh0aGlzLmNhcGFiaWxpdGllcy5sb2dnaW5nUHJlZnMuYnJvd3NlcikpIHtcbiAgICAgIHRoaXMuY2FwYWJpbGl0aWVzLmxvZ2dpbmdQcmVmcy5icm93c2VyID0gJ0FMTCc7XG4gICAgfVxuXG4gICAgaWYgKGVtaXRTdGFydGluZ1N0YXRlKSB7XG4gICAgICB0aGlzLmNoYW5nZVN0YXRlKENocm9tZWRyaXZlci5TVEFURV9TVEFSVElORyk7XG4gICAgfVxuXG4gICAgbGV0IGFyZ3MgPSBbJy0tdXJsLWJhc2U9d2QvaHViJywgYC0tcG9ydD0ke3RoaXMucHJveHlQb3J0fWBdO1xuICAgIGlmICh0aGlzLmFkYiAmJiB0aGlzLmFkYi5hZGJQb3J0KSB7XG4gICAgICBhcmdzID0gYXJncy5jb25jYXQoW2AtLWFkYi1wb3J0PSR7dGhpcy5hZGIuYWRiUG9ydH1gXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNtZEFyZ3MpIHtcbiAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdCh0aGlzLmNtZEFyZ3MpO1xuICAgIH1cbiAgICBpZiAodGhpcy5sb2dQYXRoKSB7XG4gICAgICBhcmdzID0gYXJncy5jb25jYXQoW2AtLWxvZy1wYXRoPSR7dGhpcy5sb2dQYXRofWBdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZGlzYWJsZUJ1aWxkQ2hlY2spIHtcbiAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChbJy0tZGlzYWJsZS1idWlsZC1jaGVjayddKTtcbiAgICB9XG4gICAgYXJncyA9IGFyZ3MuY29uY2F0KFsnLS12ZXJib3NlJ10pO1xuICAgIC8vIHdoYXQgYXJlIHRoZSBwcm9jZXNzIHN0ZG91dC9zdGRlcnIgY29uZGl0aW9ucyB3aGVyZWluIHdlIGtub3cgdGhhdFxuICAgIC8vIHRoZSBwcm9jZXNzIGhhcyBzdGFydGVkIHRvIG91ciBzYXRpc2ZhY3Rpb24/XG4gICAgY29uc3Qgc3RhcnREZXRlY3RvciA9IChzdGRvdXQpID0+IHtcbiAgICAgIHJldHVybiBzdGRvdXQuaW5kZXhPZignU3RhcnRpbmcgJykgPT09IDA7XG4gICAgfTtcblxuICAgIGxldCBwcm9jZXNzSXNBbGl2ZSA9IGZhbHNlO1xuICAgIGxldCB3ZWJ2aWV3VmVyc2lvbjtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5pbml0Q2hyb21lZHJpdmVyUGF0aCgpO1xuICAgICAgYXdhaXQgdGhpcy5raWxsQWxsKCk7XG5cbiAgICAgIC8vIHNldCB1cCBvdXIgc3VicHJvY2VzcyBvYmplY3RcbiAgICAgIHRoaXMucHJvYyA9IG5ldyBTdWJQcm9jZXNzKHRoaXMuY2hyb21lZHJpdmVyLCBhcmdzKTtcbiAgICAgIHByb2Nlc3NJc0FsaXZlID0gdHJ1ZTtcblxuICAgICAgLy8gaGFuZGxlIGxvZyBvdXRwdXRcbiAgICAgIHRoaXMucHJvYy5vbignb3V0cHV0JywgKHN0ZG91dCwgc3RkZXJyKSA9PiB7XG4gICAgICAgIC8vIGlmIHRoZSBjZCBvdXRwdXQgaXMgbm90IHByaW50ZWQsIGZpbmQgdGhlIGNocm9tZSB2ZXJzaW9uIGFuZCBwcmludFxuICAgICAgICAvLyB3aWxsIGdldCBhIHJlc3BvbnNlIGxpa2VcbiAgICAgICAgLy8gICBEZXZUb29scyByZXNwb25zZToge1xuICAgICAgICAvLyAgICAgIFwiQW5kcm9pZC1QYWNrYWdlXCI6IFwiaW8uYXBwaXVtLnNhbXBsZWFwcFwiLFxuICAgICAgICAvLyAgICAgIFwiQnJvd3NlclwiOiBcIkNocm9tZS81NS4wLjI4ODMuOTFcIixcbiAgICAgICAgLy8gICAgICBcIlByb3RvY29sLVZlcnNpb25cIjogXCIxLjJcIixcbiAgICAgICAgLy8gICAgICBcIlVzZXItQWdlbnRcIjogXCIuLi5cIixcbiAgICAgICAgLy8gICAgICBcIldlYktpdC1WZXJzaW9uXCI6IFwiNTM3LjM2XCJcbiAgICAgICAgLy8gICB9XG4gICAgICAgIGNvbnN0IG91dCA9IHN0ZG91dCArIHN0ZGVycjtcbiAgICAgICAgbGV0IG1hdGNoID0gL1wiQnJvd3NlclwiOiBcIiguKilcIi8uZXhlYyhvdXQpO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICB3ZWJ2aWV3VmVyc2lvbiA9IG1hdGNoWzFdO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgV2VidmlldyB2ZXJzaW9uOiAnJHt3ZWJ2aWV3VmVyc2lvbn0nYCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhbHNvIHByaW50IGNocm9tZWRyaXZlciB2ZXJzaW9uIHRvIGxvZ3NcbiAgICAgICAgLy8gd2lsbCBvdXRwdXQgc29tZXRoaW5nIGxpa2VcbiAgICAgICAgLy8gIFN0YXJ0aW5nIENocm9tZURyaXZlciAyLjMzLjUwNjEwNiAoOGEwNmMzOWM0NTgyZmJmYmFiNjk2NmRiYjFjMzhhOTE3M2JmYjFhMikgb24gcG9ydCA5NTE1XG4gICAgICAgIG1hdGNoID0gL1N0YXJ0aW5nIENocm9tZURyaXZlciAoWy5cXGRdKykvLmV4ZWMob3V0KTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgbG9nLmRlYnVnKGBDaHJvbWVkcml2ZXIgdmVyc2lvbjogJyR7bWF0Y2hbMV19J2ApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ2l2ZSB0aGUgb3V0cHV0IGlmIGl0IGlzIHJlcXVlc3RlZFxuICAgICAgICBpZiAodGhpcy52ZXJib3NlKSB7XG4gICAgICAgICAgZm9yIChsZXQgbGluZSBvZiAoc3Rkb3V0IHx8ICcnKS50cmltKCkuc3BsaXQoJ1xcbicpKSB7XG4gICAgICAgICAgICBpZiAoIWxpbmUudHJpbSgpLmxlbmd0aCkgY29udGludWU7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY3VybHlcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhgW1NURE9VVF0gJHtsaW5lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKGxldCBsaW5lIG9mIChzdGRlcnIgfHwgJycpLnRyaW0oKS5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgICAgIGlmICghbGluZS50cmltKCkubGVuZ3RoKSBjb250aW51ZTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuICAgICAgICAgICAgbG9nLmVycm9yKGBbU1RERVJSXSAke2xpbmV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gaGFuZGxlIG91dC1vZi1ib3VuZCBleGl0IGJ5IHNpbXBseSBlbWl0dGluZyBhIHN0b3BwZWQgc3RhdGVcbiAgICAgIHRoaXMucHJvYy5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgICAgcHJvY2Vzc0lzQWxpdmUgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IENocm9tZWRyaXZlci5TVEFURV9TVE9QUEVEICYmXG4gICAgICAgICAgICB0aGlzLnN0YXRlICE9PSBDaHJvbWVkcml2ZXIuU1RBVEVfU1RPUFBJTkcgJiZcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgIT09IENocm9tZWRyaXZlci5TVEFURV9SRVNUQVJUSU5HKSB7XG4gICAgICAgICAgbGV0IG1zZyA9IGBDaHJvbWVkcml2ZXIgZXhpdGVkIHVuZXhwZWN0ZWRseSB3aXRoIGNvZGUgJHtjb2RlfSwgYCArXG4gICAgICAgICAgICAgICAgICAgIGBzaWduYWwgJHtzaWduYWx9YDtcbiAgICAgICAgICBsb2cuZXJyb3IobXNnKTtcbiAgICAgICAgICB0aGlzLmNoYW5nZVN0YXRlKENocm9tZWRyaXZlci5TVEFURV9TVE9QUEVEKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBsb2cuaW5mbyhgU3Bhd25pbmcgY2hyb21lZHJpdmVyIHdpdGg6ICR7dGhpcy5jaHJvbWVkcml2ZXJ9IGAgK1xuICAgICAgICAgICAgICAgYCR7YXJncy5qb2luKCcgJyl9YCk7XG4gICAgICAvLyBzdGFydCBzdWJwcm9jIGFuZCB3YWl0IGZvciBzdGFydERldGVjdG9yXG4gICAgICBhd2FpdCB0aGlzLnByb2Muc3RhcnQoc3RhcnREZXRlY3Rvcik7XG4gICAgICBhd2FpdCB0aGlzLndhaXRGb3JPbmxpbmUoKTtcbiAgICAgIGF3YWl0IHRoaXMuc3RhcnRTZXNzaW9uKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5lbWl0KENocm9tZWRyaXZlci5FVkVOVF9FUlJPUiwgZSk7XG4gICAgICAvLyBqdXN0IGJlY2F1c2Ugd2UgaGFkIGFuIGVycm9yIGRvZXNuJ3QgbWVhbiB0aGUgY2hyb21lZHJpdmVyIHByb2Nlc3NcbiAgICAgIC8vIGZpbmlzaGVkOyB3ZSBzaG91bGQgY2xlYW4gdXAgaWYgbmVjZXNzYXJ5XG4gICAgICBpZiAocHJvY2Vzc0lzQWxpdmUpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5wcm9jLnN0b3AoKTtcbiAgICAgIH1cblxuICAgICAgbGV0IG1lc3NhZ2UgPSAnJztcbiAgICAgIC8vIG9mdGVuIHRoZSB1c2VyJ3MgQ2hyb21lIHZlcnNpb24gaXMgdG9vIGxvdyBmb3IgdGhlIHZlcnNpb24gb2YgQ2hyb21lZHJpdmVyXG4gICAgICBpZiAoZS5tZXNzYWdlLmluY2x1ZGVzKCdDaHJvbWUgdmVyc2lvbiBtdXN0IGJlJykpIHtcbiAgICAgICAgbWVzc2FnZSArPSAnVW5hYmxlIHRvIGF1dG9tYXRlIENocm9tZSB2ZXJzaW9uIGJlY2F1c2UgaXQgaXMgdG9vIG9sZCBmb3IgdGhpcyB2ZXJzaW9uIG9mIENocm9tZWRyaXZlci5cXG4nO1xuICAgICAgICBpZiAod2Vidmlld1ZlcnNpb24pIHtcbiAgICAgICAgICBtZXNzYWdlICs9IGBDaHJvbWUgdmVyc2lvbiBvbiB0aGUgZGV2aWNlOiAke3dlYnZpZXdWZXJzaW9ufVxcbmA7XG4gICAgICAgIH1cbiAgICAgICAgbWVzc2FnZSArPSBgVmlzaXQgJyR7Q0hST01FRFJJVkVSX1RVVE9SSUFMfScgdG8gdHJvdWJsZXNob290IHRoZSBwcm9ibGVtLlxcbmA7XG4gICAgICB9XG5cbiAgICAgIG1lc3NhZ2UgKz0gZS5tZXNzYWdlO1xuICAgICAgbG9nLmVycm9yQW5kVGhyb3cobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgc2Vzc2lvbklkICgpIHtcbiAgICBpZiAodGhpcy5zdGF0ZSAhPT0gQ2hyb21lZHJpdmVyLlNUQVRFX09OTElORSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuandwcm94eS5zZXNzaW9uSWQ7XG4gIH1cblxuICBhc3luYyByZXN0YXJ0ICgpIHtcbiAgICBsb2cuaW5mbygnUmVzdGFydGluZyBjaHJvbWVkcml2ZXInKTtcbiAgICBpZiAodGhpcy5zdGF0ZSAhPT0gQ2hyb21lZHJpdmVyLlNUQVRFX09OTElORSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgcmVzdGFydCB3aGVuIHdlJ3JlIG5vdCBvbmxpbmVcIik7XG4gICAgfVxuICAgIHRoaXMuY2hhbmdlU3RhdGUoQ2hyb21lZHJpdmVyLlNUQVRFX1JFU1RBUlRJTkcpO1xuICAgIGF3YWl0IHRoaXMuc3RvcChmYWxzZSk7XG4gICAgYXdhaXQgdGhpcy5zdGFydCh0aGlzLmNhcGFiaWxpdGllcywgZmFsc2UpO1xuICB9XG5cbiAgYXN5bmMgd2FpdEZvck9ubGluZSAoKSB7XG4gICAgLy8gd2UgbmVlZCB0byBtYWtlIHN1cmUgdGhhdCBDRCBoYXNuJ3QgY3Jhc2hlZFxuICAgIGxldCBjaHJvbWVkcml2ZXJTdG9wcGVkID0gZmFsc2U7XG4gICAgYXdhaXQgcmV0cnlJbnRlcnZhbCgyMCwgMjAwLCBhc3luYyAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gQ2hyb21lZHJpdmVyLlNUQVRFX1NUT1BQRUQpIHtcbiAgICAgICAgLy8gd2UgYXJlIGVpdGhlciBzdG9wcGVkIG9yIHN0b3BwaW5nLCBzbyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgICBjaHJvbWVkcml2ZXJTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgdGhpcy5nZXRTdGF0dXMoKTtcbiAgICB9KTtcbiAgICBpZiAoY2hyb21lZHJpdmVyU3RvcHBlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaHJvbWVEcml2ZXIgY3Jhc2hlZCBkdXJpbmcgc3RhcnR1cC4nKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBnZXRTdGF0dXMgKCkge1xuICAgIHJldHVybiBhd2FpdCB0aGlzLmp3cHJveHkuY29tbWFuZCgnL3N0YXR1cycsICdHRVQnKTtcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0U2Vzc2lvbiAoKSB7XG4gICAgLy8gcmV0cnkgc2Vzc2lvbiBzdGFydCA0IHRpbWVzLCBzb21ldGltZXMgdGhpcyBmYWlscyBkdWUgdG8gYWRiXG4gICAgYXdhaXQgcmV0cnlJbnRlcnZhbCg0LCAyMDAsIGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCByZXMgPSBhd2FpdCB0aGlzLmp3cHJveHkuY29tbWFuZCgnL3Nlc3Npb24nLCAnUE9TVCcsIHtkZXNpcmVkQ2FwYWJpbGl0aWVzOiB0aGlzLmNhcGFiaWxpdGllc30pO1xuICAgICAgICAvLyBDaHJvbWVEcml2ZXIgY2FuIHJldHVybiBhIHBvc2l0aXZlIHN0YXR1cyBkZXNwaXRlIGZhaWxpbmdcbiAgICAgICAgaWYgKHJlcy5zdGF0dXMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzLnZhbHVlLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgbG9nLmVycm9yQW5kVGhyb3coYEZhaWxlZCB0byBzdGFydCBDaHJvbWVkcml2ZXIgc2Vzc2lvbjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmNoYW5nZVN0YXRlKENocm9tZWRyaXZlci5TVEFURV9PTkxJTkUpO1xuICB9XG5cbiAgYXN5bmMgc3RvcCAoZW1pdFN0YXRlcyA9IHRydWUpIHtcbiAgICBpZiAoZW1pdFN0YXRlcykge1xuICAgICAgdGhpcy5jaGFuZ2VTdGF0ZShDaHJvbWVkcml2ZXIuU1RBVEVfU1RPUFBJTkcpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5qd3Byb3h5LmNvbW1hbmQoJycsICdERUxFVEUnKTtcbiAgICAgIGF3YWl0IHRoaXMucHJvYy5zdG9wKCdTSUdURVJNJywgMjAwMDApO1xuICAgICAgaWYgKGVtaXRTdGF0ZXMpIHtcbiAgICAgICAgdGhpcy5jaGFuZ2VTdGF0ZShDaHJvbWVkcml2ZXIuU1RBVEVfU1RPUFBFRCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLmVycm9yKGUpO1xuICAgIH1cbiAgfVxuXG4gIGNoYW5nZVN0YXRlIChzdGF0ZSkge1xuICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICBsb2cuZGVidWcoYENoYW5nZWQgc3RhdGUgdG8gJyR7c3RhdGV9J2ApO1xuICAgIHRoaXMuZW1pdChDaHJvbWVkcml2ZXIuRVZFTlRfQ0hBTkdFRCwge3N0YXRlfSk7XG4gIH1cblxuICBhc3luYyBzZW5kQ29tbWFuZCAodXJsLCBtZXRob2QsIGJvZHkpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5qd3Byb3h5LmNvbW1hbmQodXJsLCBtZXRob2QsIGJvZHkpO1xuICB9XG5cbiAgYXN5bmMgcHJveHlSZXEgKHJlcSwgcmVzKSB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuandwcm94eS5wcm94eVJlcVJlcyhyZXEsIHJlcyk7XG4gIH1cblxuICBhc3luYyBraWxsQWxsICgpIHtcbiAgICBsZXQgY21kID0gc3lzdGVtLmlzV2luZG93cygpXG4gICAgICA/IGB3bWljIHByb2Nlc3Mgd2hlcmUgXCJjb21tYW5kbGluZSBsaWtlICclY2hyb21lZHJpdmVyLmV4ZSUtLXBvcnQ9JHt0aGlzLnByb3h5UG9ydH0lJ1wiIGRlbGV0ZWBcbiAgICAgIDogYHBraWxsIC0xNSAtZiBcIiR7dGhpcy5jaHJvbWVkcml2ZXJ9LiotLXBvcnQ9JHt0aGlzLnByb3h5UG9ydH1cImA7XG4gICAgbG9nLmRlYnVnKGBLaWxsaW5nIGFueSBvbGQgY2hyb21lZHJpdmVycywgcnVubmluZzogJHtjbWR9YCk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IChCLnByb21pc2lmeShjcC5leGVjKSkoY21kKTtcbiAgICAgIGxvZy5kZWJ1ZygnU3VjY2Vzc2Z1bGx5IGNsZWFuZWQgdXAgb2xkIGNocm9tZWRyaXZlcnMnKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy53YXJuKCdObyBvbGQgY2hyb21lZHJpdmVycyBzZWVtIHRvIGV4aXN0Jyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWRiKSB7XG4gICAgICBsb2cuZGVidWcoYENsZWFuaW5nIGFueSBvbGQgYWRiIGZvcndhcmRlZCBwb3J0IHNvY2tldCBjb25uZWN0aW9uc2ApO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yIChsZXQgY29ubiBvZiBhd2FpdCB0aGlzLmFkYi5nZXRGb3J3YXJkTGlzdCgpKSB7XG4gICAgICAgICAgLy8gY2hyb21lZHJpdmVyIHdpbGwgYXNrIEFEQiB0byBmb3J3YXJkIGEgcG9ydCBsaWtlIFwiZGV2aWNlSWQgdGNwOnBvcnQgbG9jYWxhYnN0cmFjdDp3ZWJ2aWV3X2RldnRvb2xzX3JlbW90ZV9wb3J0XCJcbiAgICAgICAgICBpZiAoY29ubi5pbmRleE9mKCd3ZWJ2aWV3X2RldnRvb2xzJykgIT09IC0xKSB7XG4gICAgICAgICAgICBsZXQgcGFyYW1zID0gY29ubi5zcGxpdCgvXFxzKy8pO1xuICAgICAgICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMuYWRiLnJlbW92ZVBvcnRGb3J3YXJkKHBhcmFtc1sxXS5yZXBsYWNlKC9bXFxEXSovLCAnJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGxvZy53YXJuKGBVbmFibGUgdG8gY2xlYW4gZm9yd2FyZGVkIHBvcnRzLiBFcnJvcjogJyR7ZXJyLm1lc3NhZ2V9Jy4gQ29udGludWluZy5gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyBoYXNXb3JraW5nV2VidmlldyAoKSB7XG4gICAgLy8gc29tZXRpbWVzIGNocm9tZWRyaXZlciBzdG9wcyBhdXRvbWF0aW5nIHdlYnZpZXdzLiB0aGlzIG1ldGhvZCBydW5zIGFcbiAgICAvLyBzaW1wbGUgY29tbWFuZCB0byBkZXRlcm1pbmUgb3VyIHN0YXRlLCBhbmQgcmVzcG9uZHMgYWNjb3JkaW5nbHlcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5qd3Byb3h5LmNvbW1hbmQoJy91cmwnLCAnR0VUJyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59XG5cbkNocm9tZWRyaXZlci5FVkVOVF9FUlJPUiA9ICdjaHJvbWVkcml2ZXJfZXJyb3InO1xuQ2hyb21lZHJpdmVyLkVWRU5UX0NIQU5HRUQgPSAnc3RhdGVDaGFuZ2VkJztcbkNocm9tZWRyaXZlci5TVEFURV9TVE9QUEVEID0gJ3N0b3BwZWQnO1xuQ2hyb21lZHJpdmVyLlNUQVRFX1NUQVJUSU5HID0gJ3N0YXJ0aW5nJztcbkNocm9tZWRyaXZlci5TVEFURV9PTkxJTkUgPSAnb25saW5lJztcbkNocm9tZWRyaXZlci5TVEFURV9TVE9QUElORyA9ICdzdG9wcGluZyc7XG5DaHJvbWVkcml2ZXIuU1RBVEVfUkVTVEFSVElORyA9ICdyZXN0YXJ0aW5nJztcblxuZXhwb3J0IHtcbiAgQ2hyb21lZHJpdmVyLCBDSFJPTUVEUklWRVJfQ0hST01FX01BUFBJTkcsIGdldE1vc3RSZWNlbnRDaHJvbWVkcml2ZXIsIENEX1ZFUixcbn07XG5leHBvcnQgZGVmYXVsdCBDaHJvbWVkcml2ZXI7XG4iXSwiZmlsZSI6ImxpYi9jaHJvbWVkcml2ZXIuanMiLCJzb3VyY2VSb290IjoiLi4vLi4ifQ==
