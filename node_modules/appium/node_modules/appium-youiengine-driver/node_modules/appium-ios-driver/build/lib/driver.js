"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.defaultServerCaps = exports.IosDriver = void 0;

require("source-map-support/register");

var _appiumBaseDriver = require("appium-base-driver");

var utils = _interopRequireWildcard(require("./utils"));

var _logger = _interopRequireDefault(require("./logger"));

var _path = _interopRequireDefault(require("path"));

var _lodash = _interopRequireDefault(require("lodash"));

var _bluebird = _interopRequireDefault(require("bluebird"));

var _appiumSupport = require("appium-support");

var _appiumIosSimulator = require("appium-ios-simulator");

var _uiauto = require("./uiauto/uiauto");

var _instruments = require("./instruments");

var _asyncbox = require("asyncbox");

var _index = _interopRequireDefault(require("./commands/index"));

var _desiredCaps = require("./desired-caps");

var _nodeIdevice = _interopRequireDefault(require("node-idevice"));

var _safari = require("./commands/safari");

var _safariLauncher = require("./safari-launcher");

var _settings = require("./settings");

var _device = require("./device");

var _iwdp = require("./iwdp");

let iDevice = function (...args) {
  let device = (0, _nodeIdevice.default)(...args);
  let promisified = {};

  for (let m of ['install', 'installAndWait', 'remove', 'isInstalled']) {
    promisified[m] = _bluebird.default.promisify(device[m].bind(device));
  }

  return promisified;
};

const defaultServerCaps = {
  webStorageEnabled: false,
  locationContextEnabled: false,
  browserName: '',
  platform: 'MAC',
  javascriptEnabled: true,
  databaseEnabled: false,
  takesScreenshot: true,
  networkConnectionEnabled: false
};
exports.defaultServerCaps = defaultServerCaps;
const LOG_LOCATIONS = [_path.default.resolve('/', 'Library', 'Caches', 'com.apple.dt.instruments')];

if (process.env.HOME) {
  LOG_LOCATIONS.push(_path.default.resolve(process.env.HOME, 'Library', 'Logs', 'CoreSimulator'));
}

class IosDriver extends _appiumBaseDriver.BaseDriver {
  resetIos() {
    this.appExt = ".app";
    this.xcodeVersion = null;
    this.iosSdkVersion = null;
    this.logs = {};
    this.instruments = null;
    this.uiAutoClient = null;

    this.onInstrumentsDie = function () {};

    this.stopping = false;
    this.cbForCurrentCmd = null;
    this.remote = null;
    this.curContext = null;
    this.curWebFrames = [];
    this.selectingNewPage = false;
    this.windowHandleCache = [];
    this.webElementIds = [];
    this.implicitWaitMs = 0;
    this.asynclibWaitMs = 0;
    this.pageLoadMs = 6000;
    this.asynclibResponseCb = null;
    this.returnedFromExecuteAtom = {};
    this.executedAtomsCounter = 0;
    this.curCoords = null;
    this.curWebCoords = null;
    this.landscapeWebCoordsOffset = 0;
    this.keepAppToRetainPrefs = false;
    this.ready = false;
    this.asyncWaitMs = 0;
    this.settings = new _appiumBaseDriver.DeviceSettings({}, _lodash.default.noop);
    this.locatorStrategies = ['xpath', 'id', 'class name', '-ios uiautomation', 'accessibility id'];
    this.webLocatorStrategies = ['link text', 'css selector', 'tag name', 'partial link text'];
  }

  constructor(opts, shouldValidateCaps) {
    super(opts, shouldValidateCaps);
    this.desiredCapConstraints = _desiredCaps.desiredCapConstraints;
    this.resetIos();
    this.getDevicePixelRatio = _lodash.default.memoize(this.getDevicePixelRatio);
  }

  validateLocatorStrategy(strategy) {
    super.validateLocatorStrategy(strategy, this.isWebContext());
  }

  async start() {
    if (this.isRealDevice()) {
      await this.startRealDevice();
    } else {
      await this.startSimulator();
    }

    this.ready = true;
  }

  async createSession(...args) {
    let [sessionId, caps] = await super.createSession(...args);
    this.xcodeVersion = await utils.getAndCheckXcodeVersion(this.opts);

    _logger.default.debug(`Xcode version set to ${this.xcodeVersion.versionString}`);

    if (this.xcodeVersion.major >= 8) {
      let msg = `Appium's IosDriver does not support Xcode version ${this.xcodeVersion.versionString}. ` + 'Apple has deprecated UIAutomation. Use the "XCUITest" automationName capability instead.';

      _logger.default.errorAndThrow(new _appiumBaseDriver.errors.SessionNotCreatedError(msg));
    }

    this.caps = Object.assign({}, defaultServerCaps, this.caps);
    this.caps.desired = caps;
    await utils.detectUdid(this.opts);
    await utils.prepareIosOpts(this.opts);
    this.realDevice = null;
    this.useRobot = this.opts.useRobot;
    this.safari = this.opts.safari;
    this.opts.curOrientation = this.opts.initialOrientation;
    this.sock = _path.default.resolve(this.opts.tmpDir || '/tmp', 'instruments_sock');

    try {
      await this.configureApp();
    } catch (err) {
      _logger.default.error(`Bad app: '${this.opts.app}'. App paths need to ` + `be absolute, or relative to the appium server ` + `install dir, or a URL to compressed file, or a ` + `special app name.`);

      throw err;
    }

    await this.start();
    this.startNewCommandTimeout('createSession');
    return [sessionId, this.caps];
  }

  async stop() {
    this.ready = false;

    if (this.uiAutoClient) {
      await this.uiAutoClient.shutdown();
    }

    if (this.instruments) {
      try {
        await this.instruments.shutdown();
      } catch (err) {
        _logger.default.error(`Instruments didn't shut down. ${err}`);
      }
    }

    if (this.caps && this.caps.customSSLCert && !this.isRealDevice()) {
      _logger.default.debug(`Uninstalling ssl certificate for udid '${this.sim.udid}'`);

      await (0, _appiumIosSimulator.uninstallSSLCert)(this.caps.customSSLCert, this.sim.udid);
    }

    if (this.opts.enableAsyncExecuteFromHttps && !this.isRealDevice()) {
      await this.stopHttpsAsyncServer();
    }

    this.uiAutoClient = null;
    this.instruments = null;
    this.realDevice = null;
    this.curCoords = null;
    this.opts.curOrientation = null;

    if (!_lodash.default.isEmpty(this.logs)) {
      await this.logs.syslog.stopCapture();
      this.logs = {};
    }

    if (this.remote) {
      await this.stopRemote();
    }

    await this.stopIWDP();
  }

  async deleteSession() {
    _logger.default.debug("Deleting ios session");

    await this.stop();

    if (this.opts.clearSystemFiles) {
      await utils.clearLogs(LOG_LOCATIONS);
    } else {
      _logger.default.debug('Not clearing log files. Use `clearSystemFiles` capability to turn on.');
    }

    if (this.isRealDevice()) {
      await (0, _device.runRealDeviceReset)(this.realDevice, this.opts);
    } else {
      await (0, _device.runSimulatorReset)(this.sim, this.opts, this.keepAppToRetainPrefs);
    }

    await super.deleteSession();
  }

  async getSession() {
    let caps = await super.getSession();
    const viewportRect = await this.getViewportRect();
    const pixelRatio = await this.getDevicePixelRatio();
    const statBarHeight = await this.getStatusBarHeight();
    caps.viewportRect = viewportRect;
    caps.pixelRatio = pixelRatio;
    caps.statBarHeight = statBarHeight;
    return caps;
  }

  async executeCommand(cmd, ...args) {
    _logger.default.debug(`Executing iOS command '${cmd}'`);

    if (cmd === 'receiveAsyncResponse') {
      return await this.receiveAsyncResponse(...args);
    } else if (this.ready || _lodash.default.includes(['launchApp'], cmd)) {
      return await super.executeCommand(cmd, ...args);
    }

    throw new _appiumBaseDriver.errors.NoSuchDriverError(`Driver is not ready, cannot execute ${cmd}.`);
  }

  async configureApp() {
    try {
      if (!this.opts.bundleId && utils.appIsPackageOrBundle(this.opts.app)) {
        this.opts.bundleId = this.opts.app;
      }

      if (this.opts.app && this.opts.app.toLowerCase() === "settings") {
        if (parseFloat(this.opts.platformVersion) >= 8) {
          _logger.default.debug("We are on iOS8+ so not copying preferences app");

          this.opts.bundleId = "com.apple.Preferences";
          this.opts.app = null;
        }
      } else if (this.opts.app && this.opts.app.toLowerCase() === "calendar") {
        if (parseFloat(this.opts.platformVersion) >= 8) {
          _logger.default.debug("We are on iOS8+ so not copying calendar app");

          this.opts.bundleId = "com.apple.mobilecal";
          this.opts.app = null;
        }
      } else if (this.isSafari()) {
        if (!this.isRealDevice()) {
          if (parseFloat(this.opts.platformVersion) >= 8) {
            _logger.default.debug("We are on iOS8+ so not copying Safari app");

            this.opts.bundleId = _safari.SAFARI_BUNDLE;
            this.opts.app = null;
          }
        } else {
          if (!(await this.realDevice.isInstalled(this.opts.bundleId))) {
            if (await (0, _safariLauncher.needsInstall)()) {
              _logger.default.debug('SafariLauncher not found, building...');

              await (0, _safariLauncher.install)();
            }

            this.opts.bundleId = _safariLauncher.SAFARI_LAUNCHER_BUNDLE;
          }
        }
      } else if (this.opts.bundleId && utils.appIsPackageOrBundle(this.opts.bundleId) && (this.opts.app === "" || utils.appIsPackageOrBundle(this.opts.app))) {
        _logger.default.debug("App is an iOS bundle, will attempt to run as pre-existing");
      } else {
        this.opts.app = await this.helpers.configureApp(this.opts.app, '.app');
      }
    } catch (err) {
      _logger.default.error(err);

      throw new Error(`Bad app: ${this.opts.app}. App paths need to be absolute, or relative to the appium ` + "server install dir, or a URL to compressed file, or a special app name.");
    }
  }

  async startSimulator() {
    await utils.removeInstrumentsSocket(this.sock);

    if (!this.xcodeVersion) {
      _logger.default.debug("Setting Xcode version");

      this.xcodeVersion = await utils.getAndCheckXcodeVersion(this.opts);

      _logger.default.debug(`Xcode version set to ${this.xcodeVersion.versionString}`);
    }

    _logger.default.debug("Setting iOS SDK Version");

    this.iosSdkVersion = await utils.getAndCheckIosSdkVersion();

    _logger.default.debug(`iOS SDK Version set to ${this.iosSdkVersion}`);

    let timeout = _lodash.default.isObject(this.opts.launchTimeout) ? this.opts.launchTimeout.global : this.opts.launchTimeout;
    let availableDevices = await (0, _asyncbox.retry)(3, _instruments.instrumentsUtils.getAvailableDevices, timeout);
    let iosSimUdid = await (0, _device.checkSimulatorAvailable)(this.opts, this.iosSdkVersion, availableDevices);
    this.sim = await (0, _appiumIosSimulator.getSimulator)(iosSimUdid, this.xcodeVersion.versionString);
    await (0, _device.moveBuiltInApp)(this.sim);
    this.opts.localizableStrings = await utils.parseLocalizableStrings(this.opts);
    await utils.setBundleIdFromApp(this.opts);
    await this.createInstruments();
    {
      this.shouldPrelaunchSimulator = utils.shouldPrelaunchSimulator(this.opts, this.iosSdkVersion);
      let dString = await (0, _device.getAdjustedDeviceName)(this.opts);

      if (this.caps.app) {
        await utils.setDeviceTypeInInfoPlist(this.opts.app, dString);
      }
    }
    await (0, _device.runSimulatorReset)(this.sim, this.opts, this.keepAppToRetainPrefs);

    if (this.caps.customSSLCert && !this.isRealDevice()) {
      await (0, _appiumIosSimulator.installSSLCert)(this.caps.customSSLCert, this.sim.udid);
    }

    if (this.opts.enableAsyncExecuteFromHttps && !this.isRealDevice()) {
      await this.startHttpsAsyncServer();
    }

    await (0, _device.isolateSimulatorDevice)(this.sim, this.opts);
    this.localConfig = await (0, _settings.setLocaleAndPreferences)(this.sim, this.opts, this.isSafari(), _device.endSimulator);
    await this.startLogCapture(this.sim);
    await this.prelaunchSimulator();
    await this.startInstruments();
    await this.onInstrumentsLaunch();
    await this.configureBootstrap();
    await this.setBundleId();
    await this.setInitialOrientation();
    await this.initAutoWebview();
    await this.waitForAppLaunched();
  }

  async startRealDevice() {
    await utils.removeInstrumentsSocket(this.sock);
    this.opts.localizableStrings = await utils.parseLocalizableStrings(this.opts);
    await utils.setBundleIdFromApp(this.opts);
    await this.createInstruments();
    await (0, _device.runRealDeviceReset)(this.realDevice, this.opts);
    await this.startLogCapture();
    await this.installToRealDevice();
    await this.startInstruments();
    await this.onInstrumentsLaunch();
    await this.configureBootstrap();
    await this.setBundleId();
    await this.setInitialOrientation();
    await this.initAutoWebview();
    await this.waitForAppLaunched();
  }

  async installToRealDevice() {
    if (this.opts.autoLaunch === false) {
      return;
    }

    if (this.opts.app) {
      let ext = this.opts.app.substring(this.opts.app.length - 3).toLowerCase();

      if (ext === 'ipa') {
        this.opts.ipa = this.opts.app;
      }
    }

    if (this.opts.udid) {
      if (await this.realDevice.isInstalled(this.opts.bundleId)) {
        _logger.default.debug("App is installed.");

        if (this.opts.fullReset) {
          _logger.default.debug("fullReset requested. Forcing app install.");
        } else {
          _logger.default.debug("fullReset not requested. No need to install.");

          return;
        }
      } else {
        _logger.default.debug("App is not installed. Will try to install.");
      }

      if (this.opts.ipa && this.opts.bundleId) {
        await this.installIpa();

        _logger.default.debug('App installed.');
      } else if (this.opts.ipa) {
        let msg = "You specified a UDID and ipa but did not include the bundle id";

        _logger.default.warn(msg);

        throw new _appiumBaseDriver.errors.UnknownError(msg);
      } else if (this.opts.app) {
        await this.realDevice.install(this.opts.app);

        _logger.default.debug('App installed.');
      } else {
        _logger.default.debug("Real device specified but no ipa or app path, assuming bundle ID is " + "on device");
      }
    } else {
      _logger.default.debug("No device id or app, not installing to real device.");
    }
  }

  getIDeviceObj() {
    let idiPath = _path.default.resolve(__dirname, "../../../build/", "libimobiledevice-macosx/ideviceinstaller");

    _logger.default.debug(`Creating iDevice object with udid ${this.opts.udid}`);

    try {
      return iDevice(this.opts.udid);
    } catch (e1) {
      _logger.default.debug(`Couldn't find ideviceinstaller, trying built-in at ${idiPath}`);

      try {
        return iDevice(this.opts.udid, {
          cmd: idiPath
        });
      } catch (e2) {
        let msg = "Could not initialize ideviceinstaller; make sure it is " + "installed and works on your system";

        _logger.default.error(msg);

        throw new Error(msg);
      }
    }
  }

  async installIpa() {
    _logger.default.debug(`Installing ipa found at ${this.opts.ipa}`);

    if (await this.realDevice.isInstalled(this.opts.bundleId)) {
      _logger.default.debug("Bundle found on device, removing before reinstalling.");

      await this.realDevice.remove(this.opts.bundleId);
    } else {
      _logger.default.debug("Nothing found on device, going ahead and installing.");
    }

    await this.realDevice.installAndWait(this.opts.ipa, this.opts.bundleId);
  }

  validateDesiredCaps(caps) {
    let res = super.validateDesiredCaps(caps);
    if (!res) return res;
    return (0, _desiredCaps.desiredCapValidation)(caps);
  }

  async prelaunchSimulator() {
    if (!this.shouldPrelaunchSimulator) {
      _logger.default.debug("Not pre-launching simulator");

      return;
    }

    await (0, _device.endSimulator)(this.sim);
  }

  async onInstrumentsLaunch() {
    _logger.default.debug('Instruments launched. Starting poll loop for new commands.');

    if (this.opts.origAppPath) {
      _logger.default.debug("Copying app back to its original place");

      return await _appiumSupport.fs.copyFile(this.opts.app, this.opts.origAppPath);
    }
  }

  async setBundleId() {
    if (this.opts.bundleId) {
      return;
    } else {
      let bId = await this.uiAutoClient.sendCommand('au.bundleId()');

      _logger.default.debug(`Bundle ID for open app is ${bId.value}`);

      this.opts.bundleId = bId.value;
    }
  }

  async startIWDP() {
    if (this.opts.startIWDP) {
      this.iwdpServer = new _iwdp.IWDP(this.opts.webkitDebugProxyPort, this.opts.udid);
      await this.iwdpServer.start();
    }
  }

  async stopIWDP() {
    if (this.iwdpServer) {
      await this.iwdpServer.stop();
      delete this.iwdpServer;
    }
  }

  async setInitialOrientation() {
    if (_lodash.default.isString(this.opts.initialOrientation) && _lodash.default.includes(["LANDSCAPE", "PORTRAIT"], this.opts.initialOrientation.toUpperCase())) {
      _logger.default.debug(`Setting initial orientation to ${this.opts.initialOrientation}`);

      let command = `au.setScreenOrientation('${this.opts.initialOrientation.toUpperCase()}')`;

      try {
        await this.uiAutoClient.sendCommand(command);
        this.opts.curOrientation = this.opts.initialOrientation;
      } catch (err) {
        _logger.default.warn(`Setting initial orientation failed with: ${err}`);
      }
    }
  }

  isRealDevice() {
    return !!this.opts.udid;
  }

  isSafari() {
    return this.opts.safari;
  }

  async waitForAppLaunched() {
    let condFn;

    if (this.opts.waitForAppScript) {
      _logger.default.debug(`Using custom script to wait for app start: ${this.opts.waitForAppScript}`);

      condFn = async () => {
        let res;

        try {
          res = await this.uiAutoClient.sendCommand(`try{\n${this.opts.waitForAppScript}` + `\n} catch(err) { $.log("waitForAppScript err: " + error); false; };`);
        } catch (err) {
          _logger.default.debug(`Cannot eval waitForAppScript script, err: ${err}`);

          return false;
        }

        if (typeof res !== 'boolean') {
          _logger.default.debug('Unexpected return type in waitForAppScript script');

          return false;
        }

        return res;
      };
    } else if (this.isSafari()) {
      if (this.isRealDevice()) {
        await this.clickButtonToLaunchSafari();
      }

      _logger.default.debug('Waiting for initial webview');

      await this.navToInitialWebview();

      condFn = async () => true;
    } else {
      _logger.default.debug("Waiting for app source to contain elements");

      condFn = async () => {
        try {
          let source = await this.getSourceForElementForXML();
          source = JSON.parse(source || "{}");
          let appEls = (source.UIAApplication || {})['>'];
          return appEls && appEls.length > 0 && !IosDriver.isSpringBoard(source.UIAApplication);
        } catch (e) {
          _logger.default.warn(`Couldn't extract app element from source, error was: ${e}`);

          return false;
        }
      };
    }

    try {
      await (0, _asyncbox.waitForCondition)(condFn, {
        logger: _logger.default,
        waitMs: 10000,
        intervalMs: 500
      });
    } catch (err) {
      if (err.message && err.message.match(/Condition unmet/)) {
        _logger.default.warn('Initial spin timed out, continuing but the app might not be ready.');

        _logger.default.debug(`Initial spin error was: ${err}`);
      } else {
        throw err;
      }
    }
  }

  static isSpringBoard(uiAppObj) {
    return _lodash.default.propertyOf(uiAppObj['@'])('name') === 'SpringBoard';
  }

  async createInstruments() {
    _logger.default.debug("Creating instruments");

    this.uiAutoClient = new _uiauto.UIAutoClient(this.sock);
    this.instruments = await this.makeInstruments();
    this.instruments.onShutdown.catch(async () => {
      await this.startUnexpectedShutdown(new _appiumBaseDriver.errors.UnknownError('Abnormal Instruments termination!'));
    }).done();
  }

  shouldIgnoreInstrumentsExit() {
    return this.safari && this.isRealDevice();
  }

  async makeInstruments() {
    let bootstrapPath = await (0, _uiauto.prepareBootstrap)({
      sock: this.sock,
      interKeyDelay: this.opts.interKeyDelay,
      justLoopInfinitely: false,
      autoAcceptAlerts: this.opts.autoAcceptAlerts,
      autoDismissAlerts: this.opts.autoDismissAlerts,
      sendKeyStrategy: this.opts.sendKeyStrategy || (this.isRealDevice() ? 'grouped' : 'oneByOne')
    });
    let instruments = new _instruments.Instruments({
      app: (!this.isRealDevice() ? this.opts.app : null) || this.opts.bundleId,
      udid: this.opts.udid,
      processArguments: this.opts.processArguments,
      ignoreStartupExit: this.shouldIgnoreInstrumentsExit(),
      bootstrap: bootstrapPath,
      template: this.opts.automationTraceTemplatePath,
      instrumentsPath: this.opts.instrumentsPath,
      withoutDelay: this.opts.withoutDelay,
      platformVersion: this.opts.platformVersion,
      webSocket: this.opts.webSocket,
      launchTimeout: this.opts.launchTimeout,
      flakeyRetries: this.opts.backendRetries,
      realDevice: this.isRealDevice(),
      simulatorSdkAndDevice: this.iosSdkVersion >= 7.1 ? await (0, _device.getAdjustedDeviceName)(this.opts) : null,
      tmpDir: _path.default.resolve(this.opts.tmpDir || '/tmp', 'appium-instruments'),
      traceDir: this.opts.traceDir,
      locale: this.opts.locale,
      language: this.opts.language
    });
    return instruments;
  }

  async startInstruments() {
    _logger.default.debug("Starting UIAutoClient, and launching Instruments.");

    await _bluebird.default.all([this.uiAutoClient.start().then(() => {
      this.instruments.registerLaunch();
    }), this.instruments.launch()]);
  }

  async configureBootstrap() {
    _logger.default.debug("Setting bootstrap config keys/values");

    let isVerbose = true;
    let cmd = 'target = $.target();\n';
    cmd += 'au = $;\n';
    cmd += `$.isVerbose = ${isVerbose};\n`;
    await this.uiAutoClient.sendCommand(cmd);
  }

  async getSourceForElementForXML(ctx) {
    let source;

    if (!ctx) {
      source = await this.uiAutoClient.sendCommand("au.mainApp().getTreeForXML()");
    } else {
      source = await this.uiAutoClient.sendCommand(`au.getElement('${ctx}').getTreeForXML()`);
    }

    if (source) {
      return JSON.stringify(source);
    } else {
      throw new Error(`Bad response from getTreeForXML. res was ${JSON.stringify(source)}`);
    }
  }

  get realDevice() {
    this._realDevice = this._realDevice || this.getIDeviceObj();
    return this._realDevice;
  }

  set realDevice(rd) {
    this._realDevice = rd;
  }

}

exports.IosDriver = IosDriver;

for (let [cmd, fn] of _lodash.default.toPairs(_index.default)) {
  IosDriver.prototype[cmd] = fn;
}

var _default = IosDriver;
exports.default = _default;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9kcml2ZXIuanMiXSwibmFtZXMiOlsiaURldmljZSIsImFyZ3MiLCJkZXZpY2UiLCJwcm9taXNpZmllZCIsIm0iLCJCIiwicHJvbWlzaWZ5IiwiYmluZCIsImRlZmF1bHRTZXJ2ZXJDYXBzIiwid2ViU3RvcmFnZUVuYWJsZWQiLCJsb2NhdGlvbkNvbnRleHRFbmFibGVkIiwiYnJvd3Nlck5hbWUiLCJwbGF0Zm9ybSIsImphdmFzY3JpcHRFbmFibGVkIiwiZGF0YWJhc2VFbmFibGVkIiwidGFrZXNTY3JlZW5zaG90IiwibmV0d29ya0Nvbm5lY3Rpb25FbmFibGVkIiwiTE9HX0xPQ0FUSU9OUyIsInBhdGgiLCJyZXNvbHZlIiwicHJvY2VzcyIsImVudiIsIkhPTUUiLCJwdXNoIiwiSW9zRHJpdmVyIiwiQmFzZURyaXZlciIsInJlc2V0SW9zIiwiYXBwRXh0IiwieGNvZGVWZXJzaW9uIiwiaW9zU2RrVmVyc2lvbiIsImxvZ3MiLCJpbnN0cnVtZW50cyIsInVpQXV0b0NsaWVudCIsIm9uSW5zdHJ1bWVudHNEaWUiLCJzdG9wcGluZyIsImNiRm9yQ3VycmVudENtZCIsInJlbW90ZSIsImN1ckNvbnRleHQiLCJjdXJXZWJGcmFtZXMiLCJzZWxlY3RpbmdOZXdQYWdlIiwid2luZG93SGFuZGxlQ2FjaGUiLCJ3ZWJFbGVtZW50SWRzIiwiaW1wbGljaXRXYWl0TXMiLCJhc3luY2xpYldhaXRNcyIsInBhZ2VMb2FkTXMiLCJhc3luY2xpYlJlc3BvbnNlQ2IiLCJyZXR1cm5lZEZyb21FeGVjdXRlQXRvbSIsImV4ZWN1dGVkQXRvbXNDb3VudGVyIiwiY3VyQ29vcmRzIiwiY3VyV2ViQ29vcmRzIiwibGFuZHNjYXBlV2ViQ29vcmRzT2Zmc2V0Iiwia2VlcEFwcFRvUmV0YWluUHJlZnMiLCJyZWFkeSIsImFzeW5jV2FpdE1zIiwic2V0dGluZ3MiLCJEZXZpY2VTZXR0aW5ncyIsIl8iLCJub29wIiwibG9jYXRvclN0cmF0ZWdpZXMiLCJ3ZWJMb2NhdG9yU3RyYXRlZ2llcyIsImNvbnN0cnVjdG9yIiwib3B0cyIsInNob3VsZFZhbGlkYXRlQ2FwcyIsImRlc2lyZWRDYXBDb25zdHJhaW50cyIsImdldERldmljZVBpeGVsUmF0aW8iLCJtZW1vaXplIiwidmFsaWRhdGVMb2NhdG9yU3RyYXRlZ3kiLCJzdHJhdGVneSIsImlzV2ViQ29udGV4dCIsInN0YXJ0IiwiaXNSZWFsRGV2aWNlIiwic3RhcnRSZWFsRGV2aWNlIiwic3RhcnRTaW11bGF0b3IiLCJjcmVhdGVTZXNzaW9uIiwic2Vzc2lvbklkIiwiY2FwcyIsInV0aWxzIiwiZ2V0QW5kQ2hlY2tYY29kZVZlcnNpb24iLCJsb2dnZXIiLCJkZWJ1ZyIsInZlcnNpb25TdHJpbmciLCJtYWpvciIsIm1zZyIsImVycm9yQW5kVGhyb3ciLCJlcnJvcnMiLCJTZXNzaW9uTm90Q3JlYXRlZEVycm9yIiwiT2JqZWN0IiwiYXNzaWduIiwiZGVzaXJlZCIsImRldGVjdFVkaWQiLCJwcmVwYXJlSW9zT3B0cyIsInJlYWxEZXZpY2UiLCJ1c2VSb2JvdCIsInNhZmFyaSIsImN1ck9yaWVudGF0aW9uIiwiaW5pdGlhbE9yaWVudGF0aW9uIiwic29jayIsInRtcERpciIsImNvbmZpZ3VyZUFwcCIsImVyciIsImVycm9yIiwiYXBwIiwic3RhcnROZXdDb21tYW5kVGltZW91dCIsInN0b3AiLCJzaHV0ZG93biIsImN1c3RvbVNTTENlcnQiLCJzaW0iLCJ1ZGlkIiwiZW5hYmxlQXN5bmNFeGVjdXRlRnJvbUh0dHBzIiwic3RvcEh0dHBzQXN5bmNTZXJ2ZXIiLCJpc0VtcHR5Iiwic3lzbG9nIiwic3RvcENhcHR1cmUiLCJzdG9wUmVtb3RlIiwic3RvcElXRFAiLCJkZWxldGVTZXNzaW9uIiwiY2xlYXJTeXN0ZW1GaWxlcyIsImNsZWFyTG9ncyIsImdldFNlc3Npb24iLCJ2aWV3cG9ydFJlY3QiLCJnZXRWaWV3cG9ydFJlY3QiLCJwaXhlbFJhdGlvIiwic3RhdEJhckhlaWdodCIsImdldFN0YXR1c0JhckhlaWdodCIsImV4ZWN1dGVDb21tYW5kIiwiY21kIiwicmVjZWl2ZUFzeW5jUmVzcG9uc2UiLCJpbmNsdWRlcyIsIk5vU3VjaERyaXZlckVycm9yIiwiYnVuZGxlSWQiLCJhcHBJc1BhY2thZ2VPckJ1bmRsZSIsInRvTG93ZXJDYXNlIiwicGFyc2VGbG9hdCIsInBsYXRmb3JtVmVyc2lvbiIsImlzU2FmYXJpIiwiU0FGQVJJX0JVTkRMRSIsImlzSW5zdGFsbGVkIiwiU0FGQVJJX0xBVU5DSEVSX0JVTkRMRSIsImhlbHBlcnMiLCJFcnJvciIsInJlbW92ZUluc3RydW1lbnRzU29ja2V0IiwiZ2V0QW5kQ2hlY2tJb3NTZGtWZXJzaW9uIiwidGltZW91dCIsImlzT2JqZWN0IiwibGF1bmNoVGltZW91dCIsImdsb2JhbCIsImF2YWlsYWJsZURldmljZXMiLCJpbnN0cnVtZW50c1V0aWxzIiwiZ2V0QXZhaWxhYmxlRGV2aWNlcyIsImlvc1NpbVVkaWQiLCJsb2NhbGl6YWJsZVN0cmluZ3MiLCJwYXJzZUxvY2FsaXphYmxlU3RyaW5ncyIsInNldEJ1bmRsZUlkRnJvbUFwcCIsImNyZWF0ZUluc3RydW1lbnRzIiwic2hvdWxkUHJlbGF1bmNoU2ltdWxhdG9yIiwiZFN0cmluZyIsInNldERldmljZVR5cGVJbkluZm9QbGlzdCIsInN0YXJ0SHR0cHNBc3luY1NlcnZlciIsImxvY2FsQ29uZmlnIiwiZW5kU2ltdWxhdG9yIiwic3RhcnRMb2dDYXB0dXJlIiwicHJlbGF1bmNoU2ltdWxhdG9yIiwic3RhcnRJbnN0cnVtZW50cyIsIm9uSW5zdHJ1bWVudHNMYXVuY2giLCJjb25maWd1cmVCb290c3RyYXAiLCJzZXRCdW5kbGVJZCIsInNldEluaXRpYWxPcmllbnRhdGlvbiIsImluaXRBdXRvV2VidmlldyIsIndhaXRGb3JBcHBMYXVuY2hlZCIsImluc3RhbGxUb1JlYWxEZXZpY2UiLCJhdXRvTGF1bmNoIiwiZXh0Iiwic3Vic3RyaW5nIiwibGVuZ3RoIiwiaXBhIiwiZnVsbFJlc2V0IiwiaW5zdGFsbElwYSIsIndhcm4iLCJVbmtub3duRXJyb3IiLCJpbnN0YWxsIiwiZ2V0SURldmljZU9iaiIsImlkaVBhdGgiLCJfX2Rpcm5hbWUiLCJlMSIsImUyIiwicmVtb3ZlIiwiaW5zdGFsbEFuZFdhaXQiLCJ2YWxpZGF0ZURlc2lyZWRDYXBzIiwicmVzIiwib3JpZ0FwcFBhdGgiLCJmcyIsImNvcHlGaWxlIiwiYklkIiwic2VuZENvbW1hbmQiLCJ2YWx1ZSIsInN0YXJ0SVdEUCIsIml3ZHBTZXJ2ZXIiLCJJV0RQIiwid2Via2l0RGVidWdQcm94eVBvcnQiLCJpc1N0cmluZyIsInRvVXBwZXJDYXNlIiwiY29tbWFuZCIsImNvbmRGbiIsIndhaXRGb3JBcHBTY3JpcHQiLCJjbGlja0J1dHRvblRvTGF1bmNoU2FmYXJpIiwibmF2VG9Jbml0aWFsV2VidmlldyIsInNvdXJjZSIsImdldFNvdXJjZUZvckVsZW1lbnRGb3JYTUwiLCJKU09OIiwicGFyc2UiLCJhcHBFbHMiLCJVSUFBcHBsaWNhdGlvbiIsImlzU3ByaW5nQm9hcmQiLCJlIiwid2FpdE1zIiwiaW50ZXJ2YWxNcyIsIm1lc3NhZ2UiLCJtYXRjaCIsInVpQXBwT2JqIiwicHJvcGVydHlPZiIsIlVJQXV0b0NsaWVudCIsIm1ha2VJbnN0cnVtZW50cyIsIm9uU2h1dGRvd24iLCJjYXRjaCIsInN0YXJ0VW5leHBlY3RlZFNodXRkb3duIiwiZG9uZSIsInNob3VsZElnbm9yZUluc3RydW1lbnRzRXhpdCIsImJvb3RzdHJhcFBhdGgiLCJpbnRlcktleURlbGF5IiwianVzdExvb3BJbmZpbml0ZWx5IiwiYXV0b0FjY2VwdEFsZXJ0cyIsImF1dG9EaXNtaXNzQWxlcnRzIiwic2VuZEtleVN0cmF0ZWd5IiwiSW5zdHJ1bWVudHMiLCJwcm9jZXNzQXJndW1lbnRzIiwiaWdub3JlU3RhcnR1cEV4aXQiLCJib290c3RyYXAiLCJ0ZW1wbGF0ZSIsImF1dG9tYXRpb25UcmFjZVRlbXBsYXRlUGF0aCIsImluc3RydW1lbnRzUGF0aCIsIndpdGhvdXREZWxheSIsIndlYlNvY2tldCIsImZsYWtleVJldHJpZXMiLCJiYWNrZW5kUmV0cmllcyIsInNpbXVsYXRvclNka0FuZERldmljZSIsInRyYWNlRGlyIiwibG9jYWxlIiwibGFuZ3VhZ2UiLCJhbGwiLCJ0aGVuIiwicmVnaXN0ZXJMYXVuY2giLCJsYXVuY2giLCJpc1ZlcmJvc2UiLCJjdHgiLCJzdHJpbmdpZnkiLCJfcmVhbERldmljZSIsInJkIiwiZm4iLCJ0b1BhaXJzIiwiY29tbWFuZHMiLCJwcm90b3R5cGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFJQSxJQUFJQSxPQUFPLEdBQUcsVUFBVSxHQUFHQyxJQUFiLEVBQW1CO0FBQy9CLE1BQUlDLE1BQU0sR0FBRywwQkFBUyxHQUFHRCxJQUFaLENBQWI7QUFDQSxNQUFJRSxXQUFXLEdBQUcsRUFBbEI7O0FBQ0EsT0FBSyxJQUFJQyxDQUFULElBQWMsQ0FBQyxTQUFELEVBQVksZ0JBQVosRUFBOEIsUUFBOUIsRUFBd0MsYUFBeEMsQ0FBZCxFQUFzRTtBQUNwRUQsSUFBQUEsV0FBVyxDQUFDQyxDQUFELENBQVgsR0FBaUJDLGtCQUFFQyxTQUFGLENBQVlKLE1BQU0sQ0FBQ0UsQ0FBRCxDQUFOLENBQVVHLElBQVYsQ0FBZUwsTUFBZixDQUFaLENBQWpCO0FBQ0Q7O0FBQ0QsU0FBT0MsV0FBUDtBQUNELENBUEQ7O0FBU0EsTUFBTUssaUJBQWlCLEdBQUc7QUFDeEJDLEVBQUFBLGlCQUFpQixFQUFFLEtBREs7QUFFeEJDLEVBQUFBLHNCQUFzQixFQUFFLEtBRkE7QUFHeEJDLEVBQUFBLFdBQVcsRUFBRSxFQUhXO0FBSXhCQyxFQUFBQSxRQUFRLEVBQUUsS0FKYztBQUt4QkMsRUFBQUEsaUJBQWlCLEVBQUUsSUFMSztBQU14QkMsRUFBQUEsZUFBZSxFQUFFLEtBTk87QUFPeEJDLEVBQUFBLGVBQWUsRUFBRSxJQVBPO0FBUXhCQyxFQUFBQSx3QkFBd0IsRUFBRTtBQVJGLENBQTFCOztBQVdBLE1BQU1DLGFBQWEsR0FBRyxDQUNwQkMsY0FBS0MsT0FBTCxDQUFhLEdBQWIsRUFBa0IsU0FBbEIsRUFBNkIsUUFBN0IsRUFBdUMsMEJBQXZDLENBRG9CLENBQXRCOztBQUdBLElBQUlDLE9BQU8sQ0FBQ0MsR0FBUixDQUFZQyxJQUFoQixFQUFzQjtBQUNwQkwsRUFBQUEsYUFBYSxDQUFDTSxJQUFkLENBQW1CTCxjQUFLQyxPQUFMLENBQWFDLE9BQU8sQ0FBQ0MsR0FBUixDQUFZQyxJQUF6QixFQUErQixTQUEvQixFQUEwQyxNQUExQyxFQUFrRCxlQUFsRCxDQUFuQjtBQUNEOztBQUVELE1BQU1FLFNBQU4sU0FBd0JDLDRCQUF4QixDQUFtQztBQUNqQ0MsRUFBQUEsUUFBUSxHQUFJO0FBQ1YsU0FBS0MsTUFBTCxHQUFjLE1BQWQ7QUFDQSxTQUFLQyxZQUFMLEdBQW9CLElBQXBCO0FBQ0EsU0FBS0MsYUFBTCxHQUFxQixJQUFyQjtBQUNBLFNBQUtDLElBQUwsR0FBWSxFQUFaO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQixJQUFuQjtBQUNBLFNBQUtDLFlBQUwsR0FBb0IsSUFBcEI7O0FBQ0EsU0FBS0MsZ0JBQUwsR0FBd0IsWUFBWSxDQUFFLENBQXRDOztBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsS0FBaEI7QUFDQSxTQUFLQyxlQUFMLEdBQXVCLElBQXZCO0FBQ0EsU0FBS0MsTUFBTCxHQUFjLElBQWQ7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLElBQWxCO0FBQ0EsU0FBS0MsWUFBTCxHQUFvQixFQUFwQjtBQUNBLFNBQUtDLGdCQUFMLEdBQXdCLEtBQXhCO0FBQ0EsU0FBS0MsaUJBQUwsR0FBeUIsRUFBekI7QUFDQSxTQUFLQyxhQUFMLEdBQXFCLEVBQXJCO0FBQ0EsU0FBS0MsY0FBTCxHQUFzQixDQUF0QjtBQUNBLFNBQUtDLGNBQUwsR0FBc0IsQ0FBdEI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLElBQWxCO0FBQ0EsU0FBS0Msa0JBQUwsR0FBMEIsSUFBMUI7QUFDQSxTQUFLQyx1QkFBTCxHQUErQixFQUEvQjtBQUNBLFNBQUtDLG9CQUFMLEdBQTRCLENBQTVCO0FBQ0EsU0FBS0MsU0FBTCxHQUFpQixJQUFqQjtBQUNBLFNBQUtDLFlBQUwsR0FBb0IsSUFBcEI7QUFDQSxTQUFLQyx3QkFBTCxHQUFnQyxDQUFoQztBQUNBLFNBQUtDLG9CQUFMLEdBQTRCLEtBQTVCO0FBQ0EsU0FBS0MsS0FBTCxHQUFhLEtBQWI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CLENBQW5CO0FBRUEsU0FBS0MsUUFBTCxHQUFnQixJQUFJQyxnQ0FBSixDQUFtQixFQUFuQixFQUF1QkMsZ0JBQUVDLElBQXpCLENBQWhCO0FBRUEsU0FBS0MsaUJBQUwsR0FBeUIsQ0FDdkIsT0FEdUIsRUFFdkIsSUFGdUIsRUFHdkIsWUFIdUIsRUFJdkIsbUJBSnVCLEVBS3ZCLGtCQUx1QixDQUF6QjtBQU9BLFNBQUtDLG9CQUFMLEdBQTRCLENBQzFCLFdBRDBCLEVBRTFCLGNBRjBCLEVBRzFCLFVBSDBCLEVBSTFCLG1CQUowQixDQUE1QjtBQU1EOztBQUVEQyxFQUFBQSxXQUFXLENBQUVDLElBQUYsRUFBUUMsa0JBQVIsRUFBNEI7QUFDckMsVUFBTUQsSUFBTixFQUFZQyxrQkFBWjtBQUVBLFNBQUtDLHFCQUFMLEdBQTZCQSxrQ0FBN0I7QUFDQSxTQUFLckMsUUFBTDtBQUNBLFNBQUtzQyxtQkFBTCxHQUEyQlIsZ0JBQUVTLE9BQUYsQ0FBVSxLQUFLRCxtQkFBZixDQUEzQjtBQUNEOztBQUVERSxFQUFBQSx1QkFBdUIsQ0FBRUMsUUFBRixFQUFZO0FBQ2pDLFVBQU1ELHVCQUFOLENBQThCQyxRQUE5QixFQUF3QyxLQUFLQyxZQUFMLEVBQXhDO0FBQ0Q7O0FBRUQsUUFBTUMsS0FBTixHQUFlO0FBQ2IsUUFBSSxLQUFLQyxZQUFMLEVBQUosRUFBeUI7QUFDdkIsWUFBTSxLQUFLQyxlQUFMLEVBQU47QUFDRCxLQUZELE1BRU87QUFDTCxZQUFNLEtBQUtDLGNBQUwsRUFBTjtBQUNEOztBQUNELFNBQUtwQixLQUFMLEdBQWEsSUFBYjtBQUNEOztBQUVELFFBQU1xQixhQUFOLENBQXFCLEdBQUd4RSxJQUF4QixFQUE4QjtBQUM1QixRQUFJLENBQUN5RSxTQUFELEVBQVlDLElBQVosSUFBb0IsTUFBTSxNQUFNRixhQUFOLENBQW9CLEdBQUd4RSxJQUF2QixDQUE5QjtBQUlBLFNBQUsyQixZQUFMLEdBQW9CLE1BQU1nRCxLQUFLLENBQUNDLHVCQUFOLENBQThCLEtBQUtoQixJQUFuQyxDQUExQjs7QUFDQWlCLG9CQUFPQyxLQUFQLENBQWMsd0JBQXVCLEtBQUtuRCxZQUFMLENBQWtCb0QsYUFBYyxFQUFyRTs7QUFDQSxRQUFJLEtBQUtwRCxZQUFMLENBQWtCcUQsS0FBbEIsSUFBMkIsQ0FBL0IsRUFBa0M7QUFDaEMsVUFBSUMsR0FBRyxHQUFJLHFEQUFvRCxLQUFLdEQsWUFBTCxDQUFrQm9ELGFBQWMsSUFBckYsR0FDQSwwRkFEVjs7QUFFQUYsc0JBQU9LLGFBQVAsQ0FBcUIsSUFBSUMseUJBQU9DLHNCQUFYLENBQWtDSCxHQUFsQyxDQUFyQjtBQUNEOztBQUdELFNBQUtQLElBQUwsR0FBWVcsTUFBTSxDQUFDQyxNQUFQLENBQWMsRUFBZCxFQUFrQi9FLGlCQUFsQixFQUFxQyxLQUFLbUUsSUFBMUMsQ0FBWjtBQUNBLFNBQUtBLElBQUwsQ0FBVWEsT0FBVixHQUFvQmIsSUFBcEI7QUFFQSxVQUFNQyxLQUFLLENBQUNhLFVBQU4sQ0FBaUIsS0FBSzVCLElBQXRCLENBQU47QUFDQSxVQUFNZSxLQUFLLENBQUNjLGNBQU4sQ0FBcUIsS0FBSzdCLElBQTFCLENBQU47QUFDQSxTQUFLOEIsVUFBTCxHQUFrQixJQUFsQjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsS0FBSy9CLElBQUwsQ0FBVStCLFFBQTFCO0FBQ0EsU0FBS0MsTUFBTCxHQUFjLEtBQUtoQyxJQUFMLENBQVVnQyxNQUF4QjtBQUNBLFNBQUtoQyxJQUFMLENBQVVpQyxjQUFWLEdBQTJCLEtBQUtqQyxJQUFMLENBQVVrQyxrQkFBckM7QUFFQSxTQUFLQyxJQUFMLEdBQVk5RSxjQUFLQyxPQUFMLENBQWEsS0FBSzBDLElBQUwsQ0FBVW9DLE1BQVYsSUFBb0IsTUFBakMsRUFBeUMsa0JBQXpDLENBQVo7O0FBRUEsUUFBSTtBQUNGLFlBQU0sS0FBS0MsWUFBTCxFQUFOO0FBQ0QsS0FGRCxDQUVFLE9BQU9DLEdBQVAsRUFBWTtBQUNackIsc0JBQU9zQixLQUFQLENBQWMsYUFBWSxLQUFLdkMsSUFBTCxDQUFVd0MsR0FBSSx1QkFBM0IsR0FDQyxnREFERCxHQUVDLGlEQUZELEdBR0MsbUJBSGQ7O0FBSUEsWUFBTUYsR0FBTjtBQUNEOztBQUVELFVBQU0sS0FBSzlCLEtBQUwsRUFBTjtBQUdBLFNBQUtpQyxzQkFBTCxDQUE0QixlQUE1QjtBQUNBLFdBQU8sQ0FBQzVCLFNBQUQsRUFBWSxLQUFLQyxJQUFqQixDQUFQO0FBQ0Q7O0FBRUQsUUFBTTRCLElBQU4sR0FBYztBQUNaLFNBQUtuRCxLQUFMLEdBQWEsS0FBYjs7QUFFQSxRQUFJLEtBQUtwQixZQUFULEVBQXVCO0FBQ3JCLFlBQU0sS0FBS0EsWUFBTCxDQUFrQndFLFFBQWxCLEVBQU47QUFDRDs7QUFFRCxRQUFJLEtBQUt6RSxXQUFULEVBQXNCO0FBQ3BCLFVBQUk7QUFDRixjQUFNLEtBQUtBLFdBQUwsQ0FBaUJ5RSxRQUFqQixFQUFOO0FBQ0QsT0FGRCxDQUVFLE9BQU9MLEdBQVAsRUFBWTtBQUNackIsd0JBQU9zQixLQUFQLENBQWMsaUNBQWdDRCxHQUFJLEVBQWxEO0FBQ0Q7QUFDRjs7QUFFRCxRQUFJLEtBQUt4QixJQUFMLElBQWEsS0FBS0EsSUFBTCxDQUFVOEIsYUFBdkIsSUFBd0MsQ0FBQyxLQUFLbkMsWUFBTCxFQUE3QyxFQUFrRTtBQUNoRVEsc0JBQU9DLEtBQVAsQ0FBYywwQ0FBeUMsS0FBSzJCLEdBQUwsQ0FBU0MsSUFBSyxHQUFyRTs7QUFDQSxZQUFNLDBDQUFpQixLQUFLaEMsSUFBTCxDQUFVOEIsYUFBM0IsRUFBMEMsS0FBS0MsR0FBTCxDQUFTQyxJQUFuRCxDQUFOO0FBQ0Q7O0FBRUQsUUFBSSxLQUFLOUMsSUFBTCxDQUFVK0MsMkJBQVYsSUFBeUMsQ0FBQyxLQUFLdEMsWUFBTCxFQUE5QyxFQUFtRTtBQUNqRSxZQUFNLEtBQUt1QyxvQkFBTCxFQUFOO0FBQ0Q7O0FBRUQsU0FBSzdFLFlBQUwsR0FBb0IsSUFBcEI7QUFDQSxTQUFLRCxXQUFMLEdBQW1CLElBQW5CO0FBQ0EsU0FBSzRELFVBQUwsR0FBa0IsSUFBbEI7QUFHQSxTQUFLM0MsU0FBTCxHQUFpQixJQUFqQjtBQUNBLFNBQUthLElBQUwsQ0FBVWlDLGNBQVYsR0FBMkIsSUFBM0I7O0FBQ0EsUUFBSSxDQUFDdEMsZ0JBQUVzRCxPQUFGLENBQVUsS0FBS2hGLElBQWYsQ0FBTCxFQUEyQjtBQUN6QixZQUFNLEtBQUtBLElBQUwsQ0FBVWlGLE1BQVYsQ0FBaUJDLFdBQWpCLEVBQU47QUFDQSxXQUFLbEYsSUFBTCxHQUFZLEVBQVo7QUFDRDs7QUFFRCxRQUFJLEtBQUtNLE1BQVQsRUFBaUI7QUFDZixZQUFNLEtBQUs2RSxVQUFMLEVBQU47QUFDRDs7QUFFRCxVQUFNLEtBQUtDLFFBQUwsRUFBTjtBQUNEOztBQUVELFFBQU1DLGFBQU4sR0FBdUI7QUFDckJyQyxvQkFBT0MsS0FBUCxDQUFhLHNCQUFiOztBQUVBLFVBQU0sS0FBS3dCLElBQUwsRUFBTjs7QUFFQSxRQUFJLEtBQUsxQyxJQUFMLENBQVV1RCxnQkFBZCxFQUFnQztBQUM5QixZQUFNeEMsS0FBSyxDQUFDeUMsU0FBTixDQUFnQnBHLGFBQWhCLENBQU47QUFDRCxLQUZELE1BRU87QUFDTDZELHNCQUFPQyxLQUFQLENBQWEsdUVBQWI7QUFDRDs7QUFFRCxRQUFJLEtBQUtULFlBQUwsRUFBSixFQUF5QjtBQUN2QixZQUFNLGdDQUFtQixLQUFLcUIsVUFBeEIsRUFBb0MsS0FBSzlCLElBQXpDLENBQU47QUFDRCxLQUZELE1BRU87QUFDTCxZQUFNLCtCQUFrQixLQUFLNkMsR0FBdkIsRUFBNEIsS0FBSzdDLElBQWpDLEVBQXVDLEtBQUtWLG9CQUE1QyxDQUFOO0FBQ0Q7O0FBQ0QsVUFBTSxNQUFNZ0UsYUFBTixFQUFOO0FBQ0Q7O0FBRUQsUUFBTUcsVUFBTixHQUFvQjtBQUNsQixRQUFJM0MsSUFBSSxHQUFHLE1BQU0sTUFBTTJDLFVBQU4sRUFBakI7QUFFQSxVQUFNQyxZQUFZLEdBQUcsTUFBTSxLQUFLQyxlQUFMLEVBQTNCO0FBQ0EsVUFBTUMsVUFBVSxHQUFHLE1BQU0sS0FBS3pELG1CQUFMLEVBQXpCO0FBQ0EsVUFBTTBELGFBQWEsR0FBRyxNQUFNLEtBQUtDLGtCQUFMLEVBQTVCO0FBRUFoRCxJQUFBQSxJQUFJLENBQUM0QyxZQUFMLEdBQW9CQSxZQUFwQjtBQUNBNUMsSUFBQUEsSUFBSSxDQUFDOEMsVUFBTCxHQUFrQkEsVUFBbEI7QUFDQTlDLElBQUFBLElBQUksQ0FBQytDLGFBQUwsR0FBcUJBLGFBQXJCO0FBRUEsV0FBTy9DLElBQVA7QUFDRDs7QUFFRCxRQUFNaUQsY0FBTixDQUFzQkMsR0FBdEIsRUFBMkIsR0FBRzVILElBQTlCLEVBQW9DO0FBQ2xDNkUsb0JBQU9DLEtBQVAsQ0FBYywwQkFBeUI4QyxHQUFJLEdBQTNDOztBQUNBLFFBQUlBLEdBQUcsS0FBSyxzQkFBWixFQUFvQztBQUNsQyxhQUFPLE1BQU0sS0FBS0Msb0JBQUwsQ0FBMEIsR0FBRzdILElBQTdCLENBQWI7QUFDRCxLQUZELE1BRU8sSUFBSSxLQUFLbUQsS0FBTCxJQUFjSSxnQkFBRXVFLFFBQUYsQ0FBVyxDQUFDLFdBQUQsQ0FBWCxFQUEwQkYsR0FBMUIsQ0FBbEIsRUFBa0Q7QUFDdkQsYUFBTyxNQUFNLE1BQU1ELGNBQU4sQ0FBcUJDLEdBQXJCLEVBQTBCLEdBQUc1SCxJQUE3QixDQUFiO0FBQ0Q7O0FBRUQsVUFBTSxJQUFJbUYseUJBQU80QyxpQkFBWCxDQUE4Qix1Q0FBc0NILEdBQUksR0FBeEUsQ0FBTjtBQUNEOztBQUdELFFBQU0zQixZQUFOLEdBQXNCO0FBQ3BCLFFBQUk7QUFFRixVQUFJLENBQUMsS0FBS3JDLElBQUwsQ0FBVW9FLFFBQVgsSUFBdUJyRCxLQUFLLENBQUNzRCxvQkFBTixDQUEyQixLQUFLckUsSUFBTCxDQUFVd0MsR0FBckMsQ0FBM0IsRUFBc0U7QUFDcEUsYUFBS3hDLElBQUwsQ0FBVW9FLFFBQVYsR0FBcUIsS0FBS3BFLElBQUwsQ0FBVXdDLEdBQS9CO0FBQ0Q7O0FBRUQsVUFBSSxLQUFLeEMsSUFBTCxDQUFVd0MsR0FBVixJQUFpQixLQUFLeEMsSUFBTCxDQUFVd0MsR0FBVixDQUFjOEIsV0FBZCxPQUFnQyxVQUFyRCxFQUFpRTtBQUMvRCxZQUFJQyxVQUFVLENBQUMsS0FBS3ZFLElBQUwsQ0FBVXdFLGVBQVgsQ0FBVixJQUF5QyxDQUE3QyxFQUFnRDtBQUM5Q3ZELDBCQUFPQyxLQUFQLENBQWEsZ0RBQWI7O0FBQ0EsZUFBS2xCLElBQUwsQ0FBVW9FLFFBQVYsR0FBcUIsdUJBQXJCO0FBQ0EsZUFBS3BFLElBQUwsQ0FBVXdDLEdBQVYsR0FBZ0IsSUFBaEI7QUFDRDtBQUNGLE9BTkQsTUFNTyxJQUFJLEtBQUt4QyxJQUFMLENBQVV3QyxHQUFWLElBQWlCLEtBQUt4QyxJQUFMLENBQVV3QyxHQUFWLENBQWM4QixXQUFkLE9BQWdDLFVBQXJELEVBQWlFO0FBQ3RFLFlBQUlDLFVBQVUsQ0FBQyxLQUFLdkUsSUFBTCxDQUFVd0UsZUFBWCxDQUFWLElBQXlDLENBQTdDLEVBQWdEO0FBQzlDdkQsMEJBQU9DLEtBQVAsQ0FBYSw2Q0FBYjs7QUFDQSxlQUFLbEIsSUFBTCxDQUFVb0UsUUFBVixHQUFxQixxQkFBckI7QUFDQSxlQUFLcEUsSUFBTCxDQUFVd0MsR0FBVixHQUFnQixJQUFoQjtBQUNEO0FBQ0YsT0FOTSxNQU1BLElBQUksS0FBS2lDLFFBQUwsRUFBSixFQUFxQjtBQUMxQixZQUFJLENBQUMsS0FBS2hFLFlBQUwsRUFBTCxFQUEwQjtBQUN4QixjQUFJOEQsVUFBVSxDQUFDLEtBQUt2RSxJQUFMLENBQVV3RSxlQUFYLENBQVYsSUFBeUMsQ0FBN0MsRUFBZ0Q7QUFDOUN2RCw0QkFBT0MsS0FBUCxDQUFhLDJDQUFiOztBQUNBLGlCQUFLbEIsSUFBTCxDQUFVb0UsUUFBVixHQUFxQk0scUJBQXJCO0FBQ0EsaUJBQUsxRSxJQUFMLENBQVV3QyxHQUFWLEdBQWdCLElBQWhCO0FBQ0Q7QUFDRixTQU5ELE1BTU87QUFHTCxjQUFJLEVBQUMsTUFBTSxLQUFLVixVQUFMLENBQWdCNkMsV0FBaEIsQ0FBNEIsS0FBSzNFLElBQUwsQ0FBVW9FLFFBQXRDLENBQVAsQ0FBSixFQUE0RDtBQUUxRCxnQkFBSSxNQUFNLG1DQUFWLEVBQTBCO0FBQ3hCbkQsOEJBQU9DLEtBQVAsQ0FBYSx1Q0FBYjs7QUFDQSxvQkFBTSw4QkFBTjtBQUNEOztBQUNELGlCQUFLbEIsSUFBTCxDQUFVb0UsUUFBVixHQUFxQlEsc0NBQXJCO0FBQ0Q7QUFDRjtBQUNGLE9BbkJNLE1BbUJBLElBQUksS0FBSzVFLElBQUwsQ0FBVW9FLFFBQVYsSUFDQXJELEtBQUssQ0FBQ3NELG9CQUFOLENBQTJCLEtBQUtyRSxJQUFMLENBQVVvRSxRQUFyQyxDQURBLEtBRUMsS0FBS3BFLElBQUwsQ0FBVXdDLEdBQVYsS0FBa0IsRUFBbEIsSUFBd0J6QixLQUFLLENBQUNzRCxvQkFBTixDQUEyQixLQUFLckUsSUFBTCxDQUFVd0MsR0FBckMsQ0FGekIsQ0FBSixFQUV5RTtBQUU5RXZCLHdCQUFPQyxLQUFQLENBQWEsMkRBQWI7QUFDRCxPQUxNLE1BS0E7QUFDTCxhQUFLbEIsSUFBTCxDQUFVd0MsR0FBVixHQUFnQixNQUFNLEtBQUtxQyxPQUFMLENBQWF4QyxZQUFiLENBQTBCLEtBQUtyQyxJQUFMLENBQVV3QyxHQUFwQyxFQUF5QyxNQUF6QyxDQUF0QjtBQUNEO0FBQ0YsS0E3Q0QsQ0E2Q0UsT0FBT0YsR0FBUCxFQUFZO0FBQ1pyQixzQkFBT3NCLEtBQVAsQ0FBYUQsR0FBYjs7QUFDQSxZQUFNLElBQUl3QyxLQUFKLENBQ0gsWUFBVyxLQUFLOUUsSUFBTCxDQUFVd0MsR0FBSSw2REFBMUIsR0FDQSx5RUFGSSxDQUFOO0FBR0Q7QUFDRjs7QUFFRCxRQUFNN0IsY0FBTixHQUF3QjtBQUN0QixVQUFNSSxLQUFLLENBQUNnRSx1QkFBTixDQUE4QixLQUFLNUMsSUFBbkMsQ0FBTjs7QUFFQSxRQUFJLENBQUMsS0FBS3BFLFlBQVYsRUFBd0I7QUFDdEJrRCxzQkFBT0MsS0FBUCxDQUFhLHVCQUFiOztBQUNBLFdBQUtuRCxZQUFMLEdBQW9CLE1BQU1nRCxLQUFLLENBQUNDLHVCQUFOLENBQThCLEtBQUtoQixJQUFuQyxDQUExQjs7QUFDQWlCLHNCQUFPQyxLQUFQLENBQWMsd0JBQXVCLEtBQUtuRCxZQUFMLENBQWtCb0QsYUFBYyxFQUFyRTtBQUNEOztBQUVERixvQkFBT0MsS0FBUCxDQUFhLHlCQUFiOztBQUNBLFNBQUtsRCxhQUFMLEdBQXFCLE1BQU0rQyxLQUFLLENBQUNpRSx3QkFBTixFQUEzQjs7QUFDQS9ELG9CQUFPQyxLQUFQLENBQWMsMEJBQXlCLEtBQUtsRCxhQUFjLEVBQTFEOztBQUVBLFFBQUlpSCxPQUFPLEdBQUd0RixnQkFBRXVGLFFBQUYsQ0FBVyxLQUFLbEYsSUFBTCxDQUFVbUYsYUFBckIsSUFBc0MsS0FBS25GLElBQUwsQ0FBVW1GLGFBQVYsQ0FBd0JDLE1BQTlELEdBQXVFLEtBQUtwRixJQUFMLENBQVVtRixhQUEvRjtBQUNBLFFBQUlFLGdCQUFnQixHQUFHLE1BQU0scUJBQU0sQ0FBTixFQUFTQyw4QkFBaUJDLG1CQUExQixFQUErQ04sT0FBL0MsQ0FBN0I7QUFFQSxRQUFJTyxVQUFVLEdBQUcsTUFBTSxxQ0FBd0IsS0FBS3hGLElBQTdCLEVBQW1DLEtBQUtoQyxhQUF4QyxFQUF1RHFILGdCQUF2RCxDQUF2QjtBQUVBLFNBQUt4QyxHQUFMLEdBQVcsTUFBTSxzQ0FBYTJDLFVBQWIsRUFBeUIsS0FBS3pILFlBQUwsQ0FBa0JvRCxhQUEzQyxDQUFqQjtBQUVBLFVBQU0sNEJBQWUsS0FBSzBCLEdBQXBCLENBQU47QUFFQSxTQUFLN0MsSUFBTCxDQUFVeUYsa0JBQVYsR0FBK0IsTUFBTTFFLEtBQUssQ0FBQzJFLHVCQUFOLENBQThCLEtBQUsxRixJQUFuQyxDQUFyQztBQUVBLFVBQU1lLEtBQUssQ0FBQzRFLGtCQUFOLENBQXlCLEtBQUszRixJQUE5QixDQUFOO0FBRUEsVUFBTSxLQUFLNEYsaUJBQUwsRUFBTjtBQUVBO0FBRUUsV0FBS0Msd0JBQUwsR0FBZ0M5RSxLQUFLLENBQUM4RSx3QkFBTixDQUErQixLQUFLN0YsSUFBcEMsRUFBMEMsS0FBS2hDLGFBQS9DLENBQWhDO0FBQ0EsVUFBSThILE9BQU8sR0FBRyxNQUFNLG1DQUFzQixLQUFLOUYsSUFBM0IsQ0FBcEI7O0FBQ0EsVUFBSSxLQUFLYyxJQUFMLENBQVUwQixHQUFkLEVBQW1CO0FBQ2pCLGNBQU16QixLQUFLLENBQUNnRix3QkFBTixDQUErQixLQUFLL0YsSUFBTCxDQUFVd0MsR0FBekMsRUFBOENzRCxPQUE5QyxDQUFOO0FBQ0Q7QUFDRjtBQUVELFVBQU0sK0JBQWtCLEtBQUtqRCxHQUF2QixFQUE0QixLQUFLN0MsSUFBakMsRUFBdUMsS0FBS1Ysb0JBQTVDLENBQU47O0FBRUEsUUFBSSxLQUFLd0IsSUFBTCxDQUFVOEIsYUFBVixJQUEyQixDQUFDLEtBQUtuQyxZQUFMLEVBQWhDLEVBQXFEO0FBQ25ELFlBQU0sd0NBQWUsS0FBS0ssSUFBTCxDQUFVOEIsYUFBekIsRUFBd0MsS0FBS0MsR0FBTCxDQUFTQyxJQUFqRCxDQUFOO0FBQ0Q7O0FBRUQsUUFBSSxLQUFLOUMsSUFBTCxDQUFVK0MsMkJBQVYsSUFBeUMsQ0FBQyxLQUFLdEMsWUFBTCxFQUE5QyxFQUFtRTtBQUVqRSxZQUFNLEtBQUt1RixxQkFBTCxFQUFOO0FBQ0Q7O0FBRUQsVUFBTSxvQ0FBdUIsS0FBS25ELEdBQTVCLEVBQWlDLEtBQUs3QyxJQUF0QyxDQUFOO0FBQ0EsU0FBS2lHLFdBQUwsR0FBbUIsTUFBTSx1Q0FBd0IsS0FBS3BELEdBQTdCLEVBQWtDLEtBQUs3QyxJQUF2QyxFQUE2QyxLQUFLeUUsUUFBTCxFQUE3QyxFQUE4RHlCLG9CQUE5RCxDQUF6QjtBQUNBLFVBQU0sS0FBS0MsZUFBTCxDQUFxQixLQUFLdEQsR0FBMUIsQ0FBTjtBQUNBLFVBQU0sS0FBS3VELGtCQUFMLEVBQU47QUFDQSxVQUFNLEtBQUtDLGdCQUFMLEVBQU47QUFDQSxVQUFNLEtBQUtDLG1CQUFMLEVBQU47QUFDQSxVQUFNLEtBQUtDLGtCQUFMLEVBQU47QUFDQSxVQUFNLEtBQUtDLFdBQUwsRUFBTjtBQUNBLFVBQU0sS0FBS0MscUJBQUwsRUFBTjtBQUNBLFVBQU0sS0FBS0MsZUFBTCxFQUFOO0FBQ0EsVUFBTSxLQUFLQyxrQkFBTCxFQUFOO0FBQ0Q7O0FBRUQsUUFBTWpHLGVBQU4sR0FBeUI7QUFDdkIsVUFBTUssS0FBSyxDQUFDZ0UsdUJBQU4sQ0FBOEIsS0FBSzVDLElBQW5DLENBQU47QUFDQSxTQUFLbkMsSUFBTCxDQUFVeUYsa0JBQVYsR0FBK0IsTUFBTTFFLEtBQUssQ0FBQzJFLHVCQUFOLENBQThCLEtBQUsxRixJQUFuQyxDQUFyQztBQUNBLFVBQU1lLEtBQUssQ0FBQzRFLGtCQUFOLENBQXlCLEtBQUszRixJQUE5QixDQUFOO0FBQ0EsVUFBTSxLQUFLNEYsaUJBQUwsRUFBTjtBQUNBLFVBQU0sZ0NBQW1CLEtBQUs5RCxVQUF4QixFQUFvQyxLQUFLOUIsSUFBekMsQ0FBTjtBQUNBLFVBQU0sS0FBS21HLGVBQUwsRUFBTjtBQUNBLFVBQU0sS0FBS1MsbUJBQUwsRUFBTjtBQUNBLFVBQU0sS0FBS1AsZ0JBQUwsRUFBTjtBQUNBLFVBQU0sS0FBS0MsbUJBQUwsRUFBTjtBQUNBLFVBQU0sS0FBS0Msa0JBQUwsRUFBTjtBQUNBLFVBQU0sS0FBS0MsV0FBTCxFQUFOO0FBQ0EsVUFBTSxLQUFLQyxxQkFBTCxFQUFOO0FBQ0EsVUFBTSxLQUFLQyxlQUFMLEVBQU47QUFDQSxVQUFNLEtBQUtDLGtCQUFMLEVBQU47QUFDRDs7QUFFRCxRQUFNQyxtQkFBTixHQUE2QjtBQUczQixRQUFJLEtBQUs1RyxJQUFMLENBQVU2RyxVQUFWLEtBQXlCLEtBQTdCLEVBQW9DO0FBQ2xDO0FBQ0Q7O0FBR0QsUUFBSSxLQUFLN0csSUFBTCxDQUFVd0MsR0FBZCxFQUFtQjtBQUNqQixVQUFJc0UsR0FBRyxHQUFHLEtBQUs5RyxJQUFMLENBQVV3QyxHQUFWLENBQWN1RSxTQUFkLENBQXdCLEtBQUsvRyxJQUFMLENBQVV3QyxHQUFWLENBQWN3RSxNQUFkLEdBQXVCLENBQS9DLEVBQWtEMUMsV0FBbEQsRUFBVjs7QUFDQSxVQUFJd0MsR0FBRyxLQUFLLEtBQVosRUFBbUI7QUFDakIsYUFBSzlHLElBQUwsQ0FBVWlILEdBQVYsR0FBZ0IsS0FBS2pILElBQUwsQ0FBVXdDLEdBQTFCO0FBQ0Q7QUFDRjs7QUFFRCxRQUFJLEtBQUt4QyxJQUFMLENBQVU4QyxJQUFkLEVBQW9CO0FBQ2xCLFVBQUksTUFBTSxLQUFLaEIsVUFBTCxDQUFnQjZDLFdBQWhCLENBQTRCLEtBQUszRSxJQUFMLENBQVVvRSxRQUF0QyxDQUFWLEVBQTJEO0FBQ3pEbkQsd0JBQU9DLEtBQVAsQ0FBYSxtQkFBYjs7QUFDQSxZQUFJLEtBQUtsQixJQUFMLENBQVVrSCxTQUFkLEVBQXlCO0FBQ3ZCakcsMEJBQU9DLEtBQVAsQ0FBYSwyQ0FBYjtBQUNELFNBRkQsTUFFTztBQUNMRCwwQkFBT0MsS0FBUCxDQUFhLDhDQUFiOztBQUNBO0FBQ0Q7QUFDRixPQVJELE1BUU87QUFDTEQsd0JBQU9DLEtBQVAsQ0FBYSw0Q0FBYjtBQUNEOztBQUVELFVBQUksS0FBS2xCLElBQUwsQ0FBVWlILEdBQVYsSUFBaUIsS0FBS2pILElBQUwsQ0FBVW9FLFFBQS9CLEVBQXlDO0FBQ3ZDLGNBQU0sS0FBSytDLFVBQUwsRUFBTjs7QUFDQWxHLHdCQUFPQyxLQUFQLENBQWEsZ0JBQWI7QUFDRCxPQUhELE1BR08sSUFBSSxLQUFLbEIsSUFBTCxDQUFVaUgsR0FBZCxFQUFtQjtBQUN4QixZQUFJNUYsR0FBRyxHQUFHLGdFQUFWOztBQUNBSix3QkFBT21HLElBQVAsQ0FBWS9GLEdBQVo7O0FBQ0EsY0FBTSxJQUFJRSx5QkFBTzhGLFlBQVgsQ0FBd0JoRyxHQUF4QixDQUFOO0FBQ0QsT0FKTSxNQUlBLElBQUksS0FBS3JCLElBQUwsQ0FBVXdDLEdBQWQsRUFBbUI7QUFDeEIsY0FBTSxLQUFLVixVQUFMLENBQWdCd0YsT0FBaEIsQ0FBd0IsS0FBS3RILElBQUwsQ0FBVXdDLEdBQWxDLENBQU47O0FBQ0F2Qix3QkFBT0MsS0FBUCxDQUFhLGdCQUFiO0FBQ0QsT0FITSxNQUdBO0FBQ0xELHdCQUFPQyxLQUFQLENBQWEseUVBQ0EsV0FEYjtBQUVEO0FBQ0YsS0EzQkQsTUEyQk87QUFDTEQsc0JBQU9DLEtBQVAsQ0FBYSxxREFBYjtBQUNEO0FBQ0Y7O0FBRURxRyxFQUFBQSxhQUFhLEdBQUk7QUFDZixRQUFJQyxPQUFPLEdBQUduSyxjQUFLQyxPQUFMLENBQWFtSyxTQUFiLEVBQXdCLGlCQUF4QixFQUNhLDBDQURiLENBQWQ7O0FBRUF4RyxvQkFBT0MsS0FBUCxDQUFjLHFDQUFvQyxLQUFLbEIsSUFBTCxDQUFVOEMsSUFBSyxFQUFqRTs7QUFDQSxRQUFJO0FBQ0YsYUFBTzNHLE9BQU8sQ0FBQyxLQUFLNkQsSUFBTCxDQUFVOEMsSUFBWCxDQUFkO0FBQ0QsS0FGRCxDQUVFLE9BQU80RSxFQUFQLEVBQVc7QUFDWHpHLHNCQUFPQyxLQUFQLENBQWMsc0RBQXFEc0csT0FBUSxFQUEzRTs7QUFDQSxVQUFJO0FBQ0YsZUFBT3JMLE9BQU8sQ0FBQyxLQUFLNkQsSUFBTCxDQUFVOEMsSUFBWCxFQUFpQjtBQUFDa0IsVUFBQUEsR0FBRyxFQUFFd0Q7QUFBTixTQUFqQixDQUFkO0FBQ0QsT0FGRCxDQUVFLE9BQU9HLEVBQVAsRUFBVztBQUNYLFlBQUl0RyxHQUFHLEdBQUcsNERBQ0Esb0NBRFY7O0FBRUFKLHdCQUFPc0IsS0FBUCxDQUFhbEIsR0FBYjs7QUFDQSxjQUFNLElBQUl5RCxLQUFKLENBQVV6RCxHQUFWLENBQU47QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsUUFBTThGLFVBQU4sR0FBb0I7QUFDbEJsRyxvQkFBT0MsS0FBUCxDQUFjLDJCQUEwQixLQUFLbEIsSUFBTCxDQUFVaUgsR0FBSSxFQUF0RDs7QUFDQSxRQUFJLE1BQU0sS0FBS25GLFVBQUwsQ0FBZ0I2QyxXQUFoQixDQUE0QixLQUFLM0UsSUFBTCxDQUFVb0UsUUFBdEMsQ0FBVixFQUEyRDtBQUN6RG5ELHNCQUFPQyxLQUFQLENBQWEsdURBQWI7O0FBQ0EsWUFBTSxLQUFLWSxVQUFMLENBQWdCOEYsTUFBaEIsQ0FBdUIsS0FBSzVILElBQUwsQ0FBVW9FLFFBQWpDLENBQU47QUFDRCxLQUhELE1BR087QUFDTG5ELHNCQUFPQyxLQUFQLENBQWEsc0RBQWI7QUFDRDs7QUFDRCxVQUFNLEtBQUtZLFVBQUwsQ0FBZ0IrRixjQUFoQixDQUErQixLQUFLN0gsSUFBTCxDQUFVaUgsR0FBekMsRUFBOEMsS0FBS2pILElBQUwsQ0FBVW9FLFFBQXhELENBQU47QUFDRDs7QUFFRDBELEVBQUFBLG1CQUFtQixDQUFFaEgsSUFBRixFQUFRO0FBRXpCLFFBQUlpSCxHQUFHLEdBQUcsTUFBTUQsbUJBQU4sQ0FBMEJoSCxJQUExQixDQUFWO0FBQ0EsUUFBSSxDQUFDaUgsR0FBTCxFQUFVLE9BQU9BLEdBQVA7QUFFVixXQUFPLHVDQUFxQmpILElBQXJCLENBQVA7QUFDRDs7QUFFRCxRQUFNc0Ysa0JBQU4sR0FBNEI7QUFDMUIsUUFBSSxDQUFDLEtBQUtQLHdCQUFWLEVBQW9DO0FBQ2xDNUUsc0JBQU9DLEtBQVAsQ0FBYSw2QkFBYjs7QUFDQTtBQUNEOztBQUNELFVBQU0sMEJBQWEsS0FBSzJCLEdBQWxCLENBQU47QUFFRDs7QUFFRCxRQUFNeUQsbUJBQU4sR0FBNkI7QUFDM0JyRixvQkFBT0MsS0FBUCxDQUFhLDREQUFiOztBQUNBLFFBQUksS0FBS2xCLElBQUwsQ0FBVWdJLFdBQWQsRUFBMkI7QUFDekIvRyxzQkFBT0MsS0FBUCxDQUFhLHdDQUFiOztBQUNBLGFBQU8sTUFBTStHLGtCQUFHQyxRQUFILENBQVksS0FBS2xJLElBQUwsQ0FBVXdDLEdBQXRCLEVBQTJCLEtBQUt4QyxJQUFMLENBQVVnSSxXQUFyQyxDQUFiO0FBQ0Q7QUFDRjs7QUFFRCxRQUFNeEIsV0FBTixHQUFxQjtBQUNuQixRQUFJLEtBQUt4RyxJQUFMLENBQVVvRSxRQUFkLEVBQXdCO0FBRXRCO0FBQ0QsS0FIRCxNQUdPO0FBQ0wsVUFBSStELEdBQUcsR0FBRyxNQUFNLEtBQUtoSyxZQUFMLENBQWtCaUssV0FBbEIsQ0FBOEIsZUFBOUIsQ0FBaEI7O0FBQ0FuSCxzQkFBT0MsS0FBUCxDQUFjLDZCQUE0QmlILEdBQUcsQ0FBQ0UsS0FBTSxFQUFwRDs7QUFDQSxXQUFLckksSUFBTCxDQUFVb0UsUUFBVixHQUFxQitELEdBQUcsQ0FBQ0UsS0FBekI7QUFDRDtBQUNGOztBQUVELFFBQU1DLFNBQU4sR0FBbUI7QUFDakIsUUFBSSxLQUFLdEksSUFBTCxDQUFVc0ksU0FBZCxFQUF5QjtBQUN2QixXQUFLQyxVQUFMLEdBQWtCLElBQUlDLFVBQUosQ0FBUyxLQUFLeEksSUFBTCxDQUFVeUksb0JBQW5CLEVBQXlDLEtBQUt6SSxJQUFMLENBQVU4QyxJQUFuRCxDQUFsQjtBQUNBLFlBQU0sS0FBS3lGLFVBQUwsQ0FBZ0IvSCxLQUFoQixFQUFOO0FBQ0Q7QUFDRjs7QUFFRCxRQUFNNkMsUUFBTixHQUFrQjtBQUNoQixRQUFJLEtBQUtrRixVQUFULEVBQXFCO0FBQ25CLFlBQU0sS0FBS0EsVUFBTCxDQUFnQjdGLElBQWhCLEVBQU47QUFDQSxhQUFPLEtBQUs2RixVQUFaO0FBQ0Q7QUFDRjs7QUFFRCxRQUFNOUIscUJBQU4sR0FBK0I7QUFDN0IsUUFBSTlHLGdCQUFFK0ksUUFBRixDQUFXLEtBQUsxSSxJQUFMLENBQVVrQyxrQkFBckIsS0FDQXZDLGdCQUFFdUUsUUFBRixDQUFXLENBQUMsV0FBRCxFQUFjLFVBQWQsQ0FBWCxFQUFzQyxLQUFLbEUsSUFBTCxDQUFVa0Msa0JBQVYsQ0FBNkJ5RyxXQUE3QixFQUF0QyxDQURKLEVBQ3VGO0FBQ3JGMUgsc0JBQU9DLEtBQVAsQ0FBYyxrQ0FBaUMsS0FBS2xCLElBQUwsQ0FBVWtDLGtCQUFtQixFQUE1RTs7QUFDQSxVQUFJMEcsT0FBTyxHQUFJLDRCQUEyQixLQUFLNUksSUFBTCxDQUFVa0Msa0JBQVYsQ0FBNkJ5RyxXQUE3QixFQUEyQyxJQUFyRjs7QUFDQSxVQUFJO0FBQ0YsY0FBTSxLQUFLeEssWUFBTCxDQUFrQmlLLFdBQWxCLENBQThCUSxPQUE5QixDQUFOO0FBQ0EsYUFBSzVJLElBQUwsQ0FBVWlDLGNBQVYsR0FBMkIsS0FBS2pDLElBQUwsQ0FBVWtDLGtCQUFyQztBQUNELE9BSEQsQ0FHRSxPQUFPSSxHQUFQLEVBQVk7QUFDWnJCLHdCQUFPbUcsSUFBUCxDQUFhLDRDQUEyQzlFLEdBQUksRUFBNUQ7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQ3QixFQUFBQSxZQUFZLEdBQUk7QUFDZCxXQUFPLENBQUMsQ0FBQyxLQUFLVCxJQUFMLENBQVU4QyxJQUFuQjtBQUNEOztBQUVEMkIsRUFBQUEsUUFBUSxHQUFJO0FBQ1YsV0FBTyxLQUFLekUsSUFBTCxDQUFVZ0MsTUFBakI7QUFDRDs7QUFFRCxRQUFNMkUsa0JBQU4sR0FBNEI7QUFJMUIsUUFBSWtDLE1BQUo7O0FBQ0EsUUFBSSxLQUFLN0ksSUFBTCxDQUFVOEksZ0JBQWQsRUFBZ0M7QUFHOUI3SCxzQkFBT0MsS0FBUCxDQUFjLDhDQUE2QyxLQUFLbEIsSUFBTCxDQUFVOEksZ0JBQWlCLEVBQXRGOztBQUNBRCxNQUFBQSxNQUFNLEdBQUcsWUFBWTtBQUNuQixZQUFJZCxHQUFKOztBQUNBLFlBQUk7QUFDRkEsVUFBQUEsR0FBRyxHQUFHLE1BQU0sS0FBSzVKLFlBQUwsQ0FBa0JpSyxXQUFsQixDQUErQixTQUFRLEtBQUtwSSxJQUFMLENBQVU4SSxnQkFBaUIsRUFBcEMsR0FDOUIscUVBREEsQ0FBWjtBQUVELFNBSEQsQ0FHRSxPQUFPeEcsR0FBUCxFQUFZO0FBQ1pyQiwwQkFBT0MsS0FBUCxDQUFjLDZDQUE0Q29CLEdBQUksRUFBOUQ7O0FBQ0EsaUJBQU8sS0FBUDtBQUNEOztBQUNELFlBQUksT0FBT3lGLEdBQVAsS0FBZSxTQUFuQixFQUE4QjtBQUM1QjlHLDBCQUFPQyxLQUFQLENBQWEsbURBQWI7O0FBQ0EsaUJBQU8sS0FBUDtBQUNEOztBQUNELGVBQU82RyxHQUFQO0FBQ0QsT0FkRDtBQWVELEtBbkJELE1BbUJPLElBQUksS0FBS3RELFFBQUwsRUFBSixFQUFxQjtBQUMxQixVQUFJLEtBQUtoRSxZQUFMLEVBQUosRUFBeUI7QUFDdkIsY0FBTSxLQUFLc0kseUJBQUwsRUFBTjtBQUNEOztBQUNEOUgsc0JBQU9DLEtBQVAsQ0FBYSw2QkFBYjs7QUFDQSxZQUFNLEtBQUs4SCxtQkFBTCxFQUFOOztBQUNBSCxNQUFBQSxNQUFNLEdBQUcsWUFBWSxJQUFyQjtBQUNELEtBUE0sTUFPQTtBQUNMNUgsc0JBQU9DLEtBQVAsQ0FBYSw0Q0FBYjs7QUFDQTJILE1BQUFBLE1BQU0sR0FBRyxZQUFZO0FBQ25CLFlBQUk7QUFDRixjQUFJSSxNQUFNLEdBQUcsTUFBTSxLQUFLQyx5QkFBTCxFQUFuQjtBQUNBRCxVQUFBQSxNQUFNLEdBQUdFLElBQUksQ0FBQ0MsS0FBTCxDQUFXSCxNQUFNLElBQUksSUFBckIsQ0FBVDtBQUNBLGNBQUlJLE1BQU0sR0FBRyxDQUFDSixNQUFNLENBQUNLLGNBQVAsSUFBeUIsRUFBMUIsRUFBOEIsR0FBOUIsQ0FBYjtBQUNBLGlCQUFPRCxNQUFNLElBQUlBLE1BQU0sQ0FBQ3JDLE1BQVAsR0FBZ0IsQ0FBMUIsSUFBK0IsQ0FBQ3JKLFNBQVMsQ0FBQzRMLGFBQVYsQ0FBd0JOLE1BQU0sQ0FBQ0ssY0FBL0IsQ0FBdkM7QUFDRCxTQUxELENBS0UsT0FBT0UsQ0FBUCxFQUFVO0FBQ1Z2SSwwQkFBT21HLElBQVAsQ0FBYSx3REFBdURvQyxDQUFFLEVBQXRFOztBQUNBLGlCQUFPLEtBQVA7QUFDRDtBQUNGLE9BVkQ7QUFXRDs7QUFDRCxRQUFJO0FBQ0YsWUFBTSxnQ0FBaUJYLE1BQWpCLEVBQXlCO0FBQUM1SCxRQUFBQSxNQUFNLEVBQU5BLGVBQUQ7QUFBU3dJLFFBQUFBLE1BQU0sRUFBRSxLQUFqQjtBQUF3QkMsUUFBQUEsVUFBVSxFQUFFO0FBQXBDLE9BQXpCLENBQU47QUFDRCxLQUZELENBRUUsT0FBT3BILEdBQVAsRUFBWTtBQUNaLFVBQUlBLEdBQUcsQ0FBQ3FILE9BQUosSUFBZXJILEdBQUcsQ0FBQ3FILE9BQUosQ0FBWUMsS0FBWixDQUFrQixpQkFBbEIsQ0FBbkIsRUFBeUQ7QUFDdkQzSSx3QkFBT21HLElBQVAsQ0FBWSxvRUFBWjs7QUFDQW5HLHdCQUFPQyxLQUFQLENBQWMsMkJBQTBCb0IsR0FBSSxFQUE1QztBQUNELE9BSEQsTUFHTztBQUNMLGNBQU1BLEdBQU47QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsU0FBT2lILGFBQVAsQ0FBc0JNLFFBQXRCLEVBQWdDO0FBTzlCLFdBQU9sSyxnQkFBRW1LLFVBQUYsQ0FBYUQsUUFBUSxDQUFDLEdBQUQsQ0FBckIsRUFBNEIsTUFBNUIsTUFBd0MsYUFBL0M7QUFDRDs7QUFFRCxRQUFNakUsaUJBQU4sR0FBMkI7QUFDekIzRSxvQkFBT0MsS0FBUCxDQUFhLHNCQUFiOztBQUNBLFNBQUsvQyxZQUFMLEdBQW9CLElBQUk0TCxvQkFBSixDQUFpQixLQUFLNUgsSUFBdEIsQ0FBcEI7QUFDQSxTQUFLakUsV0FBTCxHQUFtQixNQUFNLEtBQUs4TCxlQUFMLEVBQXpCO0FBQ0EsU0FBSzlMLFdBQUwsQ0FBaUIrTCxVQUFqQixDQUE0QkMsS0FBNUIsQ0FBa0MsWUFBWTtBQUU1QyxZQUFNLEtBQUtDLHVCQUFMLENBQTZCLElBQUk1SSx5QkFBTzhGLFlBQVgsQ0FBd0IsbUNBQXhCLENBQTdCLENBQU47QUFDRCxLQUhELEVBR0crQyxJQUhIO0FBSUQ7O0FBRURDLEVBQUFBLDJCQUEyQixHQUFJO0FBQzdCLFdBQU8sS0FBS3JJLE1BQUwsSUFBZSxLQUFLdkIsWUFBTCxFQUF0QjtBQUNEOztBQUVELFFBQU11SixlQUFOLEdBQXlCO0FBRXZCLFFBQUlNLGFBQWEsR0FBRyxNQUFNLDhCQUFpQjtBQUN6Q25JLE1BQUFBLElBQUksRUFBRSxLQUFLQSxJQUQ4QjtBQUV6Q29JLE1BQUFBLGFBQWEsRUFBRSxLQUFLdkssSUFBTCxDQUFVdUssYUFGZ0I7QUFHekNDLE1BQUFBLGtCQUFrQixFQUFFLEtBSHFCO0FBSXpDQyxNQUFBQSxnQkFBZ0IsRUFBRSxLQUFLekssSUFBTCxDQUFVeUssZ0JBSmE7QUFLekNDLE1BQUFBLGlCQUFpQixFQUFFLEtBQUsxSyxJQUFMLENBQVUwSyxpQkFMWTtBQU16Q0MsTUFBQUEsZUFBZSxFQUFFLEtBQUszSyxJQUFMLENBQVUySyxlQUFWLEtBQThCLEtBQUtsSyxZQUFMLEtBQXNCLFNBQXRCLEdBQWtDLFVBQWhFO0FBTndCLEtBQWpCLENBQTFCO0FBUUEsUUFBSXZDLFdBQVcsR0FBRyxJQUFJME0sd0JBQUosQ0FBZ0I7QUFFaENwSSxNQUFBQSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUsvQixZQUFMLEVBQUQsR0FBdUIsS0FBS1QsSUFBTCxDQUFVd0MsR0FBakMsR0FBdUMsSUFBeEMsS0FBaUQsS0FBS3hDLElBQUwsQ0FBVW9FLFFBRmhDO0FBR2hDdEIsTUFBQUEsSUFBSSxFQUFFLEtBQUs5QyxJQUFMLENBQVU4QyxJQUhnQjtBQUloQytILE1BQUFBLGdCQUFnQixFQUFFLEtBQUs3SyxJQUFMLENBQVU2SyxnQkFKSTtBQUtoQ0MsTUFBQUEsaUJBQWlCLEVBQUUsS0FBS1QsMkJBQUwsRUFMYTtBQU1oQ1UsTUFBQUEsU0FBUyxFQUFFVCxhQU5xQjtBQU9oQ1UsTUFBQUEsUUFBUSxFQUFFLEtBQUtoTCxJQUFMLENBQVVpTCwyQkFQWTtBQVFoQ0MsTUFBQUEsZUFBZSxFQUFFLEtBQUtsTCxJQUFMLENBQVVrTCxlQVJLO0FBU2hDQyxNQUFBQSxZQUFZLEVBQUUsS0FBS25MLElBQUwsQ0FBVW1MLFlBVFE7QUFVaEMzRyxNQUFBQSxlQUFlLEVBQUUsS0FBS3hFLElBQUwsQ0FBVXdFLGVBVks7QUFXaEM0RyxNQUFBQSxTQUFTLEVBQUUsS0FBS3BMLElBQUwsQ0FBVW9MLFNBWFc7QUFZaENqRyxNQUFBQSxhQUFhLEVBQUUsS0FBS25GLElBQUwsQ0FBVW1GLGFBWk87QUFhaENrRyxNQUFBQSxhQUFhLEVBQUUsS0FBS3JMLElBQUwsQ0FBVXNMLGNBYk87QUFjaEN4SixNQUFBQSxVQUFVLEVBQUUsS0FBS3JCLFlBQUwsRUFkb0I7QUFlaEM4SyxNQUFBQSxxQkFBcUIsRUFBRSxLQUFLdk4sYUFBTCxJQUFzQixHQUF0QixHQUE0QixNQUFNLG1DQUFzQixLQUFLZ0MsSUFBM0IsQ0FBbEMsR0FBcUUsSUFmNUQ7QUFnQmhDb0MsTUFBQUEsTUFBTSxFQUFFL0UsY0FBS0MsT0FBTCxDQUFhLEtBQUswQyxJQUFMLENBQVVvQyxNQUFWLElBQW9CLE1BQWpDLEVBQXlDLG9CQUF6QyxDQWhCd0I7QUFpQmhDb0osTUFBQUEsUUFBUSxFQUFFLEtBQUt4TCxJQUFMLENBQVV3TCxRQWpCWTtBQWtCaENDLE1BQUFBLE1BQU0sRUFBRSxLQUFLekwsSUFBTCxDQUFVeUwsTUFsQmM7QUFtQmhDQyxNQUFBQSxRQUFRLEVBQUUsS0FBSzFMLElBQUwsQ0FBVTBMO0FBbkJZLEtBQWhCLENBQWxCO0FBcUJBLFdBQU94TixXQUFQO0FBQ0Q7O0FBRUQsUUFBTW1JLGdCQUFOLEdBQTBCO0FBQ3hCcEYsb0JBQU9DLEtBQVAsQ0FBYSxtREFBYjs7QUFFQSxVQUFNMUUsa0JBQUVtUCxHQUFGLENBQU0sQ0FDVixLQUFLeE4sWUFBTCxDQUFrQnFDLEtBQWxCLEdBQTBCb0wsSUFBMUIsQ0FBK0IsTUFBTTtBQUFFLFdBQUsxTixXQUFMLENBQWlCMk4sY0FBakI7QUFBb0MsS0FBM0UsQ0FEVSxFQUVWLEtBQUszTixXQUFMLENBQWlCNE4sTUFBakIsRUFGVSxDQUFOLENBQU47QUFJRDs7QUFFRCxRQUFNdkYsa0JBQU4sR0FBNEI7QUFDMUJ0RixvQkFBT0MsS0FBUCxDQUFhLHNDQUFiOztBQUNBLFFBQUk2SyxTQUFTLEdBQUcsSUFBaEI7QUFDQSxRQUFJL0gsR0FBRyxHQUFHLHdCQUFWO0FBQ0FBLElBQUFBLEdBQUcsSUFBSSxXQUFQO0FBQ0FBLElBQUFBLEdBQUcsSUFBSyxpQkFBZ0IrSCxTQUFVLEtBQWxDO0FBR0EsVUFBTSxLQUFLNU4sWUFBTCxDQUFrQmlLLFdBQWxCLENBQThCcEUsR0FBOUIsQ0FBTjtBQUNEOztBQUVELFFBQU1rRix5QkFBTixDQUFpQzhDLEdBQWpDLEVBQXNDO0FBQ3BDLFFBQUkvQyxNQUFKOztBQUNBLFFBQUksQ0FBQytDLEdBQUwsRUFBVTtBQUNSL0MsTUFBQUEsTUFBTSxHQUFHLE1BQU0sS0FBSzlLLFlBQUwsQ0FBa0JpSyxXQUFsQixDQUE4Qiw4QkFBOUIsQ0FBZjtBQUNELEtBRkQsTUFFTztBQUNMYSxNQUFBQSxNQUFNLEdBQUcsTUFBTSxLQUFLOUssWUFBTCxDQUFrQmlLLFdBQWxCLENBQStCLGtCQUFpQjRELEdBQUksb0JBQXBELENBQWY7QUFDRDs7QUFHRCxRQUFJL0MsTUFBSixFQUFZO0FBQ1YsYUFBT0UsSUFBSSxDQUFDOEMsU0FBTCxDQUFlaEQsTUFBZixDQUFQO0FBQ0QsS0FGRCxNQUVPO0FBR0wsWUFBTSxJQUFJbkUsS0FBSixDQUFXLDRDQUEyQ3FFLElBQUksQ0FBQzhDLFNBQUwsQ0FBZWhELE1BQWYsQ0FBdUIsRUFBN0UsQ0FBTjtBQUNEO0FBQ0Y7O0FBRUQsTUFBSW5ILFVBQUosR0FBa0I7QUFDaEIsU0FBS29LLFdBQUwsR0FBbUIsS0FBS0EsV0FBTCxJQUFvQixLQUFLM0UsYUFBTCxFQUF2QztBQUNBLFdBQU8sS0FBSzJFLFdBQVo7QUFDRDs7QUFFRCxNQUFJcEssVUFBSixDQUFnQnFLLEVBQWhCLEVBQW9CO0FBQ2xCLFNBQUtELFdBQUwsR0FBbUJDLEVBQW5CO0FBQ0Q7O0FBaG9CZ0M7Ozs7QUFtb0JuQyxLQUFLLElBQUksQ0FBQ25JLEdBQUQsRUFBTW9JLEVBQU4sQ0FBVCxJQUFzQnpNLGdCQUFFME0sT0FBRixDQUFVQyxjQUFWLENBQXRCLEVBQTJDO0FBQ3pDM08sRUFBQUEsU0FBUyxDQUFDNE8sU0FBVixDQUFvQnZJLEdBQXBCLElBQTJCb0ksRUFBM0I7QUFDRDs7ZUFJY3pPLFMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlRHJpdmVyLCBEZXZpY2VTZXR0aW5ncywgZXJyb3JzIH0gZnJvbSAnYXBwaXVtLWJhc2UtZHJpdmVyJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IGxvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgQiBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgeyBmcyB9IGZyb20gJ2FwcGl1bS1zdXBwb3J0JztcbmltcG9ydCB7IGdldFNpbXVsYXRvciwgaW5zdGFsbFNTTENlcnQsIHVuaW5zdGFsbFNTTENlcnQgfSBmcm9tICdhcHBpdW0taW9zLXNpbXVsYXRvcic7XG5pbXBvcnQgeyBwcmVwYXJlQm9vdHN0cmFwLCBVSUF1dG9DbGllbnQgfSBmcm9tICcuL3VpYXV0by91aWF1dG8nO1xuaW1wb3J0IHsgSW5zdHJ1bWVudHMsIGluc3RydW1lbnRzVXRpbHMgfSBmcm9tICcuL2luc3RydW1lbnRzJztcbmltcG9ydCB7IHJldHJ5LCB3YWl0Rm9yQ29uZGl0aW9uIH0gZnJvbSAnYXN5bmNib3gnO1xuaW1wb3J0IGNvbW1hbmRzIGZyb20gJy4vY29tbWFuZHMvaW5kZXgnO1xuaW1wb3J0IHsgZGVzaXJlZENhcENvbnN0cmFpbnRzLCBkZXNpcmVkQ2FwVmFsaWRhdGlvbiB9IGZyb20gJy4vZGVzaXJlZC1jYXBzJztcbmltcG9ydCBfaURldmljZSBmcm9tICdub2RlLWlkZXZpY2UnO1xuaW1wb3J0IHsgU0FGQVJJX0JVTkRMRSB9IGZyb20gJy4vY29tbWFuZHMvc2FmYXJpJztcbmltcG9ydCB7IGluc3RhbGwsIG5lZWRzSW5zdGFsbCwgU0FGQVJJX0xBVU5DSEVSX0JVTkRMRSB9IGZyb20gJy4vc2FmYXJpLWxhdW5jaGVyJztcbmltcG9ydCB7IHNldExvY2FsZUFuZFByZWZlcmVuY2VzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5pbXBvcnQgeyBydW5TaW11bGF0b3JSZXNldCwgaXNvbGF0ZVNpbXVsYXRvckRldmljZSwgY2hlY2tTaW11bGF0b3JBdmFpbGFibGUsXG4gICAgICAgICBtb3ZlQnVpbHRJbkFwcCwgZ2V0QWRqdXN0ZWREZXZpY2VOYW1lLCBlbmRTaW11bGF0b3IsIHJ1blJlYWxEZXZpY2VSZXNldCB9IGZyb20gJy4vZGV2aWNlJztcbmltcG9ydCB7IElXRFAgfSBmcm9tICcuL2l3ZHAnO1xuXG5cbi8vIHByb21pc2lmeSBfaURldmljZVxubGV0IGlEZXZpY2UgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICBsZXQgZGV2aWNlID0gX2lEZXZpY2UoLi4uYXJncyk7XG4gIGxldCBwcm9taXNpZmllZCA9IHt9O1xuICBmb3IgKGxldCBtIG9mIFsnaW5zdGFsbCcsICdpbnN0YWxsQW5kV2FpdCcsICdyZW1vdmUnLCAnaXNJbnN0YWxsZWQnXSkge1xuICAgIHByb21pc2lmaWVkW21dID0gQi5wcm9taXNpZnkoZGV2aWNlW21dLmJpbmQoZGV2aWNlKSk7XG4gIH1cbiAgcmV0dXJuIHByb21pc2lmaWVkO1xufTtcblxuY29uc3QgZGVmYXVsdFNlcnZlckNhcHMgPSB7XG4gIHdlYlN0b3JhZ2VFbmFibGVkOiBmYWxzZSxcbiAgbG9jYXRpb25Db250ZXh0RW5hYmxlZDogZmFsc2UsXG4gIGJyb3dzZXJOYW1lOiAnJyxcbiAgcGxhdGZvcm06ICdNQUMnLFxuICBqYXZhc2NyaXB0RW5hYmxlZDogdHJ1ZSxcbiAgZGF0YWJhc2VFbmFibGVkOiBmYWxzZSxcbiAgdGFrZXNTY3JlZW5zaG90OiB0cnVlLFxuICBuZXR3b3JrQ29ubmVjdGlvbkVuYWJsZWQ6IGZhbHNlLFxufTtcblxuY29uc3QgTE9HX0xPQ0FUSU9OUyA9IFtcbiAgcGF0aC5yZXNvbHZlKCcvJywgJ0xpYnJhcnknLCAnQ2FjaGVzJywgJ2NvbS5hcHBsZS5kdC5pbnN0cnVtZW50cycpLFxuXTtcbmlmIChwcm9jZXNzLmVudi5IT01FKSB7XG4gIExPR19MT0NBVElPTlMucHVzaChwYXRoLnJlc29sdmUocHJvY2Vzcy5lbnYuSE9NRSwgJ0xpYnJhcnknLCAnTG9ncycsICdDb3JlU2ltdWxhdG9yJykpO1xufVxuXG5jbGFzcyBJb3NEcml2ZXIgZXh0ZW5kcyBCYXNlRHJpdmVyIHtcbiAgcmVzZXRJb3MgKCkge1xuICAgIHRoaXMuYXBwRXh0ID0gXCIuYXBwXCI7XG4gICAgdGhpcy54Y29kZVZlcnNpb24gPSBudWxsO1xuICAgIHRoaXMuaW9zU2RrVmVyc2lvbiA9IG51bGw7XG4gICAgdGhpcy5sb2dzID0ge307XG4gICAgdGhpcy5pbnN0cnVtZW50cyA9IG51bGw7XG4gICAgdGhpcy51aUF1dG9DbGllbnQgPSBudWxsO1xuICAgIHRoaXMub25JbnN0cnVtZW50c0RpZSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIHRoaXMuc3RvcHBpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmNiRm9yQ3VycmVudENtZCA9IG51bGw7XG4gICAgdGhpcy5yZW1vdGUgPSBudWxsO1xuICAgIHRoaXMuY3VyQ29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5jdXJXZWJGcmFtZXMgPSBbXTtcbiAgICB0aGlzLnNlbGVjdGluZ05ld1BhZ2UgPSBmYWxzZTtcbiAgICB0aGlzLndpbmRvd0hhbmRsZUNhY2hlID0gW107XG4gICAgdGhpcy53ZWJFbGVtZW50SWRzID0gW107XG4gICAgdGhpcy5pbXBsaWNpdFdhaXRNcyA9IDA7XG4gICAgdGhpcy5hc3luY2xpYldhaXRNcyA9IDA7XG4gICAgdGhpcy5wYWdlTG9hZE1zID0gNjAwMDtcbiAgICB0aGlzLmFzeW5jbGliUmVzcG9uc2VDYiA9IG51bGw7XG4gICAgdGhpcy5yZXR1cm5lZEZyb21FeGVjdXRlQXRvbSA9IHt9O1xuICAgIHRoaXMuZXhlY3V0ZWRBdG9tc0NvdW50ZXIgPSAwO1xuICAgIHRoaXMuY3VyQ29vcmRzID0gbnVsbDtcbiAgICB0aGlzLmN1cldlYkNvb3JkcyA9IG51bGw7XG4gICAgdGhpcy5sYW5kc2NhcGVXZWJDb29yZHNPZmZzZXQgPSAwO1xuICAgIHRoaXMua2VlcEFwcFRvUmV0YWluUHJlZnMgPSBmYWxzZTtcbiAgICB0aGlzLnJlYWR5ID0gZmFsc2U7XG4gICAgdGhpcy5hc3luY1dhaXRNcyA9IDA7XG5cbiAgICB0aGlzLnNldHRpbmdzID0gbmV3IERldmljZVNldHRpbmdzKHt9LCBfLm5vb3ApO1xuXG4gICAgdGhpcy5sb2NhdG9yU3RyYXRlZ2llcyA9IFtcbiAgICAgICd4cGF0aCcsXG4gICAgICAnaWQnLFxuICAgICAgJ2NsYXNzIG5hbWUnLFxuICAgICAgJy1pb3MgdWlhdXRvbWF0aW9uJyxcbiAgICAgICdhY2Nlc3NpYmlsaXR5IGlkJ1xuICAgIF07XG4gICAgdGhpcy53ZWJMb2NhdG9yU3RyYXRlZ2llcyA9IFtcbiAgICAgICdsaW5rIHRleHQnLFxuICAgICAgJ2NzcyBzZWxlY3RvcicsXG4gICAgICAndGFnIG5hbWUnLFxuICAgICAgJ3BhcnRpYWwgbGluayB0ZXh0J1xuICAgIF07XG4gIH1cblxuICBjb25zdHJ1Y3RvciAob3B0cywgc2hvdWxkVmFsaWRhdGVDYXBzKSB7XG4gICAgc3VwZXIob3B0cywgc2hvdWxkVmFsaWRhdGVDYXBzKTtcblxuICAgIHRoaXMuZGVzaXJlZENhcENvbnN0cmFpbnRzID0gZGVzaXJlZENhcENvbnN0cmFpbnRzO1xuICAgIHRoaXMucmVzZXRJb3MoKTtcbiAgICB0aGlzLmdldERldmljZVBpeGVsUmF0aW8gPSBfLm1lbW9pemUodGhpcy5nZXREZXZpY2VQaXhlbFJhdGlvKTtcbiAgfVxuXG4gIHZhbGlkYXRlTG9jYXRvclN0cmF0ZWd5IChzdHJhdGVneSkge1xuICAgIHN1cGVyLnZhbGlkYXRlTG9jYXRvclN0cmF0ZWd5KHN0cmF0ZWd5LCB0aGlzLmlzV2ViQ29udGV4dCgpKTtcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0ICgpIHtcbiAgICBpZiAodGhpcy5pc1JlYWxEZXZpY2UoKSkge1xuICAgICAgYXdhaXQgdGhpcy5zdGFydFJlYWxEZXZpY2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5zdGFydFNpbXVsYXRvcigpO1xuICAgIH1cbiAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVNlc3Npb24gKC4uLmFyZ3MpIHtcbiAgICBsZXQgW3Nlc3Npb25JZCwgY2Fwc10gPSBhd2FpdCBzdXBlci5jcmVhdGVTZXNzaW9uKC4uLmFyZ3MpO1xuXG4gICAgLy8gYXBwaXVtLWlvcy1kcml2ZXIgdXNlcyBJbnN0cnVtZW50cyB0byBhdXRvbWF0ZSB0aGUgZGV2aWNlXG4gICAgLy8gYnV0IFhjb2RlIDggZG9lcyBub3QgaGF2ZSBJbnN0cnVtZW50cywgc28gc2hvcnQgY2lyY3VpdFxuICAgIHRoaXMueGNvZGVWZXJzaW9uID0gYXdhaXQgdXRpbHMuZ2V0QW5kQ2hlY2tYY29kZVZlcnNpb24odGhpcy5vcHRzKTtcbiAgICBsb2dnZXIuZGVidWcoYFhjb2RlIHZlcnNpb24gc2V0IHRvICR7dGhpcy54Y29kZVZlcnNpb24udmVyc2lvblN0cmluZ31gKTtcbiAgICBpZiAodGhpcy54Y29kZVZlcnNpb24ubWFqb3IgPj0gOCkge1xuICAgICAgbGV0IG1zZyA9IGBBcHBpdW0ncyBJb3NEcml2ZXIgZG9lcyBub3Qgc3VwcG9ydCBYY29kZSB2ZXJzaW9uICR7dGhpcy54Y29kZVZlcnNpb24udmVyc2lvblN0cmluZ30uIGAgK1xuICAgICAgICAgICAgICAgICdBcHBsZSBoYXMgZGVwcmVjYXRlZCBVSUF1dG9tYXRpb24uIFVzZSB0aGUgXCJYQ1VJVGVzdFwiIGF1dG9tYXRpb25OYW1lIGNhcGFiaWxpdHkgaW5zdGVhZC4nO1xuICAgICAgbG9nZ2VyLmVycm9yQW5kVGhyb3cobmV3IGVycm9ycy5TZXNzaW9uTm90Q3JlYXRlZEVycm9yKG1zZykpO1xuICAgIH1cblxuICAgIC8vIG1lcmdlIHNlcnZlciBjYXBhYmlsaXRpZXMgKyBkZXNpcmVkIGNhcGFiaWxpdGllc1xuICAgIHRoaXMuY2FwcyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRTZXJ2ZXJDYXBzLCB0aGlzLmNhcHMpO1xuICAgIHRoaXMuY2Fwcy5kZXNpcmVkID0gY2FwcztcblxuICAgIGF3YWl0IHV0aWxzLmRldGVjdFVkaWQodGhpcy5vcHRzKTtcbiAgICBhd2FpdCB1dGlscy5wcmVwYXJlSW9zT3B0cyh0aGlzLm9wdHMpO1xuICAgIHRoaXMucmVhbERldmljZSA9IG51bGw7XG4gICAgdGhpcy51c2VSb2JvdCA9IHRoaXMub3B0cy51c2VSb2JvdDtcbiAgICB0aGlzLnNhZmFyaSA9IHRoaXMub3B0cy5zYWZhcmk7XG4gICAgdGhpcy5vcHRzLmN1ck9yaWVudGF0aW9uID0gdGhpcy5vcHRzLmluaXRpYWxPcmllbnRhdGlvbjtcblxuICAgIHRoaXMuc29jayA9IHBhdGgucmVzb2x2ZSh0aGlzLm9wdHMudG1wRGlyIHx8ICcvdG1wJywgJ2luc3RydW1lbnRzX3NvY2snKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLmNvbmZpZ3VyZUFwcCgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBCYWQgYXBwOiAnJHt0aGlzLm9wdHMuYXBwfScuIEFwcCBwYXRocyBuZWVkIHRvIGAgK1xuICAgICAgICAgICAgICAgICAgIGBiZSBhYnNvbHV0ZSwgb3IgcmVsYXRpdmUgdG8gdGhlIGFwcGl1bSBzZXJ2ZXIgYCArXG4gICAgICAgICAgICAgICAgICAgYGluc3RhbGwgZGlyLCBvciBhIFVSTCB0byBjb21wcmVzc2VkIGZpbGUsIG9yIGEgYCArXG4gICAgICAgICAgICAgICAgICAgYHNwZWNpYWwgYXBwIG5hbWUuYCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5zdGFydCgpO1xuXG4gICAgLy8gVE9ETzogdGhpcyBzaG91bGQgYmUgaW4gQmFzZURyaXZlci5wb3N0Q3JlYXRlU2Vzc2lvblxuICAgIHRoaXMuc3RhcnROZXdDb21tYW5kVGltZW91dCgnY3JlYXRlU2Vzc2lvbicpO1xuICAgIHJldHVybiBbc2Vzc2lvbklkLCB0aGlzLmNhcHNdO1xuICB9XG5cbiAgYXN5bmMgc3RvcCAoKSB7XG4gICAgdGhpcy5yZWFkeSA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMudWlBdXRvQ2xpZW50KSB7XG4gICAgICBhd2FpdCB0aGlzLnVpQXV0b0NsaWVudC5zaHV0ZG93bigpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmluc3RydW1lbnRzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmluc3RydW1lbnRzLnNodXRkb3duKCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBJbnN0cnVtZW50cyBkaWRuJ3Qgc2h1dCBkb3duLiAke2Vycn1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5jYXBzICYmIHRoaXMuY2Fwcy5jdXN0b21TU0xDZXJ0ICYmICF0aGlzLmlzUmVhbERldmljZSgpKSB7XG4gICAgICBsb2dnZXIuZGVidWcoYFVuaW5zdGFsbGluZyBzc2wgY2VydGlmaWNhdGUgZm9yIHVkaWQgJyR7dGhpcy5zaW0udWRpZH0nYCk7XG4gICAgICBhd2FpdCB1bmluc3RhbGxTU0xDZXJ0KHRoaXMuY2Fwcy5jdXN0b21TU0xDZXJ0LCB0aGlzLnNpbS51ZGlkKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRzLmVuYWJsZUFzeW5jRXhlY3V0ZUZyb21IdHRwcyAmJiAhdGhpcy5pc1JlYWxEZXZpY2UoKSkge1xuICAgICAgYXdhaXQgdGhpcy5zdG9wSHR0cHNBc3luY1NlcnZlcigpO1xuICAgIH1cblxuICAgIHRoaXMudWlBdXRvQ2xpZW50ID0gbnVsbDtcbiAgICB0aGlzLmluc3RydW1lbnRzID0gbnVsbDtcbiAgICB0aGlzLnJlYWxEZXZpY2UgPSBudWxsO1xuXG4gICAgLy8gcG9zdGNsZWFudXBcbiAgICB0aGlzLmN1ckNvb3JkcyA9IG51bGw7XG4gICAgdGhpcy5vcHRzLmN1ck9yaWVudGF0aW9uID0gbnVsbDtcbiAgICBpZiAoIV8uaXNFbXB0eSh0aGlzLmxvZ3MpKSB7XG4gICAgICBhd2FpdCB0aGlzLmxvZ3Muc3lzbG9nLnN0b3BDYXB0dXJlKCk7XG4gICAgICB0aGlzLmxvZ3MgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yZW1vdGUpIHtcbiAgICAgIGF3YWl0IHRoaXMuc3RvcFJlbW90ZSgpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuc3RvcElXRFAoKTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNlc3Npb24gKCkge1xuICAgIGxvZ2dlci5kZWJ1ZyhcIkRlbGV0aW5nIGlvcyBzZXNzaW9uXCIpO1xuXG4gICAgYXdhaXQgdGhpcy5zdG9wKCk7XG5cbiAgICBpZiAodGhpcy5vcHRzLmNsZWFyU3lzdGVtRmlsZXMpIHtcbiAgICAgIGF3YWl0IHV0aWxzLmNsZWFyTG9ncyhMT0dfTE9DQVRJT05TKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdOb3QgY2xlYXJpbmcgbG9nIGZpbGVzLiBVc2UgYGNsZWFyU3lzdGVtRmlsZXNgIGNhcGFiaWxpdHkgdG8gdHVybiBvbi4nKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc1JlYWxEZXZpY2UoKSkge1xuICAgICAgYXdhaXQgcnVuUmVhbERldmljZVJlc2V0KHRoaXMucmVhbERldmljZSwgdGhpcy5vcHRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgcnVuU2ltdWxhdG9yUmVzZXQodGhpcy5zaW0sIHRoaXMub3B0cywgdGhpcy5rZWVwQXBwVG9SZXRhaW5QcmVmcyk7XG4gICAgfVxuICAgIGF3YWl0IHN1cGVyLmRlbGV0ZVNlc3Npb24oKTtcbiAgfVxuXG4gIGFzeW5jIGdldFNlc3Npb24gKCkge1xuICAgIGxldCBjYXBzID0gYXdhaXQgc3VwZXIuZ2V0U2Vzc2lvbigpO1xuXG4gICAgY29uc3Qgdmlld3BvcnRSZWN0ID0gYXdhaXQgdGhpcy5nZXRWaWV3cG9ydFJlY3QoKTtcbiAgICBjb25zdCBwaXhlbFJhdGlvID0gYXdhaXQgdGhpcy5nZXREZXZpY2VQaXhlbFJhdGlvKCk7XG4gICAgY29uc3Qgc3RhdEJhckhlaWdodCA9IGF3YWl0IHRoaXMuZ2V0U3RhdHVzQmFySGVpZ2h0KCk7XG5cbiAgICBjYXBzLnZpZXdwb3J0UmVjdCA9IHZpZXdwb3J0UmVjdDtcbiAgICBjYXBzLnBpeGVsUmF0aW8gPSBwaXhlbFJhdGlvO1xuICAgIGNhcHMuc3RhdEJhckhlaWdodCA9IHN0YXRCYXJIZWlnaHQ7XG5cbiAgICByZXR1cm4gY2FwcztcbiAgfVxuXG4gIGFzeW5jIGV4ZWN1dGVDb21tYW5kIChjbWQsIC4uLmFyZ3MpIHtcbiAgICBsb2dnZXIuZGVidWcoYEV4ZWN1dGluZyBpT1MgY29tbWFuZCAnJHtjbWR9J2ApO1xuICAgIGlmIChjbWQgPT09ICdyZWNlaXZlQXN5bmNSZXNwb25zZScpIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlY2VpdmVBc3luY1Jlc3BvbnNlKC4uLmFyZ3MpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5yZWFkeSB8fCBfLmluY2x1ZGVzKFsnbGF1bmNoQXBwJ10sIGNtZCkpIHtcbiAgICAgIHJldHVybiBhd2FpdCBzdXBlci5leGVjdXRlQ29tbWFuZChjbWQsIC4uLmFyZ3MpO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBlcnJvcnMuTm9TdWNoRHJpdmVyRXJyb3IoYERyaXZlciBpcyBub3QgcmVhZHksIGNhbm5vdCBleGVjdXRlICR7Y21kfS5gKTtcbiAgfVxuXG4gIC8vIFRPRE86IHJlZm9ybWF0IHRoaXMuaGVscGVycyArIGNvbmZpZ3VyZUFwcFxuICBhc3luYyBjb25maWd1cmVBcHAgKCkge1xuICAgIHRyeSB7XG4gICAgICAvLyBpZiB0aGUgYXBwIG5hbWUgaXMgYSBidW5kbGVJZCBhc3NpZ24gaXQgdG8gdGhlIGJ1bmRsZUlkIHByb3BlcnR5XG4gICAgICBpZiAoIXRoaXMub3B0cy5idW5kbGVJZCAmJiB1dGlscy5hcHBJc1BhY2thZ2VPckJ1bmRsZSh0aGlzLm9wdHMuYXBwKSkge1xuICAgICAgICB0aGlzLm9wdHMuYnVuZGxlSWQgPSB0aGlzLm9wdHMuYXBwO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRzLmFwcCAmJiB0aGlzLm9wdHMuYXBwLnRvTG93ZXJDYXNlKCkgPT09IFwic2V0dGluZ3NcIikge1xuICAgICAgICBpZiAocGFyc2VGbG9hdCh0aGlzLm9wdHMucGxhdGZvcm1WZXJzaW9uKSA+PSA4KSB7XG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKFwiV2UgYXJlIG9uIGlPUzgrIHNvIG5vdCBjb3B5aW5nIHByZWZlcmVuY2VzIGFwcFwiKTtcbiAgICAgICAgICB0aGlzLm9wdHMuYnVuZGxlSWQgPSBcImNvbS5hcHBsZS5QcmVmZXJlbmNlc1wiO1xuICAgICAgICAgIHRoaXMub3B0cy5hcHAgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0cy5hcHAgJiYgdGhpcy5vcHRzLmFwcC50b0xvd2VyQ2FzZSgpID09PSBcImNhbGVuZGFyXCIpIHtcbiAgICAgICAgaWYgKHBhcnNlRmxvYXQodGhpcy5vcHRzLnBsYXRmb3JtVmVyc2lvbikgPj0gOCkge1xuICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhcIldlIGFyZSBvbiBpT1M4KyBzbyBub3QgY29weWluZyBjYWxlbmRhciBhcHBcIik7XG4gICAgICAgICAgdGhpcy5vcHRzLmJ1bmRsZUlkID0gXCJjb20uYXBwbGUubW9iaWxlY2FsXCI7XG4gICAgICAgICAgdGhpcy5vcHRzLmFwcCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy5pc1NhZmFyaSgpKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1JlYWxEZXZpY2UoKSkge1xuICAgICAgICAgIGlmIChwYXJzZUZsb2F0KHRoaXMub3B0cy5wbGF0Zm9ybVZlcnNpb24pID49IDgpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhcIldlIGFyZSBvbiBpT1M4KyBzbyBub3QgY29weWluZyBTYWZhcmkgYXBwXCIpO1xuICAgICAgICAgICAgdGhpcy5vcHRzLmJ1bmRsZUlkID0gU0FGQVJJX0JVTkRMRTtcbiAgICAgICAgICAgIHRoaXMub3B0cy5hcHAgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBvbiByZWFsIGRldmljZSwgbmVlZCB0byBjaGVjayBpZiBzYWZhcmkgbGF1bmNoZXIgZXhpc3RzXG4gICAgICAgICAgLy8gZmlyc3QgY2hlY2sgaWYgaXQgaXMgYWxyZWFkeSBvbiB0aGUgZGV2aWNlXG4gICAgICAgICAgaWYgKCFhd2FpdCB0aGlzLnJlYWxEZXZpY2UuaXNJbnN0YWxsZWQodGhpcy5vcHRzLmJ1bmRsZUlkKSkge1xuICAgICAgICAgICAgLy8gaXQncyBub3Qgb24gdGhlIGRldmljZSwgc28gY2hlY2sgaWYgd2UgbmVlZCB0byBidWlsZFxuICAgICAgICAgICAgaWYgKGF3YWl0IG5lZWRzSW5zdGFsbCgpKSB7XG4gICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnU2FmYXJpTGF1bmNoZXIgbm90IGZvdW5kLCBidWlsZGluZy4uLicpO1xuICAgICAgICAgICAgICBhd2FpdCBpbnN0YWxsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm9wdHMuYnVuZGxlSWQgPSBTQUZBUklfTEFVTkNIRVJfQlVORExFO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdHMuYnVuZGxlSWQgJiZcbiAgICAgICAgICAgICAgICAgdXRpbHMuYXBwSXNQYWNrYWdlT3JCdW5kbGUodGhpcy5vcHRzLmJ1bmRsZUlkKSAmJlxuICAgICAgICAgICAgICAgICAodGhpcy5vcHRzLmFwcCA9PT0gXCJcIiB8fCB1dGlscy5hcHBJc1BhY2thZ2VPckJ1bmRsZSh0aGlzLm9wdHMuYXBwKSkpIHtcbiAgICAgICAgLy8gd2UgaGF2ZSBhIGJ1bmRsZSBJRCwgYnV0IG5vIGFwcCwgb3IgYXBwIGlzIGFsc28gYSBidW5kbGVcbiAgICAgICAgbG9nZ2VyLmRlYnVnKFwiQXBwIGlzIGFuIGlPUyBidW5kbGUsIHdpbGwgYXR0ZW1wdCB0byBydW4gYXMgcHJlLWV4aXN0aW5nXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5vcHRzLmFwcCA9IGF3YWl0IHRoaXMuaGVscGVycy5jb25maWd1cmVBcHAodGhpcy5vcHRzLmFwcCwgJy5hcHAnKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihlcnIpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQmFkIGFwcDogJHt0aGlzLm9wdHMuYXBwfS4gQXBwIHBhdGhzIG5lZWQgdG8gYmUgYWJzb2x1dGUsIG9yIHJlbGF0aXZlIHRvIHRoZSBhcHBpdW0gYCArXG4gICAgICAgIFwic2VydmVyIGluc3RhbGwgZGlyLCBvciBhIFVSTCB0byBjb21wcmVzc2VkIGZpbGUsIG9yIGEgc3BlY2lhbCBhcHAgbmFtZS5cIik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc3RhcnRTaW11bGF0b3IgKCkge1xuICAgIGF3YWl0IHV0aWxzLnJlbW92ZUluc3RydW1lbnRzU29ja2V0KHRoaXMuc29jayk7XG5cbiAgICBpZiAoIXRoaXMueGNvZGVWZXJzaW9uKSB7XG4gICAgICBsb2dnZXIuZGVidWcoXCJTZXR0aW5nIFhjb2RlIHZlcnNpb25cIik7XG4gICAgICB0aGlzLnhjb2RlVmVyc2lvbiA9IGF3YWl0IHV0aWxzLmdldEFuZENoZWNrWGNvZGVWZXJzaW9uKHRoaXMub3B0cyk7XG4gICAgICBsb2dnZXIuZGVidWcoYFhjb2RlIHZlcnNpb24gc2V0IHRvICR7dGhpcy54Y29kZVZlcnNpb24udmVyc2lvblN0cmluZ31gKTtcbiAgICB9XG5cbiAgICBsb2dnZXIuZGVidWcoXCJTZXR0aW5nIGlPUyBTREsgVmVyc2lvblwiKTtcbiAgICB0aGlzLmlvc1Nka1ZlcnNpb24gPSBhd2FpdCB1dGlscy5nZXRBbmRDaGVja0lvc1Nka1ZlcnNpb24oKTtcbiAgICBsb2dnZXIuZGVidWcoYGlPUyBTREsgVmVyc2lvbiBzZXQgdG8gJHt0aGlzLmlvc1Nka1ZlcnNpb259YCk7XG5cbiAgICBsZXQgdGltZW91dCA9IF8uaXNPYmplY3QodGhpcy5vcHRzLmxhdW5jaFRpbWVvdXQpID8gdGhpcy5vcHRzLmxhdW5jaFRpbWVvdXQuZ2xvYmFsIDogdGhpcy5vcHRzLmxhdW5jaFRpbWVvdXQ7XG4gICAgbGV0IGF2YWlsYWJsZURldmljZXMgPSBhd2FpdCByZXRyeSgzLCBpbnN0cnVtZW50c1V0aWxzLmdldEF2YWlsYWJsZURldmljZXMsIHRpbWVvdXQpO1xuXG4gICAgbGV0IGlvc1NpbVVkaWQgPSBhd2FpdCBjaGVja1NpbXVsYXRvckF2YWlsYWJsZSh0aGlzLm9wdHMsIHRoaXMuaW9zU2RrVmVyc2lvbiwgYXZhaWxhYmxlRGV2aWNlcyk7XG5cbiAgICB0aGlzLnNpbSA9IGF3YWl0IGdldFNpbXVsYXRvcihpb3NTaW1VZGlkLCB0aGlzLnhjb2RlVmVyc2lvbi52ZXJzaW9uU3RyaW5nKTtcblxuICAgIGF3YWl0IG1vdmVCdWlsdEluQXBwKHRoaXMuc2ltKTtcblxuICAgIHRoaXMub3B0cy5sb2NhbGl6YWJsZVN0cmluZ3MgPSBhd2FpdCB1dGlscy5wYXJzZUxvY2FsaXphYmxlU3RyaW5ncyh0aGlzLm9wdHMpO1xuXG4gICAgYXdhaXQgdXRpbHMuc2V0QnVuZGxlSWRGcm9tQXBwKHRoaXMub3B0cyk7XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUluc3RydW1lbnRzKCk7XG5cbiAgICB7XG4gICAgICAvLyBwcmV2aW91c2x5IHNldERldmljZUluZm8oKVxuICAgICAgdGhpcy5zaG91bGRQcmVsYXVuY2hTaW11bGF0b3IgPSB1dGlscy5zaG91bGRQcmVsYXVuY2hTaW11bGF0b3IodGhpcy5vcHRzLCB0aGlzLmlvc1Nka1ZlcnNpb24pO1xuICAgICAgbGV0IGRTdHJpbmcgPSBhd2FpdCBnZXRBZGp1c3RlZERldmljZU5hbWUodGhpcy5vcHRzKTtcbiAgICAgIGlmICh0aGlzLmNhcHMuYXBwKSB7XG4gICAgICAgIGF3YWl0IHV0aWxzLnNldERldmljZVR5cGVJbkluZm9QbGlzdCh0aGlzLm9wdHMuYXBwLCBkU3RyaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBydW5TaW11bGF0b3JSZXNldCh0aGlzLnNpbSwgdGhpcy5vcHRzLCB0aGlzLmtlZXBBcHBUb1JldGFpblByZWZzKTtcblxuICAgIGlmICh0aGlzLmNhcHMuY3VzdG9tU1NMQ2VydCAmJiAhdGhpcy5pc1JlYWxEZXZpY2UoKSkge1xuICAgICAgYXdhaXQgaW5zdGFsbFNTTENlcnQodGhpcy5jYXBzLmN1c3RvbVNTTENlcnQsIHRoaXMuc2ltLnVkaWQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdHMuZW5hYmxlQXN5bmNFeGVjdXRlRnJvbUh0dHBzICYmICF0aGlzLmlzUmVhbERldmljZSgpKSB7XG4gICAgICAvLyBhd2FpdCB0aGlzLnNpbS5zaHV0ZG93bigpO1xuICAgICAgYXdhaXQgdGhpcy5zdGFydEh0dHBzQXN5bmNTZXJ2ZXIoKTtcbiAgICB9XG5cbiAgICBhd2FpdCBpc29sYXRlU2ltdWxhdG9yRGV2aWNlKHRoaXMuc2ltLCB0aGlzLm9wdHMpO1xuICAgIHRoaXMubG9jYWxDb25maWcgPSBhd2FpdCBzZXRMb2NhbGVBbmRQcmVmZXJlbmNlcyh0aGlzLnNpbSwgdGhpcy5vcHRzLCB0aGlzLmlzU2FmYXJpKCksIGVuZFNpbXVsYXRvcik7XG4gICAgYXdhaXQgdGhpcy5zdGFydExvZ0NhcHR1cmUodGhpcy5zaW0pO1xuICAgIGF3YWl0IHRoaXMucHJlbGF1bmNoU2ltdWxhdG9yKCk7XG4gICAgYXdhaXQgdGhpcy5zdGFydEluc3RydW1lbnRzKCk7XG4gICAgYXdhaXQgdGhpcy5vbkluc3RydW1lbnRzTGF1bmNoKCk7XG4gICAgYXdhaXQgdGhpcy5jb25maWd1cmVCb290c3RyYXAoKTtcbiAgICBhd2FpdCB0aGlzLnNldEJ1bmRsZUlkKCk7XG4gICAgYXdhaXQgdGhpcy5zZXRJbml0aWFsT3JpZW50YXRpb24oKTtcbiAgICBhd2FpdCB0aGlzLmluaXRBdXRvV2VidmlldygpO1xuICAgIGF3YWl0IHRoaXMud2FpdEZvckFwcExhdW5jaGVkKCk7XG4gIH1cblxuICBhc3luYyBzdGFydFJlYWxEZXZpY2UgKCkge1xuICAgIGF3YWl0IHV0aWxzLnJlbW92ZUluc3RydW1lbnRzU29ja2V0KHRoaXMuc29jayk7XG4gICAgdGhpcy5vcHRzLmxvY2FsaXphYmxlU3RyaW5ncyA9IGF3YWl0IHV0aWxzLnBhcnNlTG9jYWxpemFibGVTdHJpbmdzKHRoaXMub3B0cyk7XG4gICAgYXdhaXQgdXRpbHMuc2V0QnVuZGxlSWRGcm9tQXBwKHRoaXMub3B0cyk7XG4gICAgYXdhaXQgdGhpcy5jcmVhdGVJbnN0cnVtZW50cygpO1xuICAgIGF3YWl0IHJ1blJlYWxEZXZpY2VSZXNldCh0aGlzLnJlYWxEZXZpY2UsIHRoaXMub3B0cyk7XG4gICAgYXdhaXQgdGhpcy5zdGFydExvZ0NhcHR1cmUoKTtcbiAgICBhd2FpdCB0aGlzLmluc3RhbGxUb1JlYWxEZXZpY2UoKTtcbiAgICBhd2FpdCB0aGlzLnN0YXJ0SW5zdHJ1bWVudHMoKTtcbiAgICBhd2FpdCB0aGlzLm9uSW5zdHJ1bWVudHNMYXVuY2goKTtcbiAgICBhd2FpdCB0aGlzLmNvbmZpZ3VyZUJvb3RzdHJhcCgpO1xuICAgIGF3YWl0IHRoaXMuc2V0QnVuZGxlSWQoKTtcbiAgICBhd2FpdCB0aGlzLnNldEluaXRpYWxPcmllbnRhdGlvbigpO1xuICAgIGF3YWl0IHRoaXMuaW5pdEF1dG9XZWJ2aWV3KCk7XG4gICAgYXdhaXQgdGhpcy53YWl0Rm9yQXBwTGF1bmNoZWQoKTtcbiAgfVxuXG4gIGFzeW5jIGluc3RhbGxUb1JlYWxEZXZpY2UgKCkge1xuICAgIC8vIGlmIHVzZXIgaGFzIHBhc3NlZCBpbiBkZXNpcmVkQ2Fwcy5hdXRvTGF1bmNoID0gZmFsc2VcbiAgICAvLyBtZWFuaW5nIHRoZXkgd2lsbCBtYW5hZ2UgYXBwIGluc3RhbGwgLyBsYXVuY2hpbmdcbiAgICBpZiAodGhpcy5vcHRzLmF1dG9MYXVuY2ggPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgaGF2ZSBhbiBpcGEgZmlsZSwgc2V0IGl0IGluIG9wdHNcbiAgICBpZiAodGhpcy5vcHRzLmFwcCkge1xuICAgICAgbGV0IGV4dCA9IHRoaXMub3B0cy5hcHAuc3Vic3RyaW5nKHRoaXMub3B0cy5hcHAubGVuZ3RoIC0gMykudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmIChleHQgPT09ICdpcGEnKSB7XG4gICAgICAgIHRoaXMub3B0cy5pcGEgPSB0aGlzLm9wdHMuYXBwO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdHMudWRpZCkge1xuICAgICAgaWYgKGF3YWl0IHRoaXMucmVhbERldmljZS5pc0luc3RhbGxlZCh0aGlzLm9wdHMuYnVuZGxlSWQpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhcIkFwcCBpcyBpbnN0YWxsZWQuXCIpO1xuICAgICAgICBpZiAodGhpcy5vcHRzLmZ1bGxSZXNldCkge1xuICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhcImZ1bGxSZXNldCByZXF1ZXN0ZWQuIEZvcmNpbmcgYXBwIGluc3RhbGwuXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhcImZ1bGxSZXNldCBub3QgcmVxdWVzdGVkLiBObyBuZWVkIHRvIGluc3RhbGwuXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKFwiQXBwIGlzIG5vdCBpbnN0YWxsZWQuIFdpbGwgdHJ5IHRvIGluc3RhbGwuXCIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRzLmlwYSAmJiB0aGlzLm9wdHMuYnVuZGxlSWQpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnN0YWxsSXBhKCk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQXBwIGluc3RhbGxlZC4nKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRzLmlwYSkge1xuICAgICAgICBsZXQgbXNnID0gXCJZb3Ugc3BlY2lmaWVkIGEgVURJRCBhbmQgaXBhIGJ1dCBkaWQgbm90IGluY2x1ZGUgdGhlIGJ1bmRsZSBpZFwiO1xuICAgICAgICBsb2dnZXIud2Fybihtc2cpO1xuICAgICAgICB0aHJvdyBuZXcgZXJyb3JzLlVua25vd25FcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdHMuYXBwKSB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVhbERldmljZS5pbnN0YWxsKHRoaXMub3B0cy5hcHApO1xuICAgICAgICBsb2dnZXIuZGVidWcoJ0FwcCBpbnN0YWxsZWQuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIuZGVidWcoXCJSZWFsIGRldmljZSBzcGVjaWZpZWQgYnV0IG5vIGlwYSBvciBhcHAgcGF0aCwgYXNzdW1pbmcgYnVuZGxlIElEIGlzIFwiICtcbiAgICAgICAgICAgICAgICAgICAgIFwib24gZGV2aWNlXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZGVidWcoXCJObyBkZXZpY2UgaWQgb3IgYXBwLCBub3QgaW5zdGFsbGluZyB0byByZWFsIGRldmljZS5cIik7XG4gICAgfVxuICB9XG5cbiAgZ2V0SURldmljZU9iaiAoKSB7XG4gICAgbGV0IGlkaVBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uLy4uLy4uL2J1aWxkL1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibGliaW1vYmlsZWRldmljZS1tYWNvc3gvaWRldmljZWluc3RhbGxlclwiKTtcbiAgICBsb2dnZXIuZGVidWcoYENyZWF0aW5nIGlEZXZpY2Ugb2JqZWN0IHdpdGggdWRpZCAke3RoaXMub3B0cy51ZGlkfWApO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gaURldmljZSh0aGlzLm9wdHMudWRpZCk7XG4gICAgfSBjYXRjaCAoZTEpIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgQ291bGRuJ3QgZmluZCBpZGV2aWNlaW5zdGFsbGVyLCB0cnlpbmcgYnVpbHQtaW4gYXQgJHtpZGlQYXRofWApO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGlEZXZpY2UodGhpcy5vcHRzLnVkaWQsIHtjbWQ6IGlkaVBhdGh9KTtcbiAgICAgIH0gY2F0Y2ggKGUyKSB7XG4gICAgICAgIGxldCBtc2cgPSBcIkNvdWxkIG5vdCBpbml0aWFsaXplIGlkZXZpY2VpbnN0YWxsZXI7IG1ha2Ugc3VyZSBpdCBpcyBcIiArXG4gICAgICAgICAgICAgICAgICBcImluc3RhbGxlZCBhbmQgd29ya3Mgb24geW91ciBzeXN0ZW1cIjtcbiAgICAgICAgbG9nZ2VyLmVycm9yKG1zZyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGluc3RhbGxJcGEgKCkge1xuICAgIGxvZ2dlci5kZWJ1ZyhgSW5zdGFsbGluZyBpcGEgZm91bmQgYXQgJHt0aGlzLm9wdHMuaXBhfWApO1xuICAgIGlmIChhd2FpdCB0aGlzLnJlYWxEZXZpY2UuaXNJbnN0YWxsZWQodGhpcy5vcHRzLmJ1bmRsZUlkKSkge1xuICAgICAgbG9nZ2VyLmRlYnVnKFwiQnVuZGxlIGZvdW5kIG9uIGRldmljZSwgcmVtb3ZpbmcgYmVmb3JlIHJlaW5zdGFsbGluZy5cIik7XG4gICAgICBhd2FpdCB0aGlzLnJlYWxEZXZpY2UucmVtb3ZlKHRoaXMub3B0cy5idW5kbGVJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhcIk5vdGhpbmcgZm91bmQgb24gZGV2aWNlLCBnb2luZyBhaGVhZCBhbmQgaW5zdGFsbGluZy5cIik7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucmVhbERldmljZS5pbnN0YWxsQW5kV2FpdCh0aGlzLm9wdHMuaXBhLCB0aGlzLm9wdHMuYnVuZGxlSWQpO1xuICB9XG5cbiAgdmFsaWRhdGVEZXNpcmVkQ2FwcyAoY2Fwcykge1xuICAgIC8vIGNoZWNrIHdpdGggdGhlIGJhc2UgY2xhc3MsIGFuZCByZXR1cm4gaWYgaXQgZmFpbHNcbiAgICBsZXQgcmVzID0gc3VwZXIudmFsaWRhdGVEZXNpcmVkQ2FwcyhjYXBzKTtcbiAgICBpZiAoIXJlcykgcmV0dXJuIHJlczsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuXG4gICAgcmV0dXJuIGRlc2lyZWRDYXBWYWxpZGF0aW9uKGNhcHMpO1xuICB9XG5cbiAgYXN5bmMgcHJlbGF1bmNoU2ltdWxhdG9yICgpIHtcbiAgICBpZiAoIXRoaXMuc2hvdWxkUHJlbGF1bmNoU2ltdWxhdG9yKSB7XG4gICAgICBsb2dnZXIuZGVidWcoXCJOb3QgcHJlLWxhdW5jaGluZyBzaW11bGF0b3JcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IGVuZFNpbXVsYXRvcih0aGlzLnNpbSk7XG4gICAgLy8gVE9ETzogaW1wbGVtZW50IHByZWxhdW5jaCBzaW0gaW4gc2ltdWxhdG9yIHBhY2thZ2VcbiAgfVxuXG4gIGFzeW5jIG9uSW5zdHJ1bWVudHNMYXVuY2ggKCkge1xuICAgIGxvZ2dlci5kZWJ1ZygnSW5zdHJ1bWVudHMgbGF1bmNoZWQuIFN0YXJ0aW5nIHBvbGwgbG9vcCBmb3IgbmV3IGNvbW1hbmRzLicpO1xuICAgIGlmICh0aGlzLm9wdHMub3JpZ0FwcFBhdGgpIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhcIkNvcHlpbmcgYXBwIGJhY2sgdG8gaXRzIG9yaWdpbmFsIHBsYWNlXCIpO1xuICAgICAgcmV0dXJuIGF3YWl0IGZzLmNvcHlGaWxlKHRoaXMub3B0cy5hcHAsIHRoaXMub3B0cy5vcmlnQXBwUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2V0QnVuZGxlSWQgKCkge1xuICAgIGlmICh0aGlzLm9wdHMuYnVuZGxlSWQpIHtcbiAgICAgIC8vIFdlIGFscmVhZHkgaGF2ZSBhIGJ1bmRsZSBJZFxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgYklkID0gYXdhaXQgdGhpcy51aUF1dG9DbGllbnQuc2VuZENvbW1hbmQoJ2F1LmJ1bmRsZUlkKCknKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgQnVuZGxlIElEIGZvciBvcGVuIGFwcCBpcyAke2JJZC52YWx1ZX1gKTtcbiAgICAgIHRoaXMub3B0cy5idW5kbGVJZCA9IGJJZC52YWx1ZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBzdGFydElXRFAgKCkge1xuICAgIGlmICh0aGlzLm9wdHMuc3RhcnRJV0RQKSB7XG4gICAgICB0aGlzLml3ZHBTZXJ2ZXIgPSBuZXcgSVdEUCh0aGlzLm9wdHMud2Via2l0RGVidWdQcm94eVBvcnQsIHRoaXMub3B0cy51ZGlkKTtcbiAgICAgIGF3YWl0IHRoaXMuaXdkcFNlcnZlci5zdGFydCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHN0b3BJV0RQICgpIHtcbiAgICBpZiAodGhpcy5pd2RwU2VydmVyKSB7XG4gICAgICBhd2FpdCB0aGlzLml3ZHBTZXJ2ZXIuc3RvcCgpO1xuICAgICAgZGVsZXRlIHRoaXMuaXdkcFNlcnZlcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBzZXRJbml0aWFsT3JpZW50YXRpb24gKCkge1xuICAgIGlmIChfLmlzU3RyaW5nKHRoaXMub3B0cy5pbml0aWFsT3JpZW50YXRpb24pICYmXG4gICAgICAgIF8uaW5jbHVkZXMoW1wiTEFORFNDQVBFXCIsIFwiUE9SVFJBSVRcIl0sIHRoaXMub3B0cy5pbml0aWFsT3JpZW50YXRpb24udG9VcHBlckNhc2UoKSkpIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgU2V0dGluZyBpbml0aWFsIG9yaWVudGF0aW9uIHRvICR7dGhpcy5vcHRzLmluaXRpYWxPcmllbnRhdGlvbn1gKTtcbiAgICAgIGxldCBjb21tYW5kID0gYGF1LnNldFNjcmVlbk9yaWVudGF0aW9uKCcke3RoaXMub3B0cy5pbml0aWFsT3JpZW50YXRpb24udG9VcHBlckNhc2UoKX0nKWA7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLnVpQXV0b0NsaWVudC5zZW5kQ29tbWFuZChjb21tYW5kKTtcbiAgICAgICAgdGhpcy5vcHRzLmN1ck9yaWVudGF0aW9uID0gdGhpcy5vcHRzLmluaXRpYWxPcmllbnRhdGlvbjtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBsb2dnZXIud2FybihgU2V0dGluZyBpbml0aWFsIG9yaWVudGF0aW9uIGZhaWxlZCB3aXRoOiAke2Vycn1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpc1JlYWxEZXZpY2UgKCkge1xuICAgIHJldHVybiAhIXRoaXMub3B0cy51ZGlkO1xuICB9XG5cbiAgaXNTYWZhcmkgKCkge1xuICAgIHJldHVybiB0aGlzLm9wdHMuc2FmYXJpO1xuICB9XG5cbiAgYXN5bmMgd2FpdEZvckFwcExhdW5jaGVkICgpIHtcbiAgICAvLyBvbiBpT1M4IGluIHBhcnRpY3VsYXIsIHdlIGNhbiBnZXQgYSB3b3JraW5nIHNlc3Npb24gYmVmb3JlIHRoZSBhcHBcbiAgICAvLyBpcyByZWFkeSB0byByZXNwb25kIHRvIGNvbW1hbmRzOyBpbiB0aGF0IGNhc2UgdGhlIHNvdXJjZSB3aWxsIGJlIGVtcHR5XG4gICAgLy8gc28gd2UganVzdCBzcGluIHVudGlsIGl0J3Mgbm90XG4gICAgbGV0IGNvbmRGbjtcbiAgICBpZiAodGhpcy5vcHRzLndhaXRGb3JBcHBTY3JpcHQpIHtcbiAgICAgIC8vIHRoZSBkZWZhdWx0IGdldFNvdXJjZUZvckVsZW1lbnRGb3JYTUwgZG9lcyBub3QgZml0IHNvbWUgdXNlIGNhc2UsIHNvIG1ha2luZyB0aGlzIGN1c3RvbWl6YWJsZS5cbiAgICAgIC8vIFRPRE86IGNvbGxlY3Qgc2NyaXB0IGZyb20gY3VzdG9tZXIgYW5kIHByb3Bvc2Ugc2V2ZXJhbCBvcHRpb25zLCBwbGVhc2UgY29tbWVudCBpbiBpc3N1ZSAjNDE5MC5cbiAgICAgIGxvZ2dlci5kZWJ1ZyhgVXNpbmcgY3VzdG9tIHNjcmlwdCB0byB3YWl0IGZvciBhcHAgc3RhcnQ6ICR7dGhpcy5vcHRzLndhaXRGb3JBcHBTY3JpcHR9YCk7XG4gICAgICBjb25kRm4gPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCByZXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzID0gYXdhaXQgdGhpcy51aUF1dG9DbGllbnQuc2VuZENvbW1hbmQoYHRyeXtcXG4ke3RoaXMub3B0cy53YWl0Rm9yQXBwU2NyaXB0fWAgK1xuICAgICAgICAgICAgICAgICAgICAgYFxcbn0gY2F0Y2goZXJyKSB7ICQubG9nKFwid2FpdEZvckFwcFNjcmlwdCBlcnI6IFwiICsgZXJyb3IpOyBmYWxzZTsgfTtgKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKGBDYW5ub3QgZXZhbCB3YWl0Rm9yQXBwU2NyaXB0IHNjcmlwdCwgZXJyOiAke2Vycn1gKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiByZXMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnVW5leHBlY3RlZCByZXR1cm4gdHlwZSBpbiB3YWl0Rm9yQXBwU2NyaXB0IHNjcmlwdCcpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNTYWZhcmkoKSkge1xuICAgICAgaWYgKHRoaXMuaXNSZWFsRGV2aWNlKCkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGlja0J1dHRvblRvTGF1bmNoU2FmYXJpKCk7XG4gICAgICB9XG4gICAgICBsb2dnZXIuZGVidWcoJ1dhaXRpbmcgZm9yIGluaXRpYWwgd2VidmlldycpO1xuICAgICAgYXdhaXQgdGhpcy5uYXZUb0luaXRpYWxXZWJ2aWV3KCk7XG4gICAgICBjb25kRm4gPSBhc3luYyAoKSA9PiB0cnVlOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHJlcXVpcmUtYXdhaXRcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmRlYnVnKFwiV2FpdGluZyBmb3IgYXBwIHNvdXJjZSB0byBjb250YWluIGVsZW1lbnRzXCIpO1xuICAgICAgY29uZEZuID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCBzb3VyY2UgPSBhd2FpdCB0aGlzLmdldFNvdXJjZUZvckVsZW1lbnRGb3JYTUwoKTtcbiAgICAgICAgICBzb3VyY2UgPSBKU09OLnBhcnNlKHNvdXJjZSB8fCBcInt9XCIpO1xuICAgICAgICAgIGxldCBhcHBFbHMgPSAoc291cmNlLlVJQUFwcGxpY2F0aW9uIHx8IHt9KVsnPiddO1xuICAgICAgICAgIHJldHVybiBhcHBFbHMgJiYgYXBwRWxzLmxlbmd0aCA+IDAgJiYgIUlvc0RyaXZlci5pc1NwcmluZ0JvYXJkKHNvdXJjZS5VSUFBcHBsaWNhdGlvbik7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgQ291bGRuJ3QgZXh0cmFjdCBhcHAgZWxlbWVudCBmcm9tIHNvdXJjZSwgZXJyb3Igd2FzOiAke2V9YCk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgYXdhaXQgd2FpdEZvckNvbmRpdGlvbihjb25kRm4sIHtsb2dnZXIsIHdhaXRNczogMTAwMDAsIGludGVydmFsTXM6IDUwMH0pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyci5tZXNzYWdlICYmIGVyci5tZXNzYWdlLm1hdGNoKC9Db25kaXRpb24gdW5tZXQvKSkge1xuICAgICAgICBsb2dnZXIud2FybignSW5pdGlhbCBzcGluIHRpbWVkIG91dCwgY29udGludWluZyBidXQgdGhlIGFwcCBtaWdodCBub3QgYmUgcmVhZHkuJyk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgSW5pdGlhbCBzcGluIGVycm9yIHdhczogJHtlcnJ9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGlzU3ByaW5nQm9hcmQgKHVpQXBwT2JqKSB7XG4gIC8vIFRPRE86IG1vdmUgdG8gaGVscGVyc1xuICAvLyBUZXN0IGZvciBpT1MgaG9tZXNjcmVlbiAoU3ByaW5nQm9hcmQpLiBBVVQgb2NjYXNzaW9uYWxseSBzdGFydCB0aGUgc2ltLCBidXQgZmFpbHMgdG8gbG9hZFxuICAvLyB0aGUgYXBwLiBJZiB0aGF0IG9jY3VycywgZ2V0U291cmNlRm9yRWxlbWVudEZvWE1MIHdpbGwgcmV0dXJuIGEgZG9jIG9iamVjdCB0aGF0IG1lZXRzIG91clxuICAvLyBhcHAtY2hlY2sgY29uZGl0aW9ucywgcmVzdWx0aW5nIGluIGEgZmFsc2UgcG9zaXRpdmUuIFRoaXMgZnVuY3Rpb24gdGVzdHMgdGhlIFVpQXBwbGljYXRpb25cbiAgLy8gcHJvcGVydHkncyBtZXRhIGRhdGEgdG8gZW5zdXJlIHRoYXQgdGhlIEFwcGl1bSBkb2Vzbid0IGNvbmZ1c2UgU3ByaW5nQm9hcmQgd2l0aCB0aGUgYXBwXG4gIC8vIHVuZGVyIHRlc3QuXG4gICAgcmV0dXJuIF8ucHJvcGVydHlPZih1aUFwcE9ialsnQCddKSgnbmFtZScpID09PSAnU3ByaW5nQm9hcmQnO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlSW5zdHJ1bWVudHMgKCkge1xuICAgIGxvZ2dlci5kZWJ1ZyhcIkNyZWF0aW5nIGluc3RydW1lbnRzXCIpO1xuICAgIHRoaXMudWlBdXRvQ2xpZW50ID0gbmV3IFVJQXV0b0NsaWVudCh0aGlzLnNvY2spO1xuICAgIHRoaXMuaW5zdHJ1bWVudHMgPSBhd2FpdCB0aGlzLm1ha2VJbnN0cnVtZW50cygpO1xuICAgIHRoaXMuaW5zdHJ1bWVudHMub25TaHV0ZG93bi5jYXRjaChhc3luYyAoKSA9PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcHJvbWlzZS9jYXRjaC1vci1yZXR1cm5cbiAgICAgIC8vIHVuZXhwZWN0ZWQgZXhpdFxuICAgICAgYXdhaXQgdGhpcy5zdGFydFVuZXhwZWN0ZWRTaHV0ZG93bihuZXcgZXJyb3JzLlVua25vd25FcnJvcignQWJub3JtYWwgSW5zdHJ1bWVudHMgdGVybWluYXRpb24hJykpO1xuICAgIH0pLmRvbmUoKTtcbiAgfVxuXG4gIHNob3VsZElnbm9yZUluc3RydW1lbnRzRXhpdCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmYXJpICYmIHRoaXMuaXNSZWFsRGV2aWNlKCk7XG4gIH1cblxuICBhc3luYyBtYWtlSW5zdHJ1bWVudHMgKCkge1xuICAgIC8vIGF0IHRoZSBtb21lbnQgYWxsIHRoZSBsb2dnaW5nIGluIHVpYXV0byBpcyBhdCBkZWJ1ZyBsZXZlbFxuICAgIGxldCBib290c3RyYXBQYXRoID0gYXdhaXQgcHJlcGFyZUJvb3RzdHJhcCh7XG4gICAgICBzb2NrOiB0aGlzLnNvY2ssXG4gICAgICBpbnRlcktleURlbGF5OiB0aGlzLm9wdHMuaW50ZXJLZXlEZWxheSxcbiAgICAgIGp1c3RMb29wSW5maW5pdGVseTogZmFsc2UsXG4gICAgICBhdXRvQWNjZXB0QWxlcnRzOiB0aGlzLm9wdHMuYXV0b0FjY2VwdEFsZXJ0cyxcbiAgICAgIGF1dG9EaXNtaXNzQWxlcnRzOiB0aGlzLm9wdHMuYXV0b0Rpc21pc3NBbGVydHMsXG4gICAgICBzZW5kS2V5U3RyYXRlZ3k6IHRoaXMub3B0cy5zZW5kS2V5U3RyYXRlZ3kgfHwgKHRoaXMuaXNSZWFsRGV2aWNlKCkgPyAnZ3JvdXBlZCcgOiAnb25lQnlPbmUnKVxuICAgIH0pO1xuICAgIGxldCBpbnN0cnVtZW50cyA9IG5ldyBJbnN0cnVtZW50cyh7XG4gICAgICAvLyBvbiByZWFsIGRldmljZXMgYnVuZGxlSWQgaXMgYWx3YXlzIHVzZWRcbiAgICAgIGFwcDogKCF0aGlzLmlzUmVhbERldmljZSgpID8gdGhpcy5vcHRzLmFwcCA6IG51bGwpIHx8IHRoaXMub3B0cy5idW5kbGVJZCxcbiAgICAgIHVkaWQ6IHRoaXMub3B0cy51ZGlkLFxuICAgICAgcHJvY2Vzc0FyZ3VtZW50czogdGhpcy5vcHRzLnByb2Nlc3NBcmd1bWVudHMsXG4gICAgICBpZ25vcmVTdGFydHVwRXhpdDogdGhpcy5zaG91bGRJZ25vcmVJbnN0cnVtZW50c0V4aXQoKSxcbiAgICAgIGJvb3RzdHJhcDogYm9vdHN0cmFwUGF0aCxcbiAgICAgIHRlbXBsYXRlOiB0aGlzLm9wdHMuYXV0b21hdGlvblRyYWNlVGVtcGxhdGVQYXRoLFxuICAgICAgaW5zdHJ1bWVudHNQYXRoOiB0aGlzLm9wdHMuaW5zdHJ1bWVudHNQYXRoLFxuICAgICAgd2l0aG91dERlbGF5OiB0aGlzLm9wdHMud2l0aG91dERlbGF5LFxuICAgICAgcGxhdGZvcm1WZXJzaW9uOiB0aGlzLm9wdHMucGxhdGZvcm1WZXJzaW9uLFxuICAgICAgd2ViU29ja2V0OiB0aGlzLm9wdHMud2ViU29ja2V0LFxuICAgICAgbGF1bmNoVGltZW91dDogdGhpcy5vcHRzLmxhdW5jaFRpbWVvdXQsXG4gICAgICBmbGFrZXlSZXRyaWVzOiB0aGlzLm9wdHMuYmFja2VuZFJldHJpZXMsXG4gICAgICByZWFsRGV2aWNlOiB0aGlzLmlzUmVhbERldmljZSgpLFxuICAgICAgc2ltdWxhdG9yU2RrQW5kRGV2aWNlOiB0aGlzLmlvc1Nka1ZlcnNpb24gPj0gNy4xID8gYXdhaXQgZ2V0QWRqdXN0ZWREZXZpY2VOYW1lKHRoaXMub3B0cykgOiBudWxsLFxuICAgICAgdG1wRGlyOiBwYXRoLnJlc29sdmUodGhpcy5vcHRzLnRtcERpciB8fCAnL3RtcCcsICdhcHBpdW0taW5zdHJ1bWVudHMnKSxcbiAgICAgIHRyYWNlRGlyOiB0aGlzLm9wdHMudHJhY2VEaXIsXG4gICAgICBsb2NhbGU6IHRoaXMub3B0cy5sb2NhbGUsXG4gICAgICBsYW5ndWFnZTogdGhpcy5vcHRzLmxhbmd1YWdlXG4gICAgfSk7XG4gICAgcmV0dXJuIGluc3RydW1lbnRzO1xuICB9XG5cbiAgYXN5bmMgc3RhcnRJbnN0cnVtZW50cyAoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKFwiU3RhcnRpbmcgVUlBdXRvQ2xpZW50LCBhbmQgbGF1bmNoaW5nIEluc3RydW1lbnRzLlwiKTtcblxuICAgIGF3YWl0IEIuYWxsKFtcbiAgICAgIHRoaXMudWlBdXRvQ2xpZW50LnN0YXJ0KCkudGhlbigoKSA9PiB7IHRoaXMuaW5zdHJ1bWVudHMucmVnaXN0ZXJMYXVuY2goKTsgfSksXG4gICAgICB0aGlzLmluc3RydW1lbnRzLmxhdW5jaCgpXG4gICAgXSk7XG4gIH1cblxuICBhc3luYyBjb25maWd1cmVCb290c3RyYXAgKCkge1xuICAgIGxvZ2dlci5kZWJ1ZyhcIlNldHRpbmcgYm9vdHN0cmFwIGNvbmZpZyBrZXlzL3ZhbHVlc1wiKTtcbiAgICBsZXQgaXNWZXJib3NlID0gdHJ1ZTsgLy8gVE9ETzogbGV2ZWwgd2FzIGNvbmZpZ3VyZWQgYWNjb3JkaW5nIHRvIGxvZ2dlclxuICAgIGxldCBjbWQgPSAndGFyZ2V0ID0gJC50YXJnZXQoKTtcXG4nO1xuICAgIGNtZCArPSAnYXUgPSAkO1xcbic7XG4gICAgY21kICs9IGAkLmlzVmVyYm9zZSA9ICR7aXNWZXJib3NlfTtcXG5gO1xuICAgIC8vIE5vdCB1c2luZyB1aWF1dG8gZ3JhY2UgcGVyaW9kIGJlY2F1c2Ugb2YgYnVnLlxuICAgIC8vIGNtZCArPSAnJC50YXJnZXQoKS5zZXRUaW1lb3V0KDEpO1xcbic7XG4gICAgYXdhaXQgdGhpcy51aUF1dG9DbGllbnQuc2VuZENvbW1hbmQoY21kKTtcbiAgfVxuXG4gIGFzeW5jIGdldFNvdXJjZUZvckVsZW1lbnRGb3JYTUwgKGN0eCkge1xuICAgIGxldCBzb3VyY2U7XG4gICAgaWYgKCFjdHgpIHtcbiAgICAgIHNvdXJjZSA9IGF3YWl0IHRoaXMudWlBdXRvQ2xpZW50LnNlbmRDb21tYW5kKFwiYXUubWFpbkFwcCgpLmdldFRyZWVGb3JYTUwoKVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc291cmNlID0gYXdhaXQgdGhpcy51aUF1dG9DbGllbnQuc2VuZENvbW1hbmQoYGF1LmdldEVsZW1lbnQoJyR7Y3R4fScpLmdldFRyZWVGb3JYTUwoKWApO1xuICAgIH1cbiAgICAvLyBUT0RPOiBhbGwgdGhpcyBqc29uL3htbCBsb2dpYyBpcyB2ZXJ5IGV4cGVuc2l2ZSwgd2UgbmVlZFxuICAgIC8vIHRvIHVzZSBhIFNBWCBwYXJzZXIgaW5zdGVhZC5cbiAgICBpZiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoc291cmNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuIGJ1dCB3ZSd2ZSByZWNlaXZlZCBidWcgcmVwb3J0czsgdGhpcyB3aWxsIGhlbHAgdXMgdHJhY2sgZG93blxuICAgICAgLy8gd2hhdCdzIHdyb25nIGluIGdldFRyZWVGb3JYTUxcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQmFkIHJlc3BvbnNlIGZyb20gZ2V0VHJlZUZvclhNTC4gcmVzIHdhcyAke0pTT04uc3RyaW5naWZ5KHNvdXJjZSl9YCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IHJlYWxEZXZpY2UgKCkge1xuICAgIHRoaXMuX3JlYWxEZXZpY2UgPSB0aGlzLl9yZWFsRGV2aWNlIHx8IHRoaXMuZ2V0SURldmljZU9iaigpO1xuICAgIHJldHVybiB0aGlzLl9yZWFsRGV2aWNlO1xuICB9XG5cbiAgc2V0IHJlYWxEZXZpY2UgKHJkKSB7XG4gICAgdGhpcy5fcmVhbERldmljZSA9IHJkO1xuICB9XG59XG5cbmZvciAobGV0IFtjbWQsIGZuXSBvZiBfLnRvUGFpcnMoY29tbWFuZHMpKSB7XG4gIElvc0RyaXZlci5wcm90b3R5cGVbY21kXSA9IGZuO1xufVxuXG5cbmV4cG9ydCB7IElvc0RyaXZlciwgZGVmYXVsdFNlcnZlckNhcHMgfTtcbmV4cG9ydCBkZWZhdWx0IElvc0RyaXZlcjtcbiJdLCJmaWxlIjoibGliL2RyaXZlci5qcyIsInNvdXJjZVJvb3QiOiIuLi8uLiJ9
