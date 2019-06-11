"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _teen_process = require("teen_process");

var _logger = _interopRequireDefault(require("./logger"));

var _lodash = _interopRequireDefault(require("lodash"));

var _through = require("through");

var _path = _interopRequireDefault(require("path"));

var _appiumSupport = require("appium-support");

var _appiumXcode = _interopRequireDefault(require("appium-xcode"));

var _bluebird = _interopRequireDefault(require("bluebird"));

var _appiumIosSimulator = require("appium-ios-simulator");

var _utils = require("./utils");

var _streams = require("./streams");

require("colors");

const ERR_NEVER_CHECKED_IN = 'Instruments never checked in';
const ERR_CRASHED_ON_STARTUP = 'Instruments crashed on startup';
const ERR_AMBIGUOUS_DEVICE = 'Instruments Usage Error : Ambiguous device name/identifier';

class Instruments {
  static async quickInstruments(opts) {
    opts = _lodash.default.clone(opts);
    let xcodeTraceTemplatePath = await _appiumXcode.default.getAutomationTraceTemplatePath();

    _lodash.default.defaults(opts, {
      launchTimeout: 60000,
      template: xcodeTraceTemplatePath,
      withoutDelay: true,
      xcodeVersion: '8.1',
      webSocket: null,
      flakeyRetries: 2
    });

    return new Instruments(opts);
  }

  constructor(opts) {
    opts = _lodash.default.cloneDeep(opts);

    _lodash.default.defaults(opts, {
      termTimeout: 5000,
      tmpDir: '/tmp/appium-instruments',
      launchTimeout: 90000,
      flakeyRetries: 0,
      realDevice: false
    });

    const props = ['app', 'termTimeout', 'flakeyRetries', 'udid', 'bootstrap', 'template', 'withoutDelay', 'processArguments', 'realDevice', 'simulatorSdkAndDevice', 'tmpDir', 'traceDir', 'locale', 'language'];

    for (const f of props) {
      this[f] = opts[f];
    }

    this.traceDir = this.traceDir || this.tmpDir;
    this.launchTimeout = (0, _utils.parseLaunchTimeout)(opts.launchTimeout);
    this.proc = null;
    this.webSocket = opts.webSocket;
    this.instrumentsPath = opts.instrumentsPath;
    this.launchTries = 0;
    this.socketConnectDelays = [];
    this.gotFBSOpenApplicationError = false;
    this.onShutdown = new _bluebird.default((resolve, reject) => {
      this.onShutdownDeferred = {
        resolve,
        reject
      };
    });
    this.onShutdown.catch(() => {}).done();
  }

  async configure() {
    if (!this.xcodeVersion) {
      this.xcodeVersion = await _appiumXcode.default.getVersion(true);
    }

    if (this.xcodeVersion.versionFloat === 6.0 && this.withoutDelay) {
      _logger.default.info('In xcode 6.0, instruments-without-delay does not work. ' + 'If using Appium, you can disable instruments-without-delay ' + 'with the --native-instruments-lib server flag');
    }

    if (this.xcodeVersion.versionString === '5.0.1') {
      throw new Error('Xcode 5.0.1 ships with a broken version of ' + 'Instruments. please upgrade to 5.0.2');
    }

    if (this.xcodeVersion.major > 7) {
      throw new Error(`Instruments-based automation was removed in Xcode 8. ` + `Xcode ${this.xcodeVersion.versionString} is not supported. ` + `Please try the XCUItest driver.`);
    }

    if (!this.template) {
      this.template = await _appiumXcode.default.getAutomationTraceTemplatePath();
    }

    if (!this.instrumentsPath) {
      this.instrumentsPath = await (0, _utils.getInstrumentsPath)();
    }
  }

  async launchOnce() {
    _logger.default.info('Launching instruments');

    await _appiumSupport.fs.rimraf(this.tmpDir);
    await (0, _appiumSupport.mkdirp)(this.tmpDir);
    await (0, _appiumSupport.mkdirp)(this.traceDir);
    this.exitListener = null;
    this.proc = await this.spawnInstruments();
    this.proc.on('exit', (code, signal) => {
      const msg = code !== null ? `code: ${code}` : `signal: ${signal}`;

      _logger.default.debug(`Instruments exited with ${msg}`);
    });
    let launchResultPromise = new _bluebird.default((resolve, reject) => {
      this.launchResultDeferred = {
        resolve,
        reject
      };
    });
    this.setExitListener(() => {
      this.proc = null;
      this.launchResultDeferred.reject(new Error(ERR_CRASHED_ON_STARTUP));
    });
    this.proc.on('error', err => {
      _logger.default.debug(`Error with instruments proc: ${err.message}`);

      if (err.message.indexOf('ENOENT') !== -1) {
        this.proc = null;

        _logger.default.error(`Unable to spawn instruments: ${err.message}`);

        this.launchResultDeferred.reject(err);
      }
    });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.pipe((0, _streams.outputStream)()).pipe((0, _streams.dumpStream)());
    this.proc.stderr.setEncoding('utf8');

    let actOnStderr = output => {
      if (this.launchTimeout.afterSimLaunch && output && output.match(/CLTilesManagerClient: initialize/)) {
        this.addSocketConnectTimer(this.launchTimeout.afterSimLaunch, 'afterLaunch', async () => {
          await this.killInstruments();
          this.launchResultDeferred.reject(new Error(ERR_NEVER_CHECKED_IN));
        });
      }

      let fbsErrStr = '(FBSOpenApplicationErrorDomain error 8.)';

      if (output.indexOf(fbsErrStr) !== -1) {
        this.gotFBSOpenApplicationError = true;
      }

      if (output.indexOf(ERR_AMBIGUOUS_DEVICE) !== -1) {
        let msg = `${ERR_AMBIGUOUS_DEVICE}: '${this.simulatorSdkAndDevice}'`;
        this.launchResultDeferred.reject(new Error(msg));
      }
    };

    this.proc.stderr.pipe((0, _through.through)(function (output) {
      actOnStderr(output);
      this.queue(output);
    })).pipe((0, _streams.errorStream)()).pipe((0, _streams.webSocketAlertStream)(this.webSocket)).pipe((0, _streams.dumpStream)());
    this.addSocketConnectTimer(this.launchTimeout.global, 'global', async () => {
      await this.killInstruments();
      this.launchResultDeferred.reject(new Error(ERR_NEVER_CHECKED_IN));
    });

    try {
      await launchResultPromise;
    } finally {
      this.clearSocketConnectTimers();
    }

    this.setExitListener((code, signal) => {
      this.proc = null;
      const msg = code !== null ? `code: ${code}` : `signal: ${signal}`;
      this.onShutdownDeferred.reject(new Error(`Abnormal exit with ${msg}`));
    });
  }

  async launch() {
    await this.configure();
    let launchTries = 0;

    do {
      launchTries++;

      _logger.default.debug(`Attempting to launch instruments, this is try #${launchTries}`);

      try {
        await this.launchOnce();
        break;
      } catch (err) {
        _logger.default.error(`Error launching instruments: ${err.message}`);

        let errIsCatchable = err.message === ERR_NEVER_CHECKED_IN || err.message === ERR_CRASHED_ON_STARTUP;

        if (!errIsCatchable) {
          throw err;
        }

        if (launchTries <= this.flakeyRetries) {
          if (this.gotFBSOpenApplicationError) {
            _logger.default.debug('Got the FBSOpenApplicationError, not killing the ' + 'sim but leaving it open so the app will launch');

            this.gotFBSOpenApplicationError = false;
            await _bluebird.default.delay(1000);
          } else {
            if (!this.realDevice) {
              await (0, _appiumIosSimulator.killAllSimulators)();
            }

            await _bluebird.default.delay(5000);
          }
        } else {
          _logger.default.errorAndThrow('We exceeded the number of retries allowed for ' + 'instruments to successfully start; failing launch');
        }
      }
    } while (true);
  }

  registerLaunch() {
    this.launchResultDeferred.resolve();
  }

  async spawnInstruments() {
    let traceDir;

    for (let i = 0;; i++) {
      traceDir = _path.default.resolve(this.traceDir, `instrumentscli${i}.trace`);
      if (!(await _appiumSupport.fs.exists(traceDir))) break;
    }

    let args = ['-t', this.template, '-D', traceDir];

    if (this.udid) {
      args = args.concat(['-w', this.udid]);

      _logger.default.debug(`Attempting to run app on real device with UDID '${this.udid}'`);
    }

    if (!this.udid && this.simulatorSdkAndDevice) {
      args = args.concat(['-w', this.simulatorSdkAndDevice]);

      _logger.default.debug(`Attempting to run app on ${this.simulatorSdkAndDevice}`);
    }

    args = args.concat([this.app]);

    if (this.processArguments) {
      _logger.default.debug(`Attempting to run app with process arguments: ${JSON.stringify(this.processArguments)}`);

      if (_lodash.default.isString(this.processArguments)) {
        if (this.processArguments.indexOf('-e ') === -1) {
          _logger.default.debug('Plain string process arguments being pushed into arguments');

          args.push(this.processArguments);
        } else {
          _logger.default.debug('Environment variables being pushed into arguments');

          for (let arg of this.processArguments.split('-e ')) {
            arg = arg.trim();

            if (arg.length) {
              let space = arg.indexOf(' ');
              let flag = arg.substring(0, space);
              let value = arg.substring(space + 1);
              args.push('-e', flag, value);
            }
          }
        }
      } else {
        for (let [flag, value] of _lodash.default.toPairs(this.processArguments)) {
          args.push('-e', flag, value);
        }
      }
    }

    args = args.concat(['-e', 'UIASCRIPT', this.bootstrap]);
    args = args.concat(['-e', 'UIARESULTSPATH', this.tmpDir]);

    if (this.language) {
      args = args.concat([`-AppleLanguages (${this.language})`]);
      args = args.concat([`-NSLanguages (${this.language})`]);
    }

    if (this.locale) {
      args = args.concat([`-AppleLocale ${this.locale}`]);
    }

    let env = _lodash.default.clone(process.env);

    if (this.xcodeVersion.major >= 7 && !this.udid) {
      _logger.default.info("On xcode 7.0+, instruments-without-delay does not work, " + "skipping instruments-without-delay");

      this.withoutDelay = false;
    }

    let iwdPath = await (0, _utils.getIwdPath)(this.xcodeVersion.major);
    env.CA_DEBUG_TRANSACTIONS = 1;

    if (this.withoutDelay && !this.udid) {
      env.DYLD_INSERT_LIBRARIES = _path.default.resolve(iwdPath, 'InstrumentsShim.dylib');
      env.LIB_PATH = iwdPath;
    }

    let instrumentsExecArgs = [this.instrumentsPath, ...args];
    instrumentsExecArgs = _lodash.default.map(instrumentsExecArgs, function (arg) {
      if (arg === null) {
        throw new Error('A null value was passed as an arg to execute ' + 'instruments on the command line. A letiable is ' + 'probably not getting set. Array of command args: ' + JSON.stringify(instrumentsExecArgs));
      }

      if (_lodash.default.isString(arg) && arg.indexOf(' ') !== -1) {
        return `"${arg}"`;
      }

      return arg;
    });

    _logger.default.debug(`Spawning instruments with command: '${instrumentsExecArgs.join(' ')}'`);

    if (this.withoutDelay) {
      _logger.default.debug('And extra without-delay env: ' + JSON.stringify({
        DYLD_INSERT_LIBRARIES: env.DYLD_INSERT_LIBRARIES,
        LIB_PATH: env.LIB_PATH
      }));
    }

    _logger.default.debug(`And launch timeouts (in ms): ${JSON.stringify(this.launchTimeout)}`);

    return await (0, _teen_process.spawn)(this.instrumentsPath, args, {
      env
    });
  }

  addSocketConnectTimer(delay, type, doAction) {
    let socketConnectDelay = (0, _appiumSupport.cancellableDelay)(delay);
    socketConnectDelay.then(() => {
      _logger.default.warn(`Instruments socket client never checked in; timing out (${type})`);

      return doAction();
    }).catch(_bluebird.default.CancellationError, () => {}).done();
    this.socketConnectDelays.push(socketConnectDelay);
  }

  clearSocketConnectTimers() {
    for (let delay of this.socketConnectDelays) {
      delay.cancel();
    }

    this.socketConnectDelays = [];
  }

  setExitListener(exitListener) {
    if (!this.proc) return;

    if (this.exitListener) {
      this.proc.removeListener('exit', this.exitListener);
    }

    this.exitListener = exitListener;
    this.proc.on('exit', exitListener);
  }

  killInstruments() {
    if (!this.proc) return;

    _logger.default.debug(`Kill Instruments process (pid: ${this.proc.pid})`);

    return new _bluebird.default(async resolve => {
      let wasTerminated = false;
      let termDelay = (0, _appiumSupport.cancellableDelay)(this.termTimeout);
      let termPromise = termDelay.catch(_bluebird.default.CancellationError, () => {});
      this.setExitListener(() => {
        this.proc = null;
        wasTerminated = true;
        termDelay.cancel();
        resolve();
      });

      _logger.default.debug('Sending SIGTERM');

      this.proc.kill('SIGTERM');
      await termPromise;

      if (!wasTerminated) {
        _logger.default.warn(`Instruments did not terminate after ${this.termTimeout / 1000} seconds!`);

        _logger.default.debug('Sending SIGKILL');

        this.proc.kill('SIGKILL');

        if (_lodash.default.isFunction(this.exitListener)) {
          this.exitListener();
        }
      }
    });
  }

  async shutdown() {
    _logger.default.debug('Starting shutdown.');

    await this.killInstruments();
    this.onShutdownDeferred.resolve();
  }

}

var _default = Instruments;
exports.default = _default;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9pbnN0cnVtZW50cy9pbnN0cnVtZW50cy5qcyJdLCJuYW1lcyI6WyJFUlJfTkVWRVJfQ0hFQ0tFRF9JTiIsIkVSUl9DUkFTSEVEX09OX1NUQVJUVVAiLCJFUlJfQU1CSUdVT1VTX0RFVklDRSIsIkluc3RydW1lbnRzIiwicXVpY2tJbnN0cnVtZW50cyIsIm9wdHMiLCJfIiwiY2xvbmUiLCJ4Y29kZVRyYWNlVGVtcGxhdGVQYXRoIiwieGNvZGUiLCJnZXRBdXRvbWF0aW9uVHJhY2VUZW1wbGF0ZVBhdGgiLCJkZWZhdWx0cyIsImxhdW5jaFRpbWVvdXQiLCJ0ZW1wbGF0ZSIsIndpdGhvdXREZWxheSIsInhjb2RlVmVyc2lvbiIsIndlYlNvY2tldCIsImZsYWtleVJldHJpZXMiLCJjb25zdHJ1Y3RvciIsImNsb25lRGVlcCIsInRlcm1UaW1lb3V0IiwidG1wRGlyIiwicmVhbERldmljZSIsInByb3BzIiwiZiIsInRyYWNlRGlyIiwicHJvYyIsImluc3RydW1lbnRzUGF0aCIsImxhdW5jaFRyaWVzIiwic29ja2V0Q29ubmVjdERlbGF5cyIsImdvdEZCU09wZW5BcHBsaWNhdGlvbkVycm9yIiwib25TaHV0ZG93biIsIkIiLCJyZXNvbHZlIiwicmVqZWN0Iiwib25TaHV0ZG93bkRlZmVycmVkIiwiY2F0Y2giLCJkb25lIiwiY29uZmlndXJlIiwiZ2V0VmVyc2lvbiIsInZlcnNpb25GbG9hdCIsImxvZyIsImluZm8iLCJ2ZXJzaW9uU3RyaW5nIiwiRXJyb3IiLCJtYWpvciIsImxhdW5jaE9uY2UiLCJmcyIsInJpbXJhZiIsImV4aXRMaXN0ZW5lciIsInNwYXduSW5zdHJ1bWVudHMiLCJvbiIsImNvZGUiLCJzaWduYWwiLCJtc2ciLCJkZWJ1ZyIsImxhdW5jaFJlc3VsdFByb21pc2UiLCJsYXVuY2hSZXN1bHREZWZlcnJlZCIsInNldEV4aXRMaXN0ZW5lciIsImVyciIsIm1lc3NhZ2UiLCJpbmRleE9mIiwiZXJyb3IiLCJzdGRvdXQiLCJzZXRFbmNvZGluZyIsInBpcGUiLCJzdGRlcnIiLCJhY3RPblN0ZGVyciIsIm91dHB1dCIsImFmdGVyU2ltTGF1bmNoIiwibWF0Y2giLCJhZGRTb2NrZXRDb25uZWN0VGltZXIiLCJraWxsSW5zdHJ1bWVudHMiLCJmYnNFcnJTdHIiLCJzaW11bGF0b3JTZGtBbmREZXZpY2UiLCJxdWV1ZSIsImdsb2JhbCIsImNsZWFyU29ja2V0Q29ubmVjdFRpbWVycyIsImxhdW5jaCIsImVycklzQ2F0Y2hhYmxlIiwiZGVsYXkiLCJlcnJvckFuZFRocm93IiwicmVnaXN0ZXJMYXVuY2giLCJpIiwicGF0aCIsImV4aXN0cyIsImFyZ3MiLCJ1ZGlkIiwiY29uY2F0IiwiYXBwIiwicHJvY2Vzc0FyZ3VtZW50cyIsIkpTT04iLCJzdHJpbmdpZnkiLCJpc1N0cmluZyIsInB1c2giLCJhcmciLCJzcGxpdCIsInRyaW0iLCJsZW5ndGgiLCJzcGFjZSIsImZsYWciLCJzdWJzdHJpbmciLCJ2YWx1ZSIsInRvUGFpcnMiLCJib290c3RyYXAiLCJsYW5ndWFnZSIsImxvY2FsZSIsImVudiIsInByb2Nlc3MiLCJpd2RQYXRoIiwiQ0FfREVCVUdfVFJBTlNBQ1RJT05TIiwiRFlMRF9JTlNFUlRfTElCUkFSSUVTIiwiTElCX1BBVEgiLCJpbnN0cnVtZW50c0V4ZWNBcmdzIiwibWFwIiwiam9pbiIsInR5cGUiLCJkb0FjdGlvbiIsInNvY2tldENvbm5lY3REZWxheSIsInRoZW4iLCJ3YXJuIiwiQ2FuY2VsbGF0aW9uRXJyb3IiLCJjYW5jZWwiLCJyZW1vdmVMaXN0ZW5lciIsInBpZCIsIndhc1Rlcm1pbmF0ZWQiLCJ0ZXJtRGVsYXkiLCJ0ZXJtUHJvbWlzZSIsImtpbGwiLCJpc0Z1bmN0aW9uIiwic2h1dGRvd24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBR0EsTUFBTUEsb0JBQW9CLEdBQUcsOEJBQTdCO0FBQ0EsTUFBTUMs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LFVBQUYsQ0FBYSxLQUFLaEYsWUFBbEIsQ0FBSixFQUFxQztBQUNuQyxlQUFLQSxZQUFMO0FBQ0Q7QUFDRjtBQUNGLEtBdEJNLENBQVA7QUF1QkQ7O0FBR0QsUUFBTWlGLFFBQU4sR0FBa0I7QUFDaEJ6RixvQkFBSWMsS0FBSixDQUFVLG9CQUFWOztBQUNBLFVBQU0sS0FBS2lCLGVBQUwsRUFBTjtBQUNBLFNBQUtyQyxrQkFBTCxDQUF3QkYsT0FBeEI7QUFDRDs7QUE3WGU7O2VBZ1lIOUIsVyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFdyYXBwZXIgYXJvdW5kIEFwcGxlJ3MgSW5zdHJ1bWVudHMgYXBwXG5cbmltcG9ydCB7IHNwYXduIH0gZnJvbSAndGVlbl9wcm9jZXNzJztcbmltcG9ydCBsb2cgZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IHRocm91Z2ggfSBmcm9tICd0aHJvdWdoJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgbWtkaXJwLCBmcywgY2FuY2VsbGFibGVEZWxheSB9IGZyb20gJ2FwcGl1bS1zdXBwb3J0JztcbmltcG9ydCB4Y29kZSBmcm9tICdhcHBpdW0teGNvZGUnO1xuaW1wb3J0IEIgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IHsga2lsbEFsbFNpbXVsYXRvcnMgfSBmcm9tICdhcHBpdW0taW9zLXNpbXVsYXRvcic7XG5pbXBvcnQgeyBnZXRJbnN0cnVtZW50c1BhdGgsIHBhcnNlTGF1bmNoVGltZW91dCwgZ2V0SXdkUGF0aCB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgb3V0cHV0U3RyZWFtLCBlcnJvclN0cmVhbSwgd2ViU29ja2V0QWxlcnRTdHJlYW0sIGR1bXBTdHJlYW0gfSBmcm9tICcuL3N0cmVhbXMnO1xuaW1wb3J0ICdjb2xvcnMnO1xuXG5cbmNvbnN0IEVSUl9ORVZFUl9DSEVDS0VEX0lOID0gJ0luc3RydW1lbnRzIG5ldmVyIGNoZWNrZWQgaW4nO1xuY29uc3QgRVJSX0NSQVNIRURfT05fU1RBUlRVUCA9ICdJbnN0cnVtZW50cyBjcmFzaGVkIG9uIHN0YXJ0dXAnO1xuY29uc3QgRVJSX0FNQklHVU9VU19ERVZJQ0UgPSAnSW5zdHJ1bWVudHMgVXNhZ2UgRXJyb3IgOiBBbWJpZ3VvdXMgZGV2aWNlIG5hbWUvaWRlbnRpZmllcic7XG5cbmNsYXNzIEluc3RydW1lbnRzIHtcbiAgLy8gc2ltcGxlIGZhY3Rvcnkgd2l0aCBzYW5lIGRlZmF1bHRzXG4gIHN0YXRpYyBhc3luYyBxdWlja0luc3RydW1lbnRzIChvcHRzKSB7XG4gICAgb3B0cyA9IF8uY2xvbmUob3B0cyk7XG4gICAgbGV0IHhjb2RlVHJhY2VUZW1wbGF0ZVBhdGggPSBhd2FpdCB4Y29kZS5nZXRBdXRvbWF0aW9uVHJhY2VUZW1wbGF0ZVBhdGgoKTtcbiAgICBfLmRlZmF1bHRzKG9wdHMsIHtcbiAgICAgIGxhdW5jaFRpbWVvdXQ6IDYwMDAwLFxuICAgICAgdGVtcGxhdGU6IHhjb2RlVHJhY2VUZW1wbGF0ZVBhdGgsXG4gICAgICB3aXRob3V0RGVsYXk6IHRydWUsXG4gICAgICB4Y29kZVZlcnNpb246ICc4LjEnLFxuICAgICAgd2ViU29ja2V0OiBudWxsLFxuICAgICAgZmxha2V5UmV0cmllczogMlxuICAgIH0pO1xuICAgIHJldHVybiBuZXcgSW5zdHJ1bWVudHMob3B0cyk7XG4gIH1cblxuICAvKlxuICAgKiBvcHRzOlxuICAgKiAgIC0gYXBwXG4gICAqICAgLSB0ZXJtVGltZW91dCAtIGRlZmF1bHRzIHRvIDUwMDBcbiAgICogICAtIGZsYWtleVJldHJpZXMgLSBkZWZhdWx0cyB0byAwXG4gICAqICAgLSB1ZGlkXG4gICAqICAgLSBib290c3RyYXBcbiAgICogICAtIHRlbXBsYXRlXG4gICAqICAgLSB3aXRob3V0RGVsYXlcbiAgICogICAtIHByb2Nlc3NBcmd1bWVudHNcbiAgICogICAtIHNpbXVsYXRvclNka0FuZERldmljZVxuICAgKiAgIC0gdG1wRGlyIC0gZGVmYXVsdHMgdG8gYC90bXAvYXBwaXVtLWluc3RydW1lbnRzYFxuICAgKiAgIC0gdHJhY2VEaXJcbiAgICogICAtIGxhdW5jaFRpbWVvdXQgLSBkZWZhdWx0cyB0byA5MDAwMFxuICAgKiAgIC0gd2ViU29ja2V0XG4gICAqICAgLSBpbnN0cnVtZW50c1BhdGhcbiAgICogICAtIHJlYWxEZXZpY2UgLSB0cnVlL2ZhbHNlLCBkZWZhdWx0cyB0byBmYWxzZVxuICAgKi9cbiAgY29uc3RydWN0b3IgKG9wdHMpIHtcbiAgICBvcHRzID0gXy5jbG9uZURlZXAob3B0cyk7XG4gICAgXy5kZWZhdWx0cyhvcHRzLCB7XG4gICAgICB0ZXJtVGltZW91dDogNTAwMCxcbiAgICAgIHRtcERpcjogJy90bXAvYXBwaXVtLWluc3RydW1lbnRzJyxcbiAgICAgIGxhdW5jaFRpbWVvdXQ6IDkwMDAwLFxuICAgICAgZmxha2V5UmV0cmllczogMCxcbiAgICAgIHJlYWxEZXZpY2U6IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBjb25maWdcbiAgICBjb25zdCBwcm9wcyA9IFtcbiAgICAgICdhcHAnLCAndGVybVRpbWVvdXQnLCAnZmxha2V5UmV0cmllcycsICd1ZGlkJywgJ2Jvb3RzdHJhcCcsXG4gICAgICAndGVtcGxhdGUnLCAnd2l0aG91dERlbGF5JywgJ3Byb2Nlc3NBcmd1bWVudHMnLCAncmVhbERldmljZScsXG4gICAgICAnc2ltdWxhdG9yU2RrQW5kRGV2aWNlJywgJ3RtcERpcicsICd0cmFjZURpcicsICdsb2NhbGUnLCAnbGFuZ3VhZ2UnLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBmIG9mIHByb3BzKSB7XG4gICAgICB0aGlzW2ZdID0gb3B0c1tmXTtcbiAgICB9XG4gICAgdGhpcy50cmFjZURpciA9IHRoaXMudHJhY2VEaXIgfHwgdGhpcy50bXBEaXI7XG4gICAgdGhpcy5sYXVuY2hUaW1lb3V0ID0gcGFyc2VMYXVuY2hUaW1lb3V0KG9wdHMubGF1bmNoVGltZW91dCk7XG5cbiAgICAvLyBzdGF0ZVxuICAgIHRoaXMucHJvYyA9IG51bGw7XG4gICAgdGhpcy53ZWJTb2NrZXQgPSBvcHRzLndlYlNvY2tldDtcbiAgICB0aGlzLmluc3RydW1lbnRzUGF0aCA9IG9wdHMuaW5zdHJ1bWVudHNQYXRoO1xuICAgIHRoaXMubGF1bmNoVHJpZXMgPSAwO1xuICAgIHRoaXMuc29ja2V0Q29ubmVjdERlbGF5cyA9IFtdO1xuICAgIHRoaXMuZ290RkJTT3BlbkFwcGxpY2F0aW9uRXJyb3IgPSBmYWxzZTtcbiAgICB0aGlzLm9uU2h1dGRvd24gPSBuZXcgQigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLm9uU2h1dGRvd25EZWZlcnJlZCA9IHtyZXNvbHZlLCByZWplY3R9O1xuICAgIH0pO1xuICAgIC8vIGF2b2lkcyBVbmhhbmRsZWRFeGNlcHRpb25cbiAgICB0aGlzLm9uU2h1dGRvd24uY2F0Y2goKCkgPT4ge30pLmRvbmUoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBwcm9taXNlL2NhdGNoLW9yLXJldHVyblxuICB9XG5cbiAgYXN5bmMgY29uZmlndXJlICgpIHtcbiAgICBpZiAoIXRoaXMueGNvZGVWZXJzaW9uKSB7XG4gICAgICB0aGlzLnhjb2RlVmVyc2lvbiA9IGF3YWl0IHhjb2RlLmdldFZlcnNpb24odHJ1ZSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnhjb2RlVmVyc2lvbi52ZXJzaW9uRmxvYXQgPT09IDYuMCAmJiB0aGlzLndpdGhvdXREZWxheSkge1xuICAgICAgbG9nLmluZm8oJ0luIHhjb2RlIDYuMCwgaW5zdHJ1bWVudHMtd2l0aG91dC1kZWxheSBkb2VzIG5vdCB3b3JrLiAnICtcbiAgICAgICAgICAgICAgICdJZiB1c2luZyBBcHBpdW0sIHlvdSBjYW4gZGlzYWJsZSBpbnN0cnVtZW50cy13aXRob3V0LWRlbGF5ICcgK1xuICAgICAgICAgICAgICAgJ3dpdGggdGhlIC0tbmF0aXZlLWluc3RydW1lbnRzLWxpYiBzZXJ2ZXIgZmxhZycpO1xuICAgIH1cbiAgICBpZiAodGhpcy54Y29kZVZlcnNpb24udmVyc2lvblN0cmluZyA9PT0gJzUuMC4xJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdYY29kZSA1LjAuMSBzaGlwcyB3aXRoIGEgYnJva2VuIHZlcnNpb24gb2YgJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ0luc3RydW1lbnRzLiBwbGVhc2UgdXBncmFkZSB0byA1LjAuMicpO1xuICAgIH1cbiAgICBpZiAodGhpcy54Y29kZVZlcnNpb24ubWFqb3IgPiA3KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluc3RydW1lbnRzLWJhc2VkIGF1dG9tYXRpb24gd2FzIHJlbW92ZWQgaW4gWGNvZGUgOC4gYCArXG4gICAgICAgICAgICAgICAgICAgICAgYFhjb2RlICR7dGhpcy54Y29kZVZlcnNpb24udmVyc2lvblN0cmluZ30gaXMgbm90IHN1cHBvcnRlZC4gYCArXG4gICAgICAgICAgICAgICAgICAgICAgYFBsZWFzZSB0cnkgdGhlIFhDVUl0ZXN0IGRyaXZlci5gKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMudGVtcGxhdGUpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUgPSBhd2FpdCB4Y29kZS5nZXRBdXRvbWF0aW9uVHJhY2VUZW1wbGF0ZVBhdGgoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaW5zdHJ1bWVudHNQYXRoKSB7XG4gICAgICB0aGlzLmluc3RydW1lbnRzUGF0aCA9IGF3YWl0IGdldEluc3RydW1lbnRzUGF0aCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGxhdW5jaE9uY2UgKCkge1xuICAgIGxvZy5pbmZvKCdMYXVuY2hpbmcgaW5zdHJ1bWVudHMnKTtcbiAgICAvLyBwcmVwYXJlIHRlbXAgZGlyXG4gICAgYXdhaXQgZnMucmltcmFmKHRoaXMudG1wRGlyKTtcbiAgICBhd2FpdCBta2RpcnAodGhpcy50bXBEaXIpO1xuICAgIGF3YWl0IG1rZGlycCh0aGlzLnRyYWNlRGlyKTtcblxuICAgIHRoaXMuZXhpdExpc3RlbmVyID0gbnVsbDtcbiAgICB0aGlzLnByb2MgPSBhd2FpdCB0aGlzLnNwYXduSW5zdHJ1bWVudHMoKTtcbiAgICB0aGlzLnByb2Mub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBjb25zdCBtc2cgPSBjb2RlICE9PSBudWxsID8gYGNvZGU6ICR7Y29kZX1gIDogYHNpZ25hbDogJHtzaWduYWx9YDtcbiAgICAgIGxvZy5kZWJ1ZyhgSW5zdHJ1bWVudHMgZXhpdGVkIHdpdGggJHttc2d9YCk7XG4gICAgfSk7XG5cbiAgICAvLyBzZXQgdXAgdGhlIHByb21pc2UgdG8gaGFuZGxlIGxhdW5jaFxuICAgIGxldCBsYXVuY2hSZXN1bHRQcm9taXNlID0gbmV3IEIoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5sYXVuY2hSZXN1bHREZWZlcnJlZCA9IHtyZXNvbHZlLCByZWplY3R9O1xuICAgIH0pO1xuXG4gICAgLy8gVGhlcmUgd2FzIGEgc3BlY2lhbCBjYXNlIGZvciBpZ25vcmVTdGFydHVwRXhpdFxuICAgIC8vIGJ1dCBpdCBpcyBub3QgbmVlZGVkIGFueW1vcmUsIHlvdSBtYXkganVzdCBsaXN0ZW4gZm9yIGV4aXQuXG4gICAgdGhpcy5zZXRFeGl0TGlzdGVuZXIoKCkgPT4ge1xuICAgICAgdGhpcy5wcm9jID0gbnVsbDtcbiAgICAgIHRoaXMubGF1bmNoUmVzdWx0RGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcihFUlJfQ1JBU0hFRF9PTl9TVEFSVFVQKSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnByb2Mub24oJ2Vycm9yJywgKGVycikgPT4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByb21pc2UvcHJlZmVyLWF3YWl0LXRvLWNhbGxiYWNrc1xuICAgICAgbG9nLmRlYnVnKGBFcnJvciB3aXRoIGluc3RydW1lbnRzIHByb2M6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICBpZiAoZXJyLm1lc3NhZ2UuaW5kZXhPZignRU5PRU5UJykgIT09IC0xKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGw7IC8vIG90aGVyd2lzZSB3ZSdsbCB0cnkgdG8gc2VuZCBzaWdraWxsXG4gICAgICAgIGxvZy5lcnJvcihgVW5hYmxlIHRvIHNwYXduIGluc3RydW1lbnRzOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB0aGlzLmxhdW5jaFJlc3VsdERlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5wcm9jLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgIHRoaXMucHJvYy5zdGRvdXQucGlwZShvdXRwdXRTdHJlYW0oKSkucGlwZShkdW1wU3RyZWFtKCkpO1xuXG4gICAgdGhpcy5wcm9jLnN0ZGVyci5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgIGxldCBhY3RPblN0ZGVyciA9IChvdXRwdXQpID0+IHtcbiAgICAgIGlmICh0aGlzLmxhdW5jaFRpbWVvdXQuYWZ0ZXJTaW1MYXVuY2ggJiYgb3V0cHV0ICYmIG91dHB1dC5tYXRjaCgvQ0xUaWxlc01hbmFnZXJDbGllbnQ6IGluaXRpYWxpemUvKSkge1xuICAgICAgICB0aGlzLmFkZFNvY2tldENvbm5lY3RUaW1lcih0aGlzLmxhdW5jaFRpbWVvdXQuYWZ0ZXJTaW1MYXVuY2gsICdhZnRlckxhdW5jaCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmtpbGxJbnN0cnVtZW50cygpO1xuICAgICAgICAgIHRoaXMubGF1bmNoUmVzdWx0RGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcihFUlJfTkVWRVJfQ0hFQ0tFRF9JTikpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgbGV0IGZic0VyclN0ciA9ICcoRkJTT3BlbkFwcGxpY2F0aW9uRXJyb3JEb21haW4gZXJyb3IgOC4pJztcbiAgICAgIGlmIChvdXRwdXQuaW5kZXhPZihmYnNFcnJTdHIpICE9PSAtMSkge1xuICAgICAgICB0aGlzLmdvdEZCU09wZW5BcHBsaWNhdGlvbkVycm9yID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG91dHB1dC5pbmRleE9mKEVSUl9BTUJJR1VPVVNfREVWSUNFKSAhPT0gLTEpIHtcbiAgICAgICAgbGV0IG1zZyA9IGAke0VSUl9BTUJJR1VPVVNfREVWSUNFfTogJyR7dGhpcy5zaW11bGF0b3JTZGtBbmREZXZpY2V9J2A7XG4gICAgICAgIHRoaXMubGF1bmNoUmVzdWx0RGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcihtc2cpKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMucHJvYy5zdGRlcnIucGlwZSh0aHJvdWdoKGZ1bmN0aW9uIChvdXRwdXQpIHtcbiAgICAgIGFjdE9uU3RkZXJyKG91dHB1dCk7XG4gICAgICB0aGlzLnF1ZXVlKG91dHB1dCk7XG4gICAgfSkpLnBpcGUoZXJyb3JTdHJlYW0oKSlcbiAgICAucGlwZSh3ZWJTb2NrZXRBbGVydFN0cmVhbSh0aGlzLndlYlNvY2tldCkpXG4gICAgLnBpcGUoZHVtcFN0cmVhbSgpKTtcblxuICAgIC8vIHN0YXJ0IHdhaXRpbmcgZm9yIGluc3RydW1lbnRzIHRvIGxhdW5jaCBzdWNjZXNzZnVsbHlcbiAgICB0aGlzLmFkZFNvY2tldENvbm5lY3RUaW1lcih0aGlzLmxhdW5jaFRpbWVvdXQuZ2xvYmFsLCAnZ2xvYmFsJywgYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgdGhpcy5raWxsSW5zdHJ1bWVudHMoKTtcbiAgICAgIHRoaXMubGF1bmNoUmVzdWx0RGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcihFUlJfTkVWRVJfQ0hFQ0tFRF9JTikpO1xuICAgIH0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGxhdW5jaFJlc3VsdFByb21pc2U7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuY2xlYXJTb2NrZXRDb25uZWN0VGltZXJzKCk7XG4gICAgfVxuICAgIHRoaXMuc2V0RXhpdExpc3RlbmVyKChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIHRoaXMucHJvYyA9IG51bGw7XG4gICAgICBjb25zdCBtc2cgPSBjb2RlICE9PSBudWxsID8gYGNvZGU6ICR7Y29kZX1gIDogYHNpZ25hbDogJHtzaWduYWx9YDtcbiAgICAgIHRoaXMub25TaHV0ZG93bkRlZmVycmVkLnJlamVjdChuZXcgRXJyb3IoYEFibm9ybWFsIGV4aXQgd2l0aCAke21zZ31gKSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBsYXVuY2ggKCkge1xuICAgIGF3YWl0IHRoaXMuY29uZmlndXJlKCk7XG4gICAgbGV0IGxhdW5jaFRyaWVzID0gMDtcbiAgICBkbyB7XG4gICAgICBsYXVuY2hUcmllcysrO1xuICAgICAgbG9nLmRlYnVnKGBBdHRlbXB0aW5nIHRvIGxhdW5jaCBpbnN0cnVtZW50cywgdGhpcyBpcyB0cnkgIyR7bGF1bmNoVHJpZXN9YCk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMubGF1bmNoT25jZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBsb2cuZXJyb3IoYEVycm9yIGxhdW5jaGluZyBpbnN0cnVtZW50czogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgbGV0IGVycklzQ2F0Y2hhYmxlID0gZXJyLm1lc3NhZ2UgPT09IEVSUl9ORVZFUl9DSEVDS0VEX0lOIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyci5tZXNzYWdlID09PSBFUlJfQ1JBU0hFRF9PTl9TVEFSVFVQO1xuICAgICAgICBpZiAoIWVycklzQ2F0Y2hhYmxlKSB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsYXVuY2hUcmllcyA8PSB0aGlzLmZsYWtleVJldHJpZXMpIHtcbiAgICAgICAgICBpZiAodGhpcy5nb3RGQlNPcGVuQXBwbGljYXRpb25FcnJvcikge1xuICAgICAgICAgICAgbG9nLmRlYnVnKCdHb3QgdGhlIEZCU09wZW5BcHBsaWNhdGlvbkVycm9yLCBub3Qga2lsbGluZyB0aGUgJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ3NpbSBidXQgbGVhdmluZyBpdCBvcGVuIHNvIHRoZSBhcHAgd2lsbCBsYXVuY2gnKTtcbiAgICAgICAgICAgIHRoaXMuZ290RkJTT3BlbkFwcGxpY2F0aW9uRXJyb3IgPSBmYWxzZTsgLy8gY2xlYXIgb3V0IGZvciBuZXh0IGxhdW5jaFxuICAgICAgICAgICAgYXdhaXQgQi5kZWxheSgxMDAwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnJlYWxEZXZpY2UpIHtcbiAgICAgICAgICAgICAgYXdhaXQga2lsbEFsbFNpbXVsYXRvcnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF3YWl0IEIuZGVsYXkoNTAwMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZy5lcnJvckFuZFRocm93KCdXZSBleGNlZWRlZCB0aGUgbnVtYmVyIG9mIHJldHJpZXMgYWxsb3dlZCBmb3IgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2luc3RydW1lbnRzIHRvIHN1Y2Nlc3NmdWxseSBzdGFydDsgZmFpbGluZyBsYXVuY2gnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gd2hpbGUgKHRydWUpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnN0YW50LWNvbmRpdGlvblxuICB9XG5cbiAgcmVnaXN0ZXJMYXVuY2ggKCkge1xuICAgIHRoaXMubGF1bmNoUmVzdWx0RGVmZXJyZWQucmVzb2x2ZSgpO1xuICB9XG5cbiAgYXN5bmMgc3Bhd25JbnN0cnVtZW50cyAoKSB7XG4gICAgbGV0IHRyYWNlRGlyO1xuICAgIGZvciAobGV0IGkgPSAwOyA7IGkrKykge1xuICAgICAgLy8gbG9vcCB3aGlsZSB0aGVyZSBhcmUgdHJhY2VkaXJzIHRvIGRlbGV0ZVxuICAgICAgdHJhY2VEaXIgPSBwYXRoLnJlc29sdmUodGhpcy50cmFjZURpciwgYGluc3RydW1lbnRzY2xpJHtpfS50cmFjZWApO1xuICAgICAgaWYgKCFhd2FpdCBmcy5leGlzdHModHJhY2VEaXIpKSBicmVhazsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuICAgIH1cblxuICAgIC8vIGJ1aWxkIHVwIHRoZSBhcmd1bWVudHMgdG8gdXNlXG4gICAgbGV0IGFyZ3MgPSBbJy10JywgdGhpcy50ZW1wbGF0ZSwgJy1EJywgdHJhY2VEaXJdO1xuICAgIGlmICh0aGlzLnVkaWQpIHtcbiAgICAgIC8vIHJlYWwgZGV2aWNlLCBzbyBzcGVjaWZ5IHVkaWRcbiAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChbJy13JywgdGhpcy51ZGlkXSk7XG4gICAgICBsb2cuZGVidWcoYEF0dGVtcHRpbmcgdG8gcnVuIGFwcCBvbiByZWFsIGRldmljZSB3aXRoIFVESUQgJyR7dGhpcy51ZGlkfSdgKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLnVkaWQgJiYgdGhpcy5zaW11bGF0b3JTZGtBbmREZXZpY2UpIHtcbiAgICAgIC8vIHNpbSwgc28gc3BlY2lmeSB0aGUgc2RrIGFuZCBkZXZpY2VcbiAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChbJy13JywgdGhpcy5zaW11bGF0b3JTZGtBbmREZXZpY2VdKTtcbiAgICAgIGxvZy5kZWJ1ZyhgQXR0ZW1wdGluZyB0byBydW4gYXBwIG9uICR7dGhpcy5zaW11bGF0b3JTZGtBbmREZXZpY2V9YCk7XG4gICAgfVxuICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChbdGhpcy5hcHBdKTtcbiAgICBpZiAodGhpcy5wcm9jZXNzQXJndW1lbnRzKSB7XG4gICAgICBsb2cuZGVidWcoYEF0dGVtcHRpbmcgdG8gcnVuIGFwcCB3aXRoIHByb2Nlc3MgYXJndW1lbnRzOiAke0pTT04uc3RyaW5naWZ5KHRoaXMucHJvY2Vzc0FyZ3VtZW50cyl9YCk7XG4gICAgICAvLyBhbnkgYWRkaXRpb25hbCBzdHVmZiBzcGVjaWZpZWQgYnkgdGhlIHVzZXJcblxuICAgICAgaWYgKF8uaXNTdHJpbmcodGhpcy5wcm9jZXNzQXJndW1lbnRzKSkge1xuICAgICAgICBpZiAodGhpcy5wcm9jZXNzQXJndW1lbnRzLmluZGV4T2YoJy1lICcpID09PSAtMSkge1xuICAgICAgICAgIGxvZy5kZWJ1ZygnUGxhaW4gc3RyaW5nIHByb2Nlc3MgYXJndW1lbnRzIGJlaW5nIHB1c2hlZCBpbnRvIGFyZ3VtZW50cycpO1xuICAgICAgICAgIGFyZ3MucHVzaCh0aGlzLnByb2Nlc3NBcmd1bWVudHMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZy5kZWJ1ZygnRW52aXJvbm1lbnQgdmFyaWFibGVzIGJlaW5nIHB1c2hlZCBpbnRvIGFyZ3VtZW50cycpO1xuICAgICAgICAgIGZvciAobGV0IGFyZyBvZiB0aGlzLnByb2Nlc3NBcmd1bWVudHMuc3BsaXQoJy1lICcpKSB7XG4gICAgICAgICAgICBhcmcgPSBhcmcudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGFyZy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgbGV0IHNwYWNlID0gYXJnLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgbGV0IGZsYWcgPSBhcmcuc3Vic3RyaW5nKDAsIHNwYWNlKTtcbiAgICAgICAgICAgICAgbGV0IHZhbHVlID0gYXJnLnN1YnN0cmluZyhzcGFjZSArIDEpO1xuICAgICAgICAgICAgICBhcmdzLnB1c2goJy1lJywgZmxhZywgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcHJvY2VzcyBhcmd1bWVudHMgY2FuIGFsc28gYmUgYSBoYXNoIG9mIGZsYWdzIGFuZCB2YWx1ZXNcbiAgICAgICAgLy8ge1wicHJvY2Vzc0FyZ3VtZW50c1wiOiB7XCJmbGFnMVwiOiBcInZhbHVlMVwiLCBcImZsYWcyXCI6IFwidmFsdWUyXCJ9fVxuICAgICAgICBmb3IgKGxldCBbZmxhZywgdmFsdWVdIG9mIF8udG9QYWlycyh0aGlzLnByb2Nlc3NBcmd1bWVudHMpKSB7XG4gICAgICAgICAgYXJncy5wdXNoKCctZScsIGZsYWcsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBhcmdzID0gYXJncy5jb25jYXQoWyctZScsICdVSUFTQ1JJUFQnLCB0aGlzLmJvb3RzdHJhcF0pO1xuICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChbJy1lJywgJ1VJQVJFU1VMVFNQQVRIJywgdGhpcy50bXBEaXJdKTtcbiAgICBpZiAodGhpcy5sYW5ndWFnZSkge1xuICAgICAgYXJncyA9IGFyZ3MuY29uY2F0KFtgLUFwcGxlTGFuZ3VhZ2VzICgke3RoaXMubGFuZ3VhZ2V9KWBdKTtcbiAgICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChbYC1OU0xhbmd1YWdlcyAoJHt0aGlzLmxhbmd1YWdlfSlgXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmxvY2FsZSkge1xuICAgICAgYXJncyA9IGFyZ3MuY29uY2F0KFtgLUFwcGxlTG9jYWxlICR7dGhpcy5sb2NhbGV9YF0pO1xuICAgIH1cblxuICAgIGxldCBlbnYgPSBfLmNsb25lKHByb2Nlc3MuZW52KTtcbiAgICBpZiAodGhpcy54Y29kZVZlcnNpb24ubWFqb3IgPj0gNyAmJiAhdGhpcy51ZGlkKSB7XG4gICAgICAvLyBpd2QgY3VycmVudGx5IGRvZXMgbm90IHdvcmsgd2l0aCB4Y29kZTcsIHNldHRpbmcgd2l0aG91dERlbGF5IHRvIGZhbHNlXG4gICAgICBsb2cuaW5mbyhcIk9uIHhjb2RlIDcuMCssIGluc3RydW1lbnRzLXdpdGhvdXQtZGVsYXkgZG9lcyBub3Qgd29yaywgXCIgK1xuICAgICAgICAgICAgICAgXCJza2lwcGluZyBpbnN0cnVtZW50cy13aXRob3V0LWRlbGF5XCIpO1xuICAgICAgdGhpcy53aXRob3V0RGVsYXkgPSBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGl3ZFBhdGggPSBhd2FpdCBnZXRJd2RQYXRoKHRoaXMueGNvZGVWZXJzaW9uLm1ham9yKTtcbiAgICBlbnYuQ0FfREVCVUdfVFJBTlNBQ1RJT05TID0gMTtcbiAgICBpZiAodGhpcy53aXRob3V0RGVsYXkgJiYgIXRoaXMudWRpZCkge1xuICAgICAgLy8gc2ltLCBhbmQgdXNpbmcgaS13LWRcbiAgICAgIGVudi5EWUxEX0lOU0VSVF9MSUJSQVJJRVMgPSBwYXRoLnJlc29sdmUoaXdkUGF0aCwgJ0luc3RydW1lbnRzU2hpbS5keWxpYicpO1xuICAgICAgZW52LkxJQl9QQVRIID0gaXdkUGF0aDtcbiAgICB9XG4gICAgbGV0IGluc3RydW1lbnRzRXhlY0FyZ3MgPSBbdGhpcy5pbnN0cnVtZW50c1BhdGgsIC4uLmFyZ3NdO1xuICAgIGluc3RydW1lbnRzRXhlY0FyZ3MgPSBfLm1hcChpbnN0cnVtZW50c0V4ZWNBcmdzLCBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICBpZiAoYXJnID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQSBudWxsIHZhbHVlIHdhcyBwYXNzZWQgYXMgYW4gYXJnIHRvIGV4ZWN1dGUgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnaW5zdHJ1bWVudHMgb24gdGhlIGNvbW1hbmQgbGluZS4gQSBsZXRpYWJsZSBpcyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdwcm9iYWJseSBub3QgZ2V0dGluZyBzZXQuIEFycmF5IG9mIGNvbW1hbmQgYXJnczogJyArXG4gICAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShpbnN0cnVtZW50c0V4ZWNBcmdzKSk7XG4gICAgICB9XG4gICAgICAvLyBlc2NhcGUgYW55IGFyZ3VtZW50IHRoYXQgaGFzIGEgc3BhY2UgaW4gaXRcbiAgICAgIGlmIChfLmlzU3RyaW5nKGFyZykgJiYgYXJnLmluZGV4T2YoJyAnKSAhPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGBcIiR7YXJnfVwiYDtcbiAgICAgIH1cbiAgICAgIC8vIG90aGVyd2lzZSBqdXN0IHVzZSB0aGUgYXJndW1lbnRcbiAgICAgIHJldHVybiBhcmc7XG4gICAgfSk7XG4gICAgbG9nLmRlYnVnKGBTcGF3bmluZyBpbnN0cnVtZW50cyB3aXRoIGNvbW1hbmQ6ICcke2luc3RydW1lbnRzRXhlY0FyZ3Muam9pbignICcpfSdgKTtcbiAgICBpZiAodGhpcy53aXRob3V0RGVsYXkpIHtcbiAgICAgIGxvZy5kZWJ1ZygnQW5kIGV4dHJhIHdpdGhvdXQtZGVsYXkgZW52OiAnICsgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBEWUxEX0lOU0VSVF9MSUJSQVJJRVM6IGVudi5EWUxEX0lOU0VSVF9MSUJSQVJJRVMsXG4gICAgICAgIExJQl9QQVRIOiBlbnYuTElCX1BBVEhcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgbG9nLmRlYnVnKGBBbmQgbGF1bmNoIHRpbWVvdXRzIChpbiBtcyk6ICR7SlNPTi5zdHJpbmdpZnkodGhpcy5sYXVuY2hUaW1lb3V0KX1gKTtcbiAgICByZXR1cm4gYXdhaXQgc3Bhd24odGhpcy5pbnN0cnVtZW50c1BhdGgsIGFyZ3MsIHtlbnZ9KTtcbiAgfVxuXG4gIGFkZFNvY2tldENvbm5lY3RUaW1lciAoZGVsYXksIHR5cGUsIGRvQWN0aW9uKSB7XG4gICAgbGV0IHNvY2tldENvbm5lY3REZWxheSA9IGNhbmNlbGxhYmxlRGVsYXkoZGVsYXkpO1xuICAgIC8qIGVzbGludC1kaXNhYmxlICovXG4gICAgc29ja2V0Q29ubmVjdERlbGF5LnRoZW4oKCkgPT4ge1xuICAgICAgbG9nLndhcm4oYEluc3RydW1lbnRzIHNvY2tldCBjbGllbnQgbmV2ZXIgY2hlY2tlZCBpbjsgdGltaW5nIG91dCAoJHt0eXBlfSlgKTtcbiAgICAgIHJldHVybiBkb0FjdGlvbigpO1xuICAgIH0pLmNhdGNoKEIuQ2FuY2VsbGF0aW9uRXJyb3IsICgpID0+IHt9KS5kb25lKCk7XG4gICAgLyogZXNsaW50LWVuYWJsZSAqL1xuICAgIHRoaXMuc29ja2V0Q29ubmVjdERlbGF5cy5wdXNoKHNvY2tldENvbm5lY3REZWxheSk7XG4gIH1cblxuICBjbGVhclNvY2tldENvbm5lY3RUaW1lcnMgKCkge1xuICAgIGZvciAobGV0IGRlbGF5IG9mIHRoaXMuc29ja2V0Q29ubmVjdERlbGF5cykge1xuICAgICAgZGVsYXkuY2FuY2VsKCk7XG4gICAgfVxuICAgIHRoaXMuc29ja2V0Q29ubmVjdERlbGF5cyA9IFtdO1xuICB9XG5cbiAgc2V0RXhpdExpc3RlbmVyIChleGl0TGlzdGVuZXIpIHtcbiAgICBpZiAoIXRoaXMucHJvYykgcmV0dXJuOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5XG4gICAgaWYgKHRoaXMuZXhpdExpc3RlbmVyKSB7XG4gICAgICB0aGlzLnByb2MucmVtb3ZlTGlzdGVuZXIoJ2V4aXQnLCB0aGlzLmV4aXRMaXN0ZW5lcik7XG4gICAgfVxuICAgIHRoaXMuZXhpdExpc3RlbmVyID0gZXhpdExpc3RlbmVyO1xuICAgIHRoaXMucHJvYy5vbignZXhpdCcsIGV4aXRMaXN0ZW5lcik7XG4gIH1cblxuICBraWxsSW5zdHJ1bWVudHMgKCkge1xuICAgIGlmICghdGhpcy5wcm9jKSByZXR1cm47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY3VybHlcblxuICAgIGxvZy5kZWJ1ZyhgS2lsbCBJbnN0cnVtZW50cyBwcm9jZXNzIChwaWQ6ICR7dGhpcy5wcm9jLnBpZH0pYCk7XG4gICAgcmV0dXJuIG5ldyBCKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICBsZXQgd2FzVGVybWluYXRlZCA9IGZhbHNlO1xuICAgICAgLy8gbW9uaXRvcmluZyBwcm9jZXNzIHRlcm1pbmF0aW9uXG4gICAgICBsZXQgdGVybURlbGF5ID0gY2FuY2VsbGFibGVEZWxheSh0aGlzLnRlcm1UaW1lb3V0KTtcbiAgICAgIGxldCB0ZXJtUHJvbWlzZSA9IHRlcm1EZWxheS5jYXRjaChCLkNhbmNlbGxhdGlvbkVycm9yLCAoKSA9PiB7fSk7XG4gICAgICB0aGlzLnNldEV4aXRMaXN0ZW5lcigoKSA9PiB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGw7XG4gICAgICAgIHdhc1Rlcm1pbmF0ZWQgPSB0cnVlO1xuICAgICAgICB0ZXJtRGVsYXkuY2FuY2VsKCk7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pO1xuICAgICAgbG9nLmRlYnVnKCdTZW5kaW5nIFNJR1RFUk0nKTtcbiAgICAgIHRoaXMucHJvYy5raWxsKCdTSUdURVJNJyk7XG4gICAgICBhd2FpdCB0ZXJtUHJvbWlzZTtcbiAgICAgIGlmICghd2FzVGVybWluYXRlZCkge1xuICAgICAgICBsb2cud2FybihgSW5zdHJ1bWVudHMgZGlkIG5vdCB0ZXJtaW5hdGUgYWZ0ZXIgJHt0aGlzLnRlcm1UaW1lb3V0IC8gMTAwMH0gc2Vjb25kcyFgKTtcbiAgICAgICAgbG9nLmRlYnVnKCdTZW5kaW5nIFNJR0tJTEwnKTtcbiAgICAgICAgdGhpcy5wcm9jLmtpbGwoJ1NJR0tJTEwnKTtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih0aGlzLmV4aXRMaXN0ZW5lcikpIHtcbiAgICAgICAgICB0aGlzLmV4aXRMaXN0ZW5lcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKiBQUk9DRVNTIE1BTkFHRU1FTlQgKi9cbiAgYXN5bmMgc2h1dGRvd24gKCkge1xuICAgIGxvZy5kZWJ1ZygnU3RhcnRpbmcgc2h1dGRvd24uJyk7XG4gICAgYXdhaXQgdGhpcy5raWxsSW5zdHJ1bWVudHMoKTtcbiAgICB0aGlzLm9uU2h1dGRvd25EZWZlcnJlZC5yZXNvbHZlKCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSW5zdHJ1bWVudHM7XG4iXSwiZmlsZSI6ImxpYi9pbnN0cnVtZW50cy9pbnN0cnVtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIuLi8uLi8uLiJ9
