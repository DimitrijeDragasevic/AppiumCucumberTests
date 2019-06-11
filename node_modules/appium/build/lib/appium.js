"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppiumDriver = void 0;

require("source-map-support/register");

var _lodash = _interopRequireDefault(require("lodash"));

var _logger = _interopRequireDefault(require("./logger"));

var _config = require("./config");

var _appiumBaseDriver = require("appium-base-driver");

var _bluebird = _interopRequireDefault(require("bluebird"));

var _asyncLock = _interopRequireDefault(require("async-lock"));

var _utils = require("./utils");

var _semver = _interopRequireDefault(require("semver"));

var _wordWrap = _interopRequireDefault(require("word-wrap"));

var _os = require("os");

const PLATFORMS = {
  FAKE: 'fake',
  ANDROID: 'android',
  IOS: 'ios',
  APPLE_TVOS: 'tvos',
  WINDOWS: 'windows',
  MAC: 'mac',
  TIZEN: 'tizen'
};
const AUTOMATION_NAMES = {
  APPIUM: 'Appium',
  SELENDROID: 'Selendroid',
  UIAUTOMATOR2: 'UiAutomator2',
  UIAUTOMATOR1: 'UiAutomator1',
  XCUITEST: 'XCUITest',
  YOUIENGINE: 'YouiEngine',
  ESPRESSO: 'Espresso',
  TIZEN: 'Tizen',
  FAKE: 'Fake',
  INSTRUMENTS: 'Instruments',
  WINDOWS: 'Windows',
  MAC: 'Mac'
};
const DRIVER_MAP = {
  [AUTOMATION_NAMES.SELENDROID.toLowerCase()]: {
    driverClassName: 'SelendroidDriver',
    driverPackage: 'appium-selendroid-driver'
  },
  [AUTOMATION_NAMES.UIAUTOMATOR2.toLowerCase()]: {
    driverClassName: 'AndroidUiautomator2Driver',
    driverPackage: 'appium-uiautomator2-driver'
  },
  [AUTOMATION_NAMES.XCUITEST.toLowerCase()]: {
    driverClassName: 'XCUITestDriver',
    driverPackage: 'appium-xcuitest-driver'
  },
  [AUTOMATION_NAMES.YOUIENGINE.toLowerCase()]: {
    driverClassName: 'YouiEngineDriver',
    driverPackage: 'appium-youiengine-driver'
  },
  [AUTOMATION_NAMES.FAKE.toLowerCase()]: {
    driverClassName: 'FakeDriver',
    driverPackage: 'appium-fake-driver'
  },
  [AUTOMATION_NAMES.UIAUTOMATOR1.toLowerCase()]: {
    driverClassName: 'AndroidDriver',
    driverPackage: 'appium-android-driver'
  },
  [AUTOMATION_NAMES.INSTRUMENTS.toLowerCase()]: {
    driverClassName: 'IosDriver',
    driverPackage: 'appium-ios-driver'
  },
  [AUTOMATION_NAMES.WINDOWS.toLowerCase()]: {
    driverClassName: 'WindowsDriver',
    driverPackage: 'appium-windows-driver'
  },
  [AUTOMATION_NAMES.MAC.toLowerCase()]: {
    driverClassName: 'MacDriver',
    driverPackage: 'appium-mac-driver'
  },
  [AUTOMATION_NAMES.ESPRESSO.toLowerCase()]: {
    driverClassName: 'EspressoDriver',
    driverPackage: 'appium-espresso-driver'
  },
  [AUTOMATION_NAMES.TIZEN.toLowerCase()]: {
    driverClassName: 'TizenDriver',
    driverPackage: 'appium-tizen-driver'
  }
};
const PLATFORMS_MAP = {
  [PLATFORMS.FAKE]: () => AUTOMATION_NAMES.FAKE,
  [PLATFORMS.ANDROID]: caps => {
    const platformVersion = _semver.default.valid(_semver.default.coerce(caps.platformVersion));

    const logDividerLength = 70;
    const automationWarning = [`The 'automationName' capability was not provided in the desired capabilities for this Android session`, `Setting 'automationName=UiAutomator1' by default and using the UiAutomator1 Driver`, `The next minor version of Appium (1.14.x) will set 'automationName=UiAutomator2' by default and use the UiAutomator2 Driver`, `The next major version of Appium (2.x) will **require** the 'automationName' capability to be set for all sessions on all platforms`, `If you are happy with 'UiAutomator1' and do not wish to upgrade Android drivers, please add 'automationName=UiAutomator1' to your desired capabilities`, `For more information about drivers, please visit http://appium.io/docs/en/about-appium/intro/ and explore the 'Drivers' menu`];
    let divider = `${_os.EOL}${_lodash.default.repeat('=', logDividerLength)}${_os.EOL}`;
    let automationWarningString = divider;
    automationWarningString += `  DEPRECATION WARNING:` + _os.EOL;

    for (let log of automationWarning) {
      automationWarningString += _os.EOL + (0, _wordWrap.default)(log, {
        width: logDividerLength - 2
      }) + _os.EOL;
    }

    automationWarningString += divider;

    _logger.default.warn(automationWarningString);

    _logger.default.info(`Setting automation to '${AUTOMATION_NAMES.UIAUTOMATOR1}'. `);

    if (platformVersion && _semver.default.satisfies(platformVersion, '>=6.0.0')) {
      _logger.default.warn(`Consider setting 'automationName' capability to '${AUTOMATION_NAMES.UIAUTOMATOR2}' ` + 'on Android >= 6, since UIAutomator1 framework ' + 'is not maintained anymore by the OS vendor.');
    }

    return AUTOMATION_NAMES.UIAUTOMATOR1;
  },
  [PLATFORMS.IOS]: caps => {
    const platformVersion = _semver.default.valid(_semver.default.coerce(caps.platformVersion));

    _logger.default.warn(`DeprecationWarning: 'automationName' capability was not provided. ` + `Future versions of Appium will require 'automationName' capability to be set for iOS sessions.`);

    if (platformVersion && _semver.default.satisfies(platformVersion, '>=10.0.0')) {
      _logger.default.info('Requested iOS support with version >= 10, ' + `using '${AUTOMATION_NAMES.XCUITEST}' ` + 'driver instead of UIAutomation-based driver, since the ' + 'latter is unsupported on iOS 10 and up.');

      return AUTOMATION_NAMES.XCUITEST;
    }

    return AUTOMATION_NAMES.INSTRUMENTS;
  },
  [PLATFORMS.APPLE_TVOS]: () => AUTOMATION_NAMES.XCUITEST,
  [PLATFORMS.WINDOWS]: () => AUTOMATION_NAMES.WINDOWS,
  [PLATFORMS.MAC]: () => AUTOMATION_NAMES.MAC,
  [PLATFORMS.TIZEN]: () => AUTOMATION_NAMES.TIZEN
};
const desiredCapabilityConstraints = {
  automationName: {
    presence: false,
    isString: true,
    inclusionCaseInsensitive: _lodash.default.values(AUTOMATION_NAMES)
  },
  platformName: {
    presence: true,
    isString: true,
    inclusionCaseInsensitive: _lodash.default.keys(PLATFORMS_MAP)
  }
};
const sessionsListGuard = new _asyncLock.default();
const pendingDriversGuard = new _asyncLock.default();

class AppiumDriver extends _appiumBaseDriver.BaseDriver {
  constructor(args) {
    super();
    this.desiredCapConstraints = desiredCapabilityConstraints;
    this.newCommandTimeoutMs = 0;
    this.args = Object.assign({}, args);
    this.sessions = {};
    this.pendingDrivers = {};
    (0, _config.updateBuildInfo)();
  }

  get isCommandsQueueEnabled() {
    return false;
  }

  sessionExists(sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && dstSession.sessionId !== null;
  }

  driverForSession(sessionId) {
    return this.sessions[sessionId];
  }

  getDriverAndVersionForCaps(caps) {
    if (!_lodash.default.isString(caps.platformName)) {
      throw new Error('You must include a platformName capability');
    }

    const platformName = caps.platformName.toLowerCase();
    let automationNameCap = caps.automationName;

    if (!_lodash.default.isString(automationNameCap) || automationNameCap.toLowerCase() === 'appium') {
      const driverSelector = PLATFORMS_MAP[platformName];

      if (driverSelector) {
        automationNameCap = driverSelector(caps);
      }
    }

    automationNameCap = automationNameCap.toLowerCase();

    try {
      const {
        driverPackage,
        driverClassName
      } = DRIVER_MAP[automationNameCap];

      const driver = require(driverPackage)[driverClassName];

      return {
        driver,
        version: this.getDriverVersion(driver.name, driverPackage)
      };
    } catch (ign) {}

    const msg = _lodash.default.isString(caps.automationName) ? `Could not find a driver for automationName '${caps.automationName}' and platformName ` + `'${caps.platformName}'.` : `Could not find a driver for platformName '${caps.platformName}'.`;
    throw new Error(`${msg} Please check your desired capabilities.`);
  }

  getDriverVersion(driverName, driverPackage) {
    const version = (0, _utils.getPackageVersion)(driverPackage);

    if (version) {
      return version;
    }

    _logger.default.warn(`Unable to get version of driver '${driverName}'`);
  }

  async getStatus() {
    return {
      build: _lodash.default.clone((0, _config.getBuildInfo)())
    };
  }

  async getSessions() {
    const sessions = await sessionsListGuard.acquire(AppiumDriver.name, () => this.sessions);
    return _lodash.default.toPairs(sessions).map(([id, driver]) => {
      return {
        id,
        capabilities: driver.caps
      };
    });
  }

  printNewSessionAnnouncement(caps, driverName, driverVersion) {
    const introString = driverVersion ? `Appium v${_config.APPIUM_VER} creating new ${driverName} (v${driverVersion}) session` : `Appium v${_config.APPIUM_VER} creating new ${driverName} session`;

    _logger.default.info(introString);

    _logger.default.info('Capabilities:');

    (0, _utils.inspectObject)(caps);
  }

  async createSession(jsonwpCaps, reqCaps, w3cCapabilities) {
    const defaultCapabilities = _lodash.default.cloneDeep(this.args.defaultCapabilities);

    const defaultSettings = (0, _utils.pullSettings)(defaultCapabilities);
    jsonwpCaps = _lodash.default.cloneDeep(jsonwpCaps);
    const jwpSettings = Object.assign({}, defaultSettings, (0, _utils.pullSettings)(jsonwpCaps));
    w3cCapabilities = _lodash.default.cloneDeep(w3cCapabilities);
    const w3cSettings = Object.assign({}, jwpSettings);
    Object.assign(w3cSettings, (0, _utils.pullSettings)((w3cCapabilities || {}).alwaysMatch || {}));

    for (const firstMatchEntry of (w3cCapabilities || {}).firstMatch || []) {
      Object.assign(w3cSettings, (0, _utils.pullSettings)(firstMatchEntry));
    }

    let protocol;
    let innerSessionId, dCaps;

    try {
      const parsedCaps = (0, _utils.parseCapsForInnerDriver)(jsonwpCaps, w3cCapabilities, this.desiredCapConstraints, defaultCapabilities);
      const {
        desiredCaps,
        processedJsonwpCapabilities,
        processedW3CCapabilities,
        error
      } = parsedCaps;
      protocol = parsedCaps.protocol;

      if (error) {
        throw error;
      }

      const {
        driver: InnerDriver,
        version: driverVersion
      } = this.getDriverAndVersionForCaps(desiredCaps);
      this.printNewSessionAnnouncement(desiredCaps, InnerDriver.name, driverVersion);

      if (this.args.sessionOverride) {
        const sessionIdsToDelete = await sessionsListGuard.acquire(AppiumDriver.name, () => _lodash.default.keys(this.sessions));

        if (sessionIdsToDelete.length) {
          _logger.default.info(`Session override is on. Deleting other ${sessionIdsToDelete.length} active session${sessionIdsToDelete.length ? '' : 's'}.`);

          try {
            await _bluebird.default.map(sessionIdsToDelete, id => this.deleteSession(id));
          } catch (ign) {}
        }
      }

      let runningDriversData, otherPendingDriversData;
      const d = new InnerDriver(this.args);

      if (this.args.relaxedSecurityEnabled) {
        _logger.default.info(`Applying relaxed security to '${InnerDriver.name}' as per server command line argument`);

        d.relaxedSecurityEnabled = true;
      }

      d.server = this.server;

      try {
        runningDriversData = await this.curSessionDataForDriver(InnerDriver);
      } catch (e) {
        throw new _appiumBaseDriver.errors.SessionNotCreatedError(e.message);
      }

      await pendingDriversGuard.acquire(AppiumDriver.name, () => {
        this.pendingDrivers[InnerDriver.name] = this.pendingDrivers[InnerDriver.name] || [];
        otherPendingDriversData = this.pendingDrivers[InnerDriver.name].map(drv => drv.driverData);
        this.pendingDrivers[InnerDriver.name].push(d);
      });

      try {
        [innerSessionId, dCaps] = await d.createSession(processedJsonwpCapabilities, reqCaps, processedW3CCapabilities, [...runningDriversData, ...otherPendingDriversData]);
        protocol = d.protocol;
        await sessionsListGuard.acquire(AppiumDriver.name, () => {
          this.sessions[innerSessionId] = d;
        });
      } finally {
        await pendingDriversGuard.acquire(AppiumDriver.name, () => {
          _lodash.default.pull(this.pendingDrivers[InnerDriver.name], d);
        });
      }

      this.attachUnexpectedShutdownHandler(d, innerSessionId);

      _logger.default.info(`New ${InnerDriver.name} session created successfully, session ` + `${innerSessionId} added to master session list`);

      d.startNewCommandTimeout();

      if (d.isW3CProtocol() && !_lodash.default.isEmpty(w3cSettings)) {
        _logger.default.info(`Applying the initial values to Appium settings parsed from W3C caps: ` + JSON.stringify(w3cSettings));

        await d.updateSettings(w3cSettings);
      } else if (d.isMjsonwpProtocol() && !_lodash.default.isEmpty(jwpSettings)) {
        _logger.default.info(`Applying the initial values to Appium settings parsed from MJSONWP caps: ` + JSON.stringify(jwpSettings));

        await d.updateSettings(jwpSettings);
      }
    } catch (error) {
      return {
        protocol,
        error
      };
    }

    return {
      protocol,
      value: [innerSessionId, dCaps, protocol]
    };
  }

  async attachUnexpectedShutdownHandler(driver, innerSessionId) {
    try {
      await driver.onUnexpectedShutdown;
      throw new Error('Unexpected shutdown');
    } catch (e) {
      if (e instanceof _bluebird.default.CancellationError) {
        return;
      }

      _logger.default.warn(`Closing session, cause was '${e.message}'`);

      _logger.default.info(`Removing session ${innerSessionId} from our master session list`);

      await sessionsListGuard.acquire(AppiumDriver.name, () => {
        delete this.sessions[innerSessionId];
      });
    }
  }

  async curSessionDataForDriver(InnerDriver) {
    const sessions = await sessionsListGuard.acquire(AppiumDriver.name, () => this.sessions);

    const data = _lodash.default.values(sessions).filter(s => s.constructor.name === InnerDriver.name).map(s => s.driverData);

    for (let datum of data) {
      if (!datum) {
        throw new Error(`Problem getting session data for driver type ` + `${InnerDriver.name}; does it implement 'get ` + `driverData'?`);
      }
    }

    return data;
  }

  async deleteSession(sessionId) {
    let protocol;

    try {
      let otherSessionsData = null;
      let dstSession = null;
      await sessionsListGuard.acquire(AppiumDriver.name, () => {
        if (!this.sessions[sessionId]) {
          return;
        }

        const curConstructorName = this.sessions[sessionId].constructor.name;
        otherSessionsData = _lodash.default.toPairs(this.sessions).filter(([key, value]) => value.constructor.name === curConstructorName && key !== sessionId).map(([, value]) => value.driverData);
        dstSession = this.sessions[sessionId];
        protocol = dstSession.protocol;

        _logger.default.info(`Removing session ${sessionId} from our master session list`);

        delete this.sessions[sessionId];
      });
      return {
        protocol,
        value: await dstSession.deleteSession(sessionId, otherSessionsData)
      };
    } catch (e) {
      _logger.default.error(`Had trouble ending session ${sessionId}: ${e.message}`);

      return {
        protocol,
        error: e
      };
    }
  }

  async executeCommand(cmd, ...args) {
    if (cmd === 'getStatus') {
      return await this.getStatus();
    }

    if (isAppiumDriverCommand(cmd)) {
      return await super.executeCommand(cmd, ...args);
    }

    const sessionId = _lodash.default.last(args);

    const dstSession = await sessionsListGuard.acquire(AppiumDriver.name, () => this.sessions[sessionId]);

    if (!dstSession) {
      throw new Error(`The session with id '${sessionId}' does not exist`);
    }

    let res = {
      protocol: dstSession.protocol
    };

    try {
      res.value = await dstSession.executeCommand(cmd, ...args);
    } catch (e) {
      res.error = e;
    }

    return res;
  }

  proxyActive(sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && _lodash.default.isFunction(dstSession.proxyActive) && dstSession.proxyActive(sessionId);
  }

  getProxyAvoidList(sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession ? dstSession.getProxyAvoidList() : [];
  }

  canProxy(sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && dstSession.canProxy(sessionId);
  }

}

exports.AppiumDriver = AppiumDriver;

function isAppiumDriverCommand(cmd) {
  return !(0, _appiumBaseDriver.isSessionCommand)(cmd) || cmd === 'deleteSession';
}require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9hcHBpdW0uanMiXSwibmFtZXMiOlsiUExBVEZPUk1TIiwiRkFLRSIsIkFORFJPSUQiLCJJT1MiLCJBUFBMRV9UVk9TIiwiV0lORE9XUyIsIk1BQyIsIlRJWkVOIiwiQVVUT01BVElPTl9OQU1FUyIsIkFQUElVTSIsIlNFTEVORFJPSUQiLCJVSUFVVE9NQVRPUjIiLCJVSUFVVE9NQVRPUjEiLCJYQ1VJVEVTVCIsIllPVUlFTkdJTkUiLCJFU1BSRVNTTyIsIklOU1RSVU1FTlRTIiwiRFJJVkVSX01BUCIsInRvTG93ZXJDYXNlIiwiZHJpdmVyQ2xhc3NOYW1lIiwiZHJpdmVyUGFja2FnZSIsIlBMQVRGT1JNU19NQVAiLCJjYXBzIiwicGxhdGZvcm1WZXJzaW9uIiwic2VtdmVyIiwidmFsaWQiLCJjb2VyY2UiLCJsb2dEaXZpZGVyTGVuZ3RoIiwiYXV0b21hdGlvbldhcm5pbmciLCJkaXZpZGVyIiwiRU9MIiwiXyIsInJlcGVhdCIsImF1dG9tYXRpb25XYXJuaW5nU3RyaW5nIiwibG9nIiwid2lkdGgiLCJ3YXJuIiwiaW5mbyIsInNhdGlzZmllcyIsImRlc2lyZWRDYXBhYmlsaXR5Q29uc3RyYWludHMiLCJhdXRvbWF0aW9uTmFtZSIsInByZXNlbmNlIiwiaXNTdHJpbmciLCJpbmNsdXNpb25DYXNlSW5zZW5zaXRpdmUiLCJ2YWx1ZXMiLCJwbGF0Zm9ybU5hbWUiLCJrZXlzIiwic2Vzc2lvbnNMaXN0R3VhcmQiLCJBc3luY0xvY2siLCJwZW5kaW5nRHJpdmVyc0d1YXJkIiwiQXBwaXVtRHJpdmVyIiwiQmFzZURyaXZlciIsImNvbnN0cnVjdG9yIiwiYXJncyIsImRlc2lyZWRDYXBDb25zdHJhaW50cyIsIm5ld0NvbW1hbmRUaW1lb3V0TXMiLCJPYmplY3QiLCJhc3NpZ24iLCJzZXNzaW9ucyIsInBlbmRpbmdEcml2ZXJzIiwiaXNDb21tYW5kc1F1ZXVlRW5hYmxlZCIsInNlc3Npb25FeGlzdHMiLCJzZXNzaW9uSWQiLCJkc3RTZXNzaW9uIiwiZHJpdmVyRm9yU2Vzc2lvbiIsImdldERyaXZlckFuZFZlcnNpb25Gb3JDYXBzIiwiRXJyb3IiLCJhdXRvbWF0aW9uTmFtZUNhcCIsImRyaXZlclNlbGVjdG9yIiwiZHJpdmVyIiwicmVxdWlyZSIsInZlcnNpb24iLCJnZXREcml2ZXJWZXJzaW9uIiwibmFtZSIsImlnbiIsIm1zZyIsImRyaXZlck5hbWUiLCJnZXRTdGF0dXMiLCJidWlsZCIsImNsb25lIiwiZ2V0U2Vzc2lvbnMiLCJhY3F1aXJlIiwidG9QYWlycyIsIm1hcCIsImlkIiwiY2FwYWJpbGl0aWVzIiwicHJpbnROZXdTZXNzaW9uQW5ub3VuY2VtZW50IiwiZHJpdmVyVmVyc2lvbiIsImludHJvU3RyaW5nIiwiQVBQSVVNX1ZFUiIsImNyZWF0ZVNlc3Npb24iLCJqc29ud3BDYXBzIiwicmVxQ2FwcyIsInczY0NhcGFiaWxpdGllcyIsImRlZmF1bHRDYXBhYmlsaXRpZXMiLCJjbG9uZURlZXAiLCJkZWZhdWx0U2V0dGluZ3MiLCJqd3BTZXR0aW5ncyIsInczY1NldHRpbmdzIiwiYWx3YXlzTWF0Y2giLCJmaXJzdE1hdGNoRW50cnkiLCJmaXJzdE1hdGNoIiwicHJvdG9jb2wiLCJpbm5lclNlc3Npb25JZCIsImRDYXBzIiwicGFyc2VkQ2FwcyIsImRlc2lyZWRDYXBzIiwicHJvY2Vzc2VkSnNvbndwQ2FwYWJpbGl0aWVzIiwicHJvY2Vzc2VkVzNDQ2FwYWJpbGl0aWVzIiwiZXJyb3IiLCJJbm5lckRyaXZlciIsInNlc3Npb25PdmVycmlkZSIsInNlc3Npb25JZHNUb0RlbGV0ZSIsImxlbmd0aCIsIkIiLCJkZWxldGVTZXNzaW9uIiwicnVubmluZ0RyaXZlcnNEYXRhIiwib3RoZXJQZW5kaW5nRHJpdmVyc0RhdGEiLCJkIiwicmVsYXhlZFNlY3VyaXR5RW5hYmxlZCIsInNlcnZlciIsImN1clNlc3Npb25EYXRhRm9yRHJpdmVyIiwiZSIsImVycm9ycyIsIlNlc3Npb25Ob3RDcmVhdGVkRXJyb3IiLCJtZXNzYWdlIiwiZHJ2IiwiZHJpdmVyRGF0YSIsInB1c2giLCJwdWxsIiwiYXR0YWNoVW5leHBlY3RlZFNodXRkb3duSGFuZGxlciIsInN0YXJ0TmV3Q29tbWFuZFRpbWVvdXQiLCJpc1czQ1Byb3RvY29sIiwiaXNFbXB0eSIsIkpTT04iLCJzdHJpbmdpZnkiLCJ1cGRhdGVTZXR0aW5ncyIsImlzTWpzb253cFByb3RvY29sIiwidmFsdWUiLCJvblVuZXhwZWN0ZWRTaHV0ZG93biIsIkNhbmNlbGxhdGlvbkVycm9yIiwiZGF0YSIsImZpbHRlciIsInMiLCJkYXR1bSIsIm90aGVyU2Vzc2lvbnNEYXRhIiwiY3VyQ29uc3RydWN0b3JOYW1lIiwia2V5IiwiZXhlY3V0ZUNvbW1hbmQiLCJjbWQiLCJpc0FwcGl1bURyaXZlckNvbW1hbmQiLCJsYXN0IiwicmVzIiwicHJveHlBY3RpdmUiLCJpc0Z1bmN0aW9uIiwiZ2V0UHJveHlBdm9pZExpc3QiLCJjYW5Qcm94eSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFHQTs7QUFDQTs7QUFDQTs7QUFHQSxNQUFNQSxTQUFTLEdBQUc7QUFDaEJDLEVBQUFBLElBQUksRUFBRSxNQURVO0FBRWhCQyxFQUFBQSxPQUFPLEVBQUUsU0FGTztBQUdoQkMsRUFBQUEsR0FBRyxFQUFFLEtBSFc7QUFJaEJDLEVBQUFBLFVBQVUsRUFBRSxNQUpJO0FBS2hCQyxFQUFBQSxPQUFPLEVBQUUsU0FMTztBQU1oQkMsRUFBQUEsR0FBRyxFQUFFLEtBTlc7QUFPaEJDLEVBQUFBLEtBQUssRUFBRTtBQVBTLENBQWxCO0FBVUEsTUFBTUMsZ0JBQWdCLEdBQUc7QUFDdkJDLEVBQUFBLE1BQU0sRUFBRSxRQURlO0FBRXZCQyxFQUFBQSxVQUFVLEVBQUUsWUFGVztBQUd2QkMsRUFBQUEsWUFBWSxFQUFFLGNBSFM7QUFJdkJDLEVBQUFBLFlBQVksRUFBRSxjQUpTO0FBS3ZCQyxFQUFBQSxRQUFRLEVBQUUsVUFMYTtBQU12QkMsRUFBQUEsVUFBVSxFQUFFLFlBTlc7QUFPdkJD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Q0Q7O0FBRURDLEVBQUFBLFdBQVcsQ0FBRTNGLFNBQUYsRUFBYTtBQUN0QixVQUFNQyxVQUFVLEdBQUcsS0FBS0wsUUFBTCxDQUFjSSxTQUFkLENBQW5CO0FBQ0EsV0FBT0MsVUFBVSxJQUFJaEMsZ0JBQUUySCxVQUFGLENBQWEzRixVQUFVLENBQUMwRixXQUF4QixDQUFkLElBQXNEMUYsVUFBVSxDQUFDMEYsV0FBWCxDQUF1QjNGLFNBQXZCLENBQTdEO0FBQ0Q7O0FBRUQ2RixFQUFBQSxpQkFBaUIsQ0FBRTdGLFNBQUYsRUFBYTtBQUM1QixVQUFNQyxVQUFVLEdBQUcsS0FBS0wsUUFBTCxDQUFjSSxTQUFkLENBQW5CO0FBQ0EsV0FBT0MsVUFBVSxHQUFHQSxVQUFVLENBQUM0RixpQkFBWCxFQUFILEdBQW9DLEVBQXJEO0FBQ0Q7O0FBRURDLEVBQUFBLFFBQVEsQ0FBRTlGLFNBQUYsRUFBYTtBQUNuQixVQUFNQyxVQUFVLEdBQUcsS0FBS0wsUUFBTCxDQUFjSSxTQUFkLENBQW5CO0FBQ0EsV0FBT0MsVUFBVSxJQUFJQSxVQUFVLENBQUM2RixRQUFYLENBQW9COUYsU0FBcEIsQ0FBckI7QUFDRDs7QUExVm1DOzs7O0FBK1Z0QyxTQUFTd0YscUJBQVQsQ0FBZ0NELEdBQWhDLEVBQXFDO0FBQ25DLFNBQU8sQ0FBQyx3Q0FBaUJBLEdBQWpCLENBQUQsSUFBMEJBLEdBQUcsS0FBSyxlQUF6QztBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBsb2cgZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHsgZ2V0QnVpbGRJbmZvLCB1cGRhdGVCdWlsZEluZm8sIEFQUElVTV9WRVIgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBCYXNlRHJpdmVyLCBlcnJvcnMsIGlzU2Vzc2lvbkNvbW1hbmQgfSBmcm9tICdhcHBpdW0tYmFzZS1kcml2ZXInO1xuaW1wb3J0IEIgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IEFzeW5jTG9jayBmcm9tICdhc3luYy1sb2NrJztcbmltcG9ydCB7XG4gIGluc3BlY3RPYmplY3QsIHBhcnNlQ2Fwc0ZvcklubmVyRHJpdmVyLCBnZXRQYWNrYWdlVmVyc2lvbixcbiAgcHVsbFNldHRpbmdzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgd3JhcCBmcm9tICd3b3JkLXdyYXAnO1xuaW1wb3J0IHsgRU9MIH0gZnJvbSAnb3MnO1xuXG5cbmNvbnN0IFBMQVRGT1JNUyA9IHtcbiAgRkFLRTogJ2Zha2UnLFxuICBBTkRST0lEOiAnYW5kcm9pZCcsXG4gIElPUzogJ2lvcycsXG4gIEFQUExFX1RWT1M6ICd0dm9zJyxcbiAgV0lORE9XUzogJ3dpbmRvd3MnLFxuICBNQUM6ICdtYWMnLFxuICBUSVpFTjogJ3RpemVuJyxcbn07XG5cbmNvbnN0IEFVVE9NQVRJT05fTkFNRVMgPSB7XG4gIEFQUElVTTogJ0FwcGl1bScsXG4gIFNFTEVORFJPSUQ6ICdTZWxlbmRyb2lkJyxcbiAgVUlBVVRPTUFUT1IyOiAnVWlBdXRvbWF0b3IyJyxcbiAgVUlBVVRPTUFUT1IxOiAnVWlBdXRvbWF0b3IxJyxcbiAgWENVSVRFU1Q6ICdYQ1VJVGVzdCcsXG4gIFlPVUlFTkdJTkU6ICdZb3VpRW5naW5lJyxcbiAgRVNQUkVTU086ICdFc3ByZXNzbycsXG4gIFRJWkVOOiAnVGl6ZW4nLFxuICBGQUtFOiAnRmFrZScsXG4gIElOU1RSVU1FTlRTOiAnSW5zdHJ1bWVudHMnLFxuICBXSU5ET1dTOiAnV2luZG93cycsXG4gIE1BQzogJ01hYycsXG59O1xuY29uc3QgRFJJVkVSX01BUCA9IHtcbiAgW0FVVE9NQVRJT05fTkFNRVMuU0VMRU5EUk9JRC50b0xvd2VyQ2FzZSgpXToge1xuICAgIGRyaXZlckNsYXNzTmFtZTogJ1NlbGVuZHJvaWREcml2ZXInLFxuICAgIGRyaXZlclBhY2thZ2U6ICdhcHBpdW0tc2VsZW5kcm9pZC1kcml2ZXInLFxuICB9LFxuICBbQVVUT01BVElPTl9OQU1FUy5VSUFVVE9NQVRPUjIudG9Mb3dlckNhc2UoKV06IHtcbiAgICBkcml2ZXJDbGFzc05hbWU6ICdBbmRyb2lkVWlhdXRvbWF0b3IyRHJpdmVyJyxcbiAgICBkcml2ZXJQYWNrYWdlOiAnYXBwaXVtLXVpYXV0b21hdG9yMi1kcml2ZXInLFxuICB9LFxuICBbQVVUT01BVElPTl9OQU1FUy5YQ1VJVEVTVC50b0xvd2VyQ2FzZSgpXToge1xuICAgIGRyaXZlckNsYXNzTmFtZTogJ1hDVUlUZXN0RHJpdmVyJyxcbiAgICBkcml2ZXJQYWNrYWdlOiAnYXBwaXVtLXhjdWl0ZXN0LWRyaXZlcicsXG4gIH0sXG4gIFtBVVRPTUFUSU9OX05BTUVTLllPVUlFTkdJTkUudG9Mb3dlckNhc2UoKV06IHtcbiAgICBkcml2ZXJDbGFzc05hbWU6ICdZb3VpRW5naW5lRHJpdmVyJyxcbiAgICBkcml2ZXJQYWNrYWdlOiAnYXBwaXVtLXlvdWllbmdpbmUtZHJpdmVyJyxcbiAgfSxcbiAgW0FVVE9NQVRJT05fTkFNRVMuRkFLRS50b0xvd2VyQ2FzZSgpXToge1xuICAgIGRyaXZlckNsYXNzTmFtZTogJ0Zha2VEcml2ZXInLFxuICAgIGRyaXZlclBhY2thZ2U6ICdhcHBpdW0tZmFrZS1kcml2ZXInLFxuICB9LFxuICBbQVVUT01BVElPTl9OQU1FUy5VSUFVVE9NQVRPUjEudG9Mb3dlckNhc2UoKV06IHtcbiAgICBkcml2ZXJDbGFzc05hbWU6ICdBbmRyb2lkRHJpdmVyJyxcbiAgICBkcml2ZXJQYWNrYWdlOiAnYXBwaXVtLWFuZHJvaWQtZHJpdmVyJyxcbiAgfSxcbiAgW0FVVE9NQVRJT05fTkFNRVMuSU5TVFJVTUVOVFMudG9Mb3dlckNhc2UoKV06IHtcbiAgICBkcml2ZXJDbGFzc05hbWU6ICdJb3NEcml2ZXInLFxuICAgIGRyaXZlclBhY2thZ2U6ICdhcHBpdW0taW9zLWRyaXZlcicsXG4gIH0sXG4gIFtBVVRPTUFUSU9OX05BTUVTLldJTkRPV1MudG9Mb3dlckNhc2UoKV06IHtcbiAgICBkcml2ZXJDbGFzc05hbWU6ICdXaW5kb3dzRHJpdmVyJyxcbiAgICBkcml2ZXJQYWNrYWdlOiAnYXBwaXVtLXdpbmRvd3MtZHJpdmVyJyxcbiAgfSxcbiAgW0FVVE9NQVRJT05fTkFNRVMuTUFDLnRvTG93ZXJDYXNlKCldOiB7XG4gICAgZHJpdmVyQ2xhc3NOYW1lOiAnTWFjRHJpdmVyJyxcbiAgICBkcml2ZXJQYWNrYWdlOiAnYXBwaXVtLW1hYy1kcml2ZXInLFxuICB9LFxuICBbQVVUT01BVElPTl9OQU1FUy5FU1BSRVNTTy50b0xvd2VyQ2FzZSgpXToge1xuICAgIGRyaXZlckNsYXNzTmFtZTogJ0VzcHJlc3NvRHJpdmVyJyxcbiAgICBkcml2ZXJQYWNrYWdlOiAnYXBwaXVtLWVzcHJlc3NvLWRyaXZlcicsXG4gIH0sXG4gIFtBVVRPTUFUSU9OX05BTUVTLlRJWkVOLnRvTG93ZXJDYXNlKCldOiB7XG4gICAgZHJpdmVyQ2xhc3NOYW1lOiAnVGl6ZW5Ecml2ZXInLFxuICAgIGRyaXZlclBhY2thZ2U6ICdhcHBpdW0tdGl6ZW4tZHJpdmVyJyxcbiAgfSxcbn07XG5cbmNvbnN0IFBMQVRGT1JNU19NQVAgPSB7XG4gIFtQTEFURk9STVMuRkFLRV06ICgpID0+IEFVVE9NQVRJT05fTkFNRVMuRkFLRSxcbiAgW1BMQVRGT1JNUy5BTkRST0lEXTogKGNhcHMpID0+IHtcbiAgICBjb25zdCBwbGF0Zm9ybVZlcnNpb24gPSBzZW12ZXIudmFsaWQoc2VtdmVyLmNvZXJjZShjYXBzLnBsYXRmb3JtVmVyc2lvbikpO1xuXG4gICAgLy8gV2FybiB1c2VycyB0aGF0IGRlZmF1bHQgYXV0b21hdGlvbiBpcyBnb2luZyB0byBjaGFuZ2UgdG8gVWlBdXRvbWF0b3IyIGZvciAxLjE0XG4gICAgLy8gYW5kIHdpbGwgYmVjb21lIHJlcXVpcmVkIG9uIEFwcGl1bSAyLjBcbiAgICBjb25zdCBsb2dEaXZpZGVyTGVuZ3RoID0gNzA7IC8vIEZpdCBpbiBjb21tYW5kIGxpbmVcblxuICAgIGNvbnN0IGF1dG9tYXRpb25XYXJuaW5nID0gW1xuICAgICAgYFRoZSAnYXV0b21hdGlvbk5hbWUnIGNhcGFiaWxpdHkgd2FzIG5vdCBwcm92aWRlZCBpbiB0aGUgZGVzaXJlZCBjYXBhYmlsaXRpZXMgZm9yIHRoaXMgQW5kcm9pZCBzZXNzaW9uYCxcbiAgICAgIGBTZXR0aW5nICdhdXRvbWF0aW9uTmFtZT1VaUF1dG9tYXRvcjEnIGJ5IGRlZmF1bHQgYW5kIHVzaW5nIHRoZSBVaUF1dG9tYXRvcjEgRHJpdmVyYCxcbiAgICAgIGBUaGUgbmV4dCBtaW5vciB2ZXJzaW9uIG9mIEFwcGl1bSAoMS4xNC54KSB3aWxsIHNldCAnYXV0b21hdGlvbk5hbWU9VWlBdXRvbWF0b3IyJyBieSBkZWZhdWx0IGFuZCB1c2UgdGhlIFVpQXV0b21hdG9yMiBEcml2ZXJgLFxuICAgICAgYFRoZSBuZXh0IG1ham9yIHZlcnNpb24gb2YgQXBwaXVtICgyLngpIHdpbGwgKipyZXF1aXJlKiogdGhlICdhdXRvbWF0aW9uTmFtZScgY2FwYWJpbGl0eSB0byBiZSBzZXQgZm9yIGFsbCBzZXNzaW9ucyBvbiBhbGwgcGxhdGZvcm1zYCxcbiAgICAgIGBJZiB5b3UgYXJlIGhhcHB5IHdpdGggJ1VpQXV0b21hdG9yMScgYW5kIGRvIG5vdCB3aXNoIHRvIHVwZ3JhZGUgQW5kcm9pZCBkcml2ZXJzLCBwbGVhc2UgYWRkICdhdXRvbWF0aW9uTmFtZT1VaUF1dG9tYXRvcjEnIHRvIHlvdXIgZGVzaXJlZCBjYXBhYmlsaXRpZXNgLFxuICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IGRyaXZlcnMsIHBsZWFzZSB2aXNpdCBodHRwOi8vYXBwaXVtLmlvL2RvY3MvZW4vYWJvdXQtYXBwaXVtL2ludHJvLyBhbmQgZXhwbG9yZSB0aGUgJ0RyaXZlcnMnIG1lbnVgXG4gICAgXTtcblxuICAgIGxldCBkaXZpZGVyID0gYCR7RU9MfSR7Xy5yZXBlYXQoJz0nLCBsb2dEaXZpZGVyTGVuZ3RoKX0ke0VPTH1gO1xuICAgIGxldCBhdXRvbWF0aW9uV2FybmluZ1N0cmluZyA9IGRpdmlkZXI7XG4gICAgYXV0b21hdGlvbldhcm5pbmdTdHJpbmcgKz0gYCAgREVQUkVDQVRJT04gV0FSTklORzpgICsgRU9MO1xuICAgIGZvciAobGV0IGxvZyBvZiBhdXRvbWF0aW9uV2FybmluZykge1xuICAgICAgYXV0b21hdGlvbldhcm5pbmdTdHJpbmcgKz0gRU9MICsgd3JhcChsb2csIHt3aWR0aDogbG9nRGl2aWRlckxlbmd0aCAtIDJ9KSArIEVPTDtcbiAgICB9XG4gICAgYXV0b21hdGlvbldhcm5pbmdTdHJpbmcgKz0gZGl2aWRlcjtcblxuICAgIC8vIFJlY29tbWVuZCB1c2VycyB0byB1cGdyYWRlIHRvIFVpQXV0b21hdG9yMiBpZiB0aGV5J3JlIHVzaW5nIEFuZHJvaWQgPj0gNlxuICAgIGxvZy53YXJuKGF1dG9tYXRpb25XYXJuaW5nU3RyaW5nKTtcbiAgICBsb2cuaW5mbyhgU2V0dGluZyBhdXRvbWF0aW9uIHRvICcke0FVVE9NQVRJT05fTkFNRVMuVUlBVVRPTUFUT1IxfScuIGApO1xuICAgIGlmIChwbGF0Zm9ybVZlcnNpb24gJiYgc2VtdmVyLnNhdGlzZmllcyhwbGF0Zm9ybVZlcnNpb24sICc+PTYuMC4wJykpIHtcbiAgICAgIGxvZy53YXJuKGBDb25zaWRlciBzZXR0aW5nICdhdXRvbWF0aW9uTmFtZScgY2FwYWJpbGl0eSB0byAnJHtBVVRPTUFUSU9OX05BTUVTLlVJQVVUT01BVE9SMn0nIGAgK1xuICAgICAgICAnb24gQW5kcm9pZCA+PSA2LCBzaW5jZSBVSUF1dG9tYXRvcjEgZnJhbWV3b3JrICcgK1xuICAgICAgICAnaXMgbm90IG1haW50YWluZWQgYW55bW9yZSBieSB0aGUgT1MgdmVuZG9yLicpO1xuICAgIH1cblxuICAgIHJldHVybiBBVVRPTUFUSU9OX05BTUVTLlVJQVVUT01BVE9SMTtcbiAgfSxcbiAgW1BMQVRGT1JNUy5JT1NdOiAoY2FwcykgPT4ge1xuICAgIGNvbnN0IHBsYXRmb3JtVmVyc2lvbiA9IHNlbXZlci52YWxpZChzZW12ZXIuY29lcmNlKGNhcHMucGxhdGZvcm1WZXJzaW9uKSk7XG4gICAgbG9nLndhcm4oYERlcHJlY2F0aW9uV2FybmluZzogJ2F1dG9tYXRpb25OYW1lJyBjYXBhYmlsaXR5IHdhcyBub3QgcHJvdmlkZWQuIGAgK1xuICAgICAgYEZ1dHVyZSB2ZXJzaW9ucyBvZiBBcHBpdW0gd2lsbCByZXF1aXJlICdhdXRvbWF0aW9uTmFtZScgY2FwYWJpbGl0eSB0byBiZSBzZXQgZm9yIGlPUyBzZXNzaW9ucy5gKTtcbiAgICBpZiAocGxhdGZvcm1WZXJzaW9uICYmIHNlbXZlci5zYXRpc2ZpZXMocGxhdGZvcm1WZXJzaW9uLCAnPj0xMC4wLjAnKSkge1xuICAgICAgbG9nLmluZm8oJ1JlcXVlc3RlZCBpT1Mgc3VwcG9ydCB3aXRoIHZlcnNpb24gPj0gMTAsICcgK1xuICAgICAgICBgdXNpbmcgJyR7QVVUT01BVElPTl9OQU1FUy5YQ1VJVEVTVH0nIGAgK1xuICAgICAgICAnZHJpdmVyIGluc3RlYWQgb2YgVUlBdXRvbWF0aW9uLWJhc2VkIGRyaXZlciwgc2luY2UgdGhlICcgK1xuICAgICAgICAnbGF0dGVyIGlzIHVuc3VwcG9ydGVkIG9uIGlPUyAxMCBhbmQgdXAuJyk7XG4gICAgICByZXR1cm4gQVVUT01BVElPTl9OQU1FUy5YQ1VJVEVTVDtcbiAgICB9XG5cbiAgICByZXR1cm4gQVVUT01BVElPTl9OQU1FUy5JTlNUUlVNRU5UUztcbiAgfSxcbiAgW1BMQVRGT1JNUy5BUFBMRV9UVk9TXTogKCkgPT4gQVVUT01BVElPTl9OQU1FUy5YQ1VJVEVTVCxcbiAgW1BMQVRGT1JNUy5XSU5ET1dTXTogKCkgPT4gQVVUT01BVElPTl9OQU1FUy5XSU5ET1dTLFxuICBbUExBVEZPUk1TLk1BQ106ICgpID0+IEFVVE9NQVRJT05fTkFNRVMuTUFDLFxuICBbUExBVEZPUk1TLlRJWkVOXTogKCkgPT4gQVVUT01BVElPTl9OQU1FUy5USVpFTixcbn07XG5cbmNvbnN0IGRlc2lyZWRDYXBhYmlsaXR5Q29uc3RyYWludHMgPSB7XG4gIGF1dG9tYXRpb25OYW1lOiB7XG4gICAgcHJlc2VuY2U6IGZhbHNlLFxuICAgIGlzU3RyaW5nOiB0cnVlLFxuICAgIGluY2x1c2lvbkNhc2VJbnNlbnNpdGl2ZTogXy52YWx1ZXMoQVVUT01BVElPTl9OQU1FUyksXG4gIH0sXG4gIHBsYXRmb3JtTmFtZToge1xuICAgIHByZXNlbmNlOiB0cnVlLFxuICAgIGlzU3RyaW5nOiB0cnVlLFxuICAgIGluY2x1c2lvbkNhc2VJbnNlbnNpdGl2ZTogXy5rZXlzKFBMQVRGT1JNU19NQVApLFxuICB9LFxufTtcblxuY29uc3Qgc2Vzc2lvbnNMaXN0R3VhcmQgPSBuZXcgQXN5bmNMb2NrKCk7XG5jb25zdCBwZW5kaW5nRHJpdmVyc0d1YXJkID0gbmV3IEFzeW5jTG9jaygpO1xuXG5jbGFzcyBBcHBpdW1Ecml2ZXIgZXh0ZW5kcyBCYXNlRHJpdmVyIHtcbiAgY29uc3RydWN0b3IgKGFyZ3MpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5kZXNpcmVkQ2FwQ29uc3RyYWludHMgPSBkZXNpcmVkQ2FwYWJpbGl0eUNvbnN0cmFpbnRzO1xuXG4gICAgLy8gdGhlIG1haW4gQXBwaXVtIERyaXZlciBoYXMgbm8gbmV3IGNvbW1hbmQgdGltZW91dFxuICAgIHRoaXMubmV3Q29tbWFuZFRpbWVvdXRNcyA9IDA7XG5cbiAgICB0aGlzLmFyZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBhcmdzKTtcblxuICAgIC8vIEFjY2VzcyB0byBzZXNzaW9ucyBsaXN0IG11c3QgYmUgZ3VhcmRlZCB3aXRoIGEgU2VtYXBob3JlLCBiZWNhdXNlXG4gICAgLy8gaXQgbWlnaHQgYmUgY2hhbmdlZCBieSBvdGhlciBhc3luYyBjYWxscyBhdCBhbnkgdGltZVxuICAgIC8vIEl0IGlzIG5vdCByZWNvbW1lbmRlZCB0byBhY2Nlc3MgdGhpcyBwcm9wZXJ0eSBkaXJlY3RseSBmcm9tIHRoZSBvdXRzaWRlXG4gICAgdGhpcy5zZXNzaW9ucyA9IHt9O1xuXG4gICAgLy8gQWNjZXNzIHRvIHBlbmRpbmcgZHJpdmVycyBsaXN0IG11c3QgYmUgZ3VhcmRlZCB3aXRoIGEgU2VtYXBob3JlLCBiZWNhdXNlXG4gICAgLy8gaXQgbWlnaHQgYmUgY2hhbmdlZCBieSBvdGhlciBhc3luYyBjYWxscyBhdCBhbnkgdGltZVxuICAgIC8vIEl0IGlzIG5vdCByZWNvbW1lbmRlZCB0byBhY2Nlc3MgdGhpcyBwcm9wZXJ0eSBkaXJlY3RseSBmcm9tIHRoZSBvdXRzaWRlXG4gICAgdGhpcy5wZW5kaW5nRHJpdmVycyA9IHt9O1xuXG4gICAgLy8gYWxsb3cgdGhpcyB0byBoYXBwZW4gaW4gdGhlIGJhY2tncm91bmQsIHNvIG5vIGBhd2FpdGBcbiAgICB1cGRhdGVCdWlsZEluZm8oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYW5jZWwgY29tbWFuZHMgcXVldWVpbmcgZm9yIHRoZSB1bWJyZWxsYSBBcHBpdW0gZHJpdmVyXG4gICAqL1xuICBnZXQgaXNDb21tYW5kc1F1ZXVlRW5hYmxlZCAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc2Vzc2lvbkV4aXN0cyAoc2Vzc2lvbklkKSB7XG4gICAgY29uc3QgZHN0U2Vzc2lvbiA9IHRoaXMuc2Vzc2lvbnNbc2Vzc2lvbklkXTtcbiAgICByZXR1cm4gZHN0U2Vzc2lvbiAmJiBkc3RTZXNzaW9uLnNlc3Npb25JZCAhPT0gbnVsbDtcbiAgfVxuXG4gIGRyaXZlckZvclNlc3Npb24gKHNlc3Npb25JZCkge1xuICAgIHJldHVybiB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF07XG4gIH1cblxuICBnZXREcml2ZXJBbmRWZXJzaW9uRm9yQ2FwcyAoY2Fwcykge1xuICAgIGlmICghXy5pc1N0cmluZyhjYXBzLnBsYXRmb3JtTmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgaW5jbHVkZSBhIHBsYXRmb3JtTmFtZSBjYXBhYmlsaXR5Jyk7XG4gICAgfVxuXG4gICAgY29uc3QgcGxhdGZvcm1OYW1lID0gY2Fwcy5wbGF0Zm9ybU5hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIHdlIGRvbid0IG5lY2Vzc2FyaWx5IGhhdmUgYW4gYGF1dG9tYXRpb25OYW1lYCBjYXBhYmlsaXR5XG4gICAgbGV0IGF1dG9tYXRpb25OYW1lQ2FwID0gY2Fwcy5hdXRvbWF0aW9uTmFtZTtcbiAgICBpZiAoIV8uaXNTdHJpbmcoYXV0b21hdGlvbk5hbWVDYXApIHx8IGF1dG9tYXRpb25OYW1lQ2FwLnRvTG93ZXJDYXNlKCkgPT09ICdhcHBpdW0nKSB7XG4gICAgICBjb25zdCBkcml2ZXJTZWxlY3RvciA9IFBMQVRGT1JNU19NQVBbcGxhdGZvcm1OYW1lXTtcbiAgICAgIGlmIChkcml2ZXJTZWxlY3Rvcikge1xuICAgICAgICBhdXRvbWF0aW9uTmFtZUNhcCA9IGRyaXZlclNlbGVjdG9yKGNhcHMpO1xuICAgICAgfVxuICAgIH1cbiAgICBhdXRvbWF0aW9uTmFtZUNhcCA9IGF1dG9tYXRpb25OYW1lQ2FwLnRvTG93ZXJDYXNlKCk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3Qge2RyaXZlclBhY2thZ2UsIGRyaXZlckNsYXNzTmFtZX0gPSBEUklWRVJfTUFQW2F1dG9tYXRpb25OYW1lQ2FwXTtcbiAgICAgIGNvbnN0IGRyaXZlciA9IHJlcXVpcmUoZHJpdmVyUGFja2FnZSlbZHJpdmVyQ2xhc3NOYW1lXTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRyaXZlcixcbiAgICAgICAgdmVyc2lvbjogdGhpcy5nZXREcml2ZXJWZXJzaW9uKGRyaXZlci5uYW1lLCBkcml2ZXJQYWNrYWdlKSxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoaWduKSB7XG4gICAgICAvLyBlcnJvciB3aWxsIGJlIHJlcG9ydGVkIGJlbG93LCBhbmQgaGVyZSB3b3VsZCBjb21lIG91dCBhcyBhbiB1bmNsZWFyXG4gICAgICAvLyBwcm9ibGVtIHdpdGggZGVzdHJ1Y3R1cmluZyB1bmRlZmluZWRcbiAgICB9XG5cbiAgICBjb25zdCBtc2cgPSBfLmlzU3RyaW5nKGNhcHMuYXV0b21hdGlvbk5hbWUpXG4gICAgICA/IGBDb3VsZCBub3QgZmluZCBhIGRyaXZlciBmb3IgYXV0b21hdGlvbk5hbWUgJyR7Y2Fwcy5hdXRvbWF0aW9uTmFtZX0nIGFuZCBwbGF0Zm9ybU5hbWUgYCArXG4gICAgICAgICAgICBgJyR7Y2Fwcy5wbGF0Zm9ybU5hbWV9Jy5gXG4gICAgICA6IGBDb3VsZCBub3QgZmluZCBhIGRyaXZlciBmb3IgcGxhdGZvcm1OYW1lICcke2NhcHMucGxhdGZvcm1OYW1lfScuYDtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bXNnfSBQbGVhc2UgY2hlY2sgeW91ciBkZXNpcmVkIGNhcGFiaWxpdGllcy5gKTtcbiAgfVxuXG4gIGdldERyaXZlclZlcnNpb24gKGRyaXZlck5hbWUsIGRyaXZlclBhY2thZ2UpIHtcbiAgICBjb25zdCB2ZXJzaW9uID0gZ2V0UGFja2FnZVZlcnNpb24oZHJpdmVyUGFja2FnZSk7XG4gICAgaWYgKHZlcnNpb24pIHtcbiAgICAgIHJldHVybiB2ZXJzaW9uO1xuICAgIH1cbiAgICBsb2cud2FybihgVW5hYmxlIHRvIGdldCB2ZXJzaW9uIG9mIGRyaXZlciAnJHtkcml2ZXJOYW1lfSdgKTtcbiAgfVxuXG4gIGFzeW5jIGdldFN0YXR1cyAoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcmVxdWlyZS1hd2FpdFxuICAgIHJldHVybiB7XG4gICAgICBidWlsZDogXy5jbG9uZShnZXRCdWlsZEluZm8oKSksXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIGdldFNlc3Npb25zICgpIHtcbiAgICBjb25zdCBzZXNzaW9ucyA9IGF3YWl0IHNlc3Npb25zTGlzdEd1YXJkLmFjcXVpcmUoQXBwaXVtRHJpdmVyLm5hbWUsICgpID0+IHRoaXMuc2Vzc2lvbnMpO1xuICAgIHJldHVybiBfLnRvUGFpcnMoc2Vzc2lvbnMpXG4gICAgICAubWFwKChbaWQsIGRyaXZlcl0pID0+IHtcbiAgICAgICAgcmV0dXJuIHtpZCwgY2FwYWJpbGl0aWVzOiBkcml2ZXIuY2Fwc307XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaW50TmV3U2Vzc2lvbkFubm91bmNlbWVudCAoY2FwcywgZHJpdmVyTmFtZSwgZHJpdmVyVmVyc2lvbikge1xuICAgIGNvbnN0IGludHJvU3RyaW5nID0gZHJpdmVyVmVyc2lvblxuICAgICAgPyBgQXBwaXVtIHYke0FQUElVTV9WRVJ9IGNyZWF0aW5nIG5ldyAke2RyaXZlck5hbWV9ICh2JHtkcml2ZXJWZXJzaW9ufSkgc2Vzc2lvbmBcbiAgICAgIDogYEFwcGl1bSB2JHtBUFBJVU1fVkVSfSBjcmVhdGluZyBuZXcgJHtkcml2ZXJOYW1lfSBzZXNzaW9uYDtcbiAgICBsb2cuaW5mbyhpbnRyb1N0cmluZyk7XG4gICAgbG9nLmluZm8oJ0NhcGFiaWxpdGllczonKTtcbiAgICBpbnNwZWN0T2JqZWN0KGNhcHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBzZXNzaW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBqc29ud3BDYXBzIEpTT05XUCBmb3JtYXR0ZWQgZGVzaXJlZCBjYXBhYmlsaXRpZXNcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlcUNhcHMgUmVxdWlyZWQgY2FwYWJpbGl0aWVzIChKU09OV1Agc3RhbmRhcmQpXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB3M2NDYXBhYmlsaXRpZXMgVzNDIGNhcGFiaWxpdGllc1xuICAgKiBAcmV0dXJuIHtBcnJheX0gVW5pcXVlIHNlc3Npb24gSUQgYW5kIGNhcGFiaWxpdGllc1xuICAgKi9cbiAgYXN5bmMgY3JlYXRlU2Vzc2lvbiAoanNvbndwQ2FwcywgcmVxQ2FwcywgdzNjQ2FwYWJpbGl0aWVzKSB7XG4gICAgY29uc3QgZGVmYXVsdENhcGFiaWxpdGllcyA9IF8uY2xvbmVEZWVwKHRoaXMuYXJncy5kZWZhdWx0Q2FwYWJpbGl0aWVzKTtcbiAgICBjb25zdCBkZWZhdWx0U2V0dGluZ3MgPSBwdWxsU2V0dGluZ3MoZGVmYXVsdENhcGFiaWxpdGllcyk7XG4gICAganNvbndwQ2FwcyA9IF8uY2xvbmVEZWVwKGpzb253cENhcHMpO1xuICAgIGNvbnN0IGp3cFNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdFNldHRpbmdzLCBwdWxsU2V0dGluZ3MoanNvbndwQ2FwcykpO1xuICAgIHczY0NhcGFiaWxpdGllcyA9IF8uY2xvbmVEZWVwKHczY0NhcGFiaWxpdGllcyk7XG4gICAgLy8gSXQgaXMgcG9zc2libGUgdGhhdCB0aGUgY2xpZW50IG9ubHkgcHJvdmlkZXMgY2FwcyB1c2luZyBKU09OV1Agc3RhbmRhcmQsXG4gICAgLy8gYWx0aG91Z2ggZmlyc3RNYXRjaC9hbHdheXNNYXRjaCBwcm9wZXJ0aWVzIGFyZSBzdGlsbCBwcmVzZW50LlxuICAgIC8vIEluIHN1Y2ggY2FzZSB3ZSBhc3N1bWUgdGhlIGNsaWVudCB1bmRlcnN0YW5kcyBXM0MgcHJvdG9jb2wgYW5kIG1lcmdlIHRoZSBnaXZlblxuICAgIC8vIEpTT05XUCBjYXBzIHRvIFczQyBjYXBzXG4gICAgY29uc3QgdzNjU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBqd3BTZXR0aW5ncyk7XG4gICAgT2JqZWN0LmFzc2lnbih3M2NTZXR0aW5ncywgcHVsbFNldHRpbmdzKCh3M2NDYXBhYmlsaXRpZXMgfHwge30pLmFsd2F5c01hdGNoIHx8IHt9KSk7XG4gICAgZm9yIChjb25zdCBmaXJzdE1hdGNoRW50cnkgb2YgKCh3M2NDYXBhYmlsaXRpZXMgfHwge30pLmZpcnN0TWF0Y2ggfHwgW10pKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHczY1NldHRpbmdzLCBwdWxsU2V0dGluZ3MoZmlyc3RNYXRjaEVudHJ5KSk7XG4gICAgfVxuXG4gICAgbGV0IHByb3RvY29sO1xuICAgIGxldCBpbm5lclNlc3Npb25JZCwgZENhcHM7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFBhcnNlIHRoZSBjYXBzIGludG8gYSBmb3JtYXQgdGhhdCB0aGUgSW5uZXJEcml2ZXIgd2lsbCBhY2NlcHRcbiAgICAgIGNvbnN0IHBhcnNlZENhcHMgPSBwYXJzZUNhcHNGb3JJbm5lckRyaXZlcihcbiAgICAgICAganNvbndwQ2FwcyxcbiAgICAgICAgdzNjQ2FwYWJpbGl0aWVzLFxuICAgICAgICB0aGlzLmRlc2lyZWRDYXBDb25zdHJhaW50cyxcbiAgICAgICAgZGVmYXVsdENhcGFiaWxpdGllc1xuICAgICAgKTtcblxuICAgICAgY29uc3Qge2Rlc2lyZWRDYXBzLCBwcm9jZXNzZWRKc29ud3BDYXBhYmlsaXRpZXMsIHByb2Nlc3NlZFczQ0NhcGFiaWxpdGllcywgZXJyb3J9ID0gcGFyc2VkQ2FwcztcbiAgICAgIHByb3RvY29sID0gcGFyc2VkQ2Fwcy5wcm90b2NvbDtcblxuICAgICAgLy8gSWYgdGhlIHBhcnNpbmcgb2YgdGhlIGNhcHMgcHJvZHVjZWQgYW4gZXJyb3IsIHRocm93IGl0IGluIGhlcmVcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge2RyaXZlcjogSW5uZXJEcml2ZXIsIHZlcnNpb246IGRyaXZlclZlcnNpb259ID0gdGhpcy5nZXREcml2ZXJBbmRWZXJzaW9uRm9yQ2FwcyhkZXNpcmVkQ2Fwcyk7XG4gICAgICB0aGlzLnByaW50TmV3U2Vzc2lvbkFubm91bmNlbWVudChkZXNpcmVkQ2FwcywgSW5uZXJEcml2ZXIubmFtZSwgZHJpdmVyVmVyc2lvbik7XG5cbiAgICAgIGlmICh0aGlzLmFyZ3Muc2Vzc2lvbk92ZXJyaWRlKSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb25JZHNUb0RlbGV0ZSA9IGF3YWl0IHNlc3Npb25zTGlzdEd1YXJkLmFjcXVpcmUoQXBwaXVtRHJpdmVyLm5hbWUsICgpID0+IF8ua2V5cyh0aGlzLnNlc3Npb25zKSk7XG4gICAgICAgIGlmIChzZXNzaW9uSWRzVG9EZWxldGUubGVuZ3RoKSB7XG4gICAgICAgICAgbG9nLmluZm8oYFNlc3Npb24gb3ZlcnJpZGUgaXMgb24uIERlbGV0aW5nIG90aGVyICR7c2Vzc2lvbklkc1RvRGVsZXRlLmxlbmd0aH0gYWN0aXZlIHNlc3Npb24ke3Nlc3Npb25JZHNUb0RlbGV0ZS5sZW5ndGggPyAnJyA6ICdzJ30uYCk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IEIubWFwKHNlc3Npb25JZHNUb0RlbGV0ZSwgKGlkKSA9PiB0aGlzLmRlbGV0ZVNlc3Npb24oaWQpKTtcbiAgICAgICAgICB9IGNhdGNoIChpZ24pIHt9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbGV0IHJ1bm5pbmdEcml2ZXJzRGF0YSwgb3RoZXJQZW5kaW5nRHJpdmVyc0RhdGE7XG4gICAgICBjb25zdCBkID0gbmV3IElubmVyRHJpdmVyKHRoaXMuYXJncyk7XG4gICAgICBpZiAodGhpcy5hcmdzLnJlbGF4ZWRTZWN1cml0eUVuYWJsZWQpIHtcbiAgICAgICAgbG9nLmluZm8oYEFwcGx5aW5nIHJlbGF4ZWQgc2VjdXJpdHkgdG8gJyR7SW5uZXJEcml2ZXIubmFtZX0nIGFzIHBlciBzZXJ2ZXIgY29tbWFuZCBsaW5lIGFyZ3VtZW50YCk7XG4gICAgICAgIGQucmVsYXhlZFNlY3VyaXR5RW5hYmxlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGFzc2lnbm1lbnQgaXMgcmVxdWlyZWQgZm9yIGNvcnJlY3Qgd2ViIHNvY2tldHMgZnVuY3Rpb25hbGl0eSBpbnNpZGUgdGhlIGRyaXZlclxuICAgICAgZC5zZXJ2ZXIgPSB0aGlzLnNlcnZlcjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJ1bm5pbmdEcml2ZXJzRGF0YSA9IGF3YWl0IHRoaXMuY3VyU2Vzc2lvbkRhdGFGb3JEcml2ZXIoSW5uZXJEcml2ZXIpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgZXJyb3JzLlNlc3Npb25Ob3RDcmVhdGVkRXJyb3IoZS5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHBlbmRpbmdEcml2ZXJzR3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4ge1xuICAgICAgICB0aGlzLnBlbmRpbmdEcml2ZXJzW0lubmVyRHJpdmVyLm5hbWVdID0gdGhpcy5wZW5kaW5nRHJpdmVyc1tJbm5lckRyaXZlci5uYW1lXSB8fCBbXTtcbiAgICAgICAgb3RoZXJQZW5kaW5nRHJpdmVyc0RhdGEgPSB0aGlzLnBlbmRpbmdEcml2ZXJzW0lubmVyRHJpdmVyLm5hbWVdLm1hcCgoZHJ2KSA9PiBkcnYuZHJpdmVyRGF0YSk7XG4gICAgICAgIHRoaXMucGVuZGluZ0RyaXZlcnNbSW5uZXJEcml2ZXIubmFtZV0ucHVzaChkKTtcbiAgICAgIH0pO1xuXG4gICAgICB0cnkge1xuICAgICAgICBbaW5uZXJTZXNzaW9uSWQsIGRDYXBzXSA9IGF3YWl0IGQuY3JlYXRlU2Vzc2lvbihcbiAgICAgICAgICBwcm9jZXNzZWRKc29ud3BDYXBhYmlsaXRpZXMsXG4gICAgICAgICAgcmVxQ2FwcyxcbiAgICAgICAgICBwcm9jZXNzZWRXM0NDYXBhYmlsaXRpZXMsXG4gICAgICAgICAgWy4uLnJ1bm5pbmdEcml2ZXJzRGF0YSwgLi4ub3RoZXJQZW5kaW5nRHJpdmVyc0RhdGFdXG4gICAgICAgICk7XG4gICAgICAgIHByb3RvY29sID0gZC5wcm90b2NvbDtcbiAgICAgICAgYXdhaXQgc2Vzc2lvbnNMaXN0R3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbaW5uZXJTZXNzaW9uSWRdID0gZDtcbiAgICAgICAgfSk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBhd2FpdCBwZW5kaW5nRHJpdmVyc0d1YXJkLmFjcXVpcmUoQXBwaXVtRHJpdmVyLm5hbWUsICgpID0+IHtcbiAgICAgICAgICBfLnB1bGwodGhpcy5wZW5kaW5nRHJpdmVyc1tJbm5lckRyaXZlci5uYW1lXSwgZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyB0aGlzIGlzIGFuIGFzeW5jIGZ1bmN0aW9uIGJ1dCB3ZSBkb24ndCBhd2FpdCBpdCBiZWNhdXNlIGl0IGhhbmRsZXNcbiAgICAgIC8vIGFuIG91dC1vZi1iYW5kIHByb21pc2Ugd2hpY2ggaXMgZnVsZmlsbGVkIGlmIHRoZSBpbm5lciBkcml2ZXJcbiAgICAgIC8vIHVuZXhwZWN0ZWRseSBzaHV0cyBkb3duXG4gICAgICB0aGlzLmF0dGFjaFVuZXhwZWN0ZWRTaHV0ZG93bkhhbmRsZXIoZCwgaW5uZXJTZXNzaW9uSWQpO1xuXG4gICAgICBsb2cuaW5mbyhgTmV3ICR7SW5uZXJEcml2ZXIubmFtZX0gc2Vzc2lvbiBjcmVhdGVkIHN1Y2Nlc3NmdWxseSwgc2Vzc2lvbiBgICtcbiAgICAgICAgICAgICAgYCR7aW5uZXJTZXNzaW9uSWR9IGFkZGVkIHRvIG1hc3RlciBzZXNzaW9uIGxpc3RgKTtcblxuICAgICAgLy8gc2V0IHRoZSBOZXcgQ29tbWFuZCBUaW1lb3V0IGZvciB0aGUgaW5uZXIgZHJpdmVyXG4gICAgICBkLnN0YXJ0TmV3Q29tbWFuZFRpbWVvdXQoKTtcblxuICAgICAgLy8gYXBwbHkgaW5pdGlhbCB2YWx1ZXMgdG8gQXBwaXVtIHNldHRpbmdzIChpZiBwcm92aWRlZClcbiAgICAgIGlmIChkLmlzVzNDUHJvdG9jb2woKSAmJiAhXy5pc0VtcHR5KHczY1NldHRpbmdzKSkge1xuICAgICAgICBsb2cuaW5mbyhgQXBwbHlpbmcgdGhlIGluaXRpYWwgdmFsdWVzIHRvIEFwcGl1bSBzZXR0aW5ncyBwYXJzZWQgZnJvbSBXM0MgY2FwczogYCArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkodzNjU2V0dGluZ3MpKTtcbiAgICAgICAgYXdhaXQgZC51cGRhdGVTZXR0aW5ncyh3M2NTZXR0aW5ncyk7XG4gICAgICB9IGVsc2UgaWYgKGQuaXNNanNvbndwUHJvdG9jb2woKSAmJiAhXy5pc0VtcHR5KGp3cFNldHRpbmdzKSkge1xuICAgICAgICBsb2cuaW5mbyhgQXBwbHlpbmcgdGhlIGluaXRpYWwgdmFsdWVzIHRvIEFwcGl1bSBzZXR0aW5ncyBwYXJzZWQgZnJvbSBNSlNPTldQIGNhcHM6IGAgK1xuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGp3cFNldHRpbmdzKSk7XG4gICAgICAgIGF3YWl0IGQudXBkYXRlU2V0dGluZ3MoandwU2V0dGluZ3MpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwcm90b2NvbCxcbiAgICAgICAgZXJyb3IsXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwcm90b2NvbCxcbiAgICAgIHZhbHVlOiBbaW5uZXJTZXNzaW9uSWQsIGRDYXBzLCBwcm90b2NvbF1cbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgYXR0YWNoVW5leHBlY3RlZFNodXRkb3duSGFuZGxlciAoZHJpdmVyLCBpbm5lclNlc3Npb25JZCkge1xuICAgIC8vIFJlbW92ZSB0aGUgc2Vzc2lvbiBvbiB1bmV4cGVjdGVkIHNodXRkb3duLCBzbyB0aGF0IHdlIGFyZSBpbiBhIHBvc2l0aW9uXG4gICAgLy8gdG8gb3BlbiBhbm90aGVyIHNlc3Npb24gbGF0ZXIgb24uXG4gICAgLy8gVE9ETzogdGhpcyBzaG91bGQgYmUgcmVtb3ZlZCBhbmQgcmVwbGFjZWQgYnkgYSBvblNodXRkb3duIGNhbGxiYWNrLlxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBkcml2ZXIub25VbmV4cGVjdGVkU2h1dGRvd247IC8vIHRoaXMgaXMgYSBjYW5jZWxsYWJsZSBwcm9taXNlXG4gICAgICAvLyBpZiB3ZSBnZXQgaGVyZSwgd2UndmUgaGFkIGFuIHVuZXhwZWN0ZWQgc2h1dGRvd24sIHNvIGVycm9yXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc2h1dGRvd24nKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIEIuQ2FuY2VsbGF0aW9uRXJyb3IpIHtcbiAgICAgICAgLy8gaWYgd2UgY2FuY2VsbGVkIHRoZSB1bmV4cGVjdGVkIHNodXRkb3duIHByb21pc2UsIHRoYXQgbWVhbnMgd2VcbiAgICAgICAgLy8gbm8gbG9uZ2VyIGNhcmUgYWJvdXQgaXQsIGFuZCBjYW4gc2FmZWx5IGlnbm9yZSBpdFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsb2cud2FybihgQ2xvc2luZyBzZXNzaW9uLCBjYXVzZSB3YXMgJyR7ZS5tZXNzYWdlfSdgKTtcbiAgICAgIGxvZy5pbmZvKGBSZW1vdmluZyBzZXNzaW9uICR7aW5uZXJTZXNzaW9uSWR9IGZyb20gb3VyIG1hc3RlciBzZXNzaW9uIGxpc3RgKTtcbiAgICAgIGF3YWl0IHNlc3Npb25zTGlzdEd1YXJkLmFjcXVpcmUoQXBwaXVtRHJpdmVyLm5hbWUsICgpID0+IHtcbiAgICAgICAgZGVsZXRlIHRoaXMuc2Vzc2lvbnNbaW5uZXJTZXNzaW9uSWRdO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3VyU2Vzc2lvbkRhdGFGb3JEcml2ZXIgKElubmVyRHJpdmVyKSB7XG4gICAgY29uc3Qgc2Vzc2lvbnMgPSBhd2FpdCBzZXNzaW9uc0xpc3RHdWFyZC5hY3F1aXJlKEFwcGl1bURyaXZlci5uYW1lLCAoKSA9PiB0aGlzLnNlc3Npb25zKTtcbiAgICBjb25zdCBkYXRhID0gXy52YWx1ZXMoc2Vzc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgLmZpbHRlcigocykgPT4gcy5jb25zdHJ1Y3Rvci5uYW1lID09PSBJbm5lckRyaXZlci5uYW1lKVxuICAgICAgICAgICAgICAgICAgIC5tYXAoKHMpID0+IHMuZHJpdmVyRGF0YSk7XG4gICAgZm9yIChsZXQgZGF0dW0gb2YgZGF0YSkge1xuICAgICAgaWYgKCFkYXR1bSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb2JsZW0gZ2V0dGluZyBzZXNzaW9uIGRhdGEgZm9yIGRyaXZlciB0eXBlIGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgYCR7SW5uZXJEcml2ZXIubmFtZX07IGRvZXMgaXQgaW1wbGVtZW50ICdnZXQgYCArXG4gICAgICAgICAgICAgICAgICAgICAgICBgZHJpdmVyRGF0YSc/YCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU2Vzc2lvbiAoc2Vzc2lvbklkKSB7XG4gICAgbGV0IHByb3RvY29sO1xuICAgIHRyeSB7XG4gICAgICBsZXQgb3RoZXJTZXNzaW9uc0RhdGEgPSBudWxsO1xuICAgICAgbGV0IGRzdFNlc3Npb24gPSBudWxsO1xuICAgICAgYXdhaXQgc2Vzc2lvbnNMaXN0R3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuc2Vzc2lvbnNbc2Vzc2lvbklkXSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjdXJDb25zdHJ1Y3Rvck5hbWUgPSB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF0uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgb3RoZXJTZXNzaW9uc0RhdGEgPSBfLnRvUGFpcnModGhpcy5zZXNzaW9ucylcbiAgICAgICAgICAgICAgLmZpbHRlcigoW2tleSwgdmFsdWVdKSA9PiB2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lID09PSBjdXJDb25zdHJ1Y3Rvck5hbWUgJiYga2V5ICE9PSBzZXNzaW9uSWQpXG4gICAgICAgICAgICAgIC5tYXAoKFssIHZhbHVlXSkgPT4gdmFsdWUuZHJpdmVyRGF0YSk7XG4gICAgICAgIGRzdFNlc3Npb24gPSB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF07XG4gICAgICAgIHByb3RvY29sID0gZHN0U2Vzc2lvbi5wcm90b2NvbDtcbiAgICAgICAgbG9nLmluZm8oYFJlbW92aW5nIHNlc3Npb24gJHtzZXNzaW9uSWR9IGZyb20gb3VyIG1hc3RlciBzZXNzaW9uIGxpc3RgKTtcbiAgICAgICAgLy8gcmVnYXJkbGVzcyBvZiB3aGV0aGVyIHRoZSBkZWxldGVTZXNzaW9uIGNvbXBsZXRlcyBzdWNjZXNzZnVsbHkgb3Igbm90XG4gICAgICAgIC8vIG1ha2UgdGhlIHNlc3Npb24gdW5hdmFpbGFibGUsIGJlY2F1c2Ugd2hvIGtub3dzIHdoYXQgc3RhdGUgaXQgbWlnaHRcbiAgICAgICAgLy8gYmUgaW4gb3RoZXJ3aXNlXG4gICAgICAgIGRlbGV0ZSB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF07XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHByb3RvY29sLFxuICAgICAgICB2YWx1ZTogYXdhaXQgZHN0U2Vzc2lvbi5kZWxldGVTZXNzaW9uKHNlc3Npb25JZCwgb3RoZXJTZXNzaW9uc0RhdGEpLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2cuZXJyb3IoYEhhZCB0cm91YmxlIGVuZGluZyBzZXNzaW9uICR7c2Vzc2lvbklkfTogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwcm90b2NvbCxcbiAgICAgICAgZXJyb3I6IGUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGV4ZWN1dGVDb21tYW5kIChjbWQsIC4uLmFyZ3MpIHtcbiAgICAvLyBnZXRTdGF0dXMgY29tbWFuZCBzaG91bGQgbm90IGJlIHB1dCBpbnRvIHF1ZXVlLiBJZiB3ZSBkbyBpdCBhcyBwYXJ0IG9mIHN1cGVyLmV4ZWN1dGVDb21tYW5kLCBpdCB3aWxsIGJlIGFkZGVkIHRvIHF1ZXVlLlxuICAgIC8vIFRoZXJlIHdpbGwgYmUgbG90IG9mIHN0YXR1cyBjb21tYW5kcyBpbiBxdWV1ZSBkdXJpbmcgY3JlYXRlU2Vzc2lvbiBjb21tYW5kLCBhcyBjcmVhdGVTZXNzaW9uIGNhbiB0YWtlIHVwIHRvIG9yIG1vcmUgdGhhbiBhIG1pbnV0ZS5cbiAgICBpZiAoY21kID09PSAnZ2V0U3RhdHVzJykge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U3RhdHVzKCk7XG4gICAgfVxuXG4gICAgaWYgKGlzQXBwaXVtRHJpdmVyQ29tbWFuZChjbWQpKSB7XG4gICAgICByZXR1cm4gYXdhaXQgc3VwZXIuZXhlY3V0ZUNvbW1hbmQoY21kLCAuLi5hcmdzKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXNzaW9uSWQgPSBfLmxhc3QoYXJncyk7XG4gICAgY29uc3QgZHN0U2Vzc2lvbiA9IGF3YWl0IHNlc3Npb25zTGlzdEd1YXJkLmFjcXVpcmUoQXBwaXVtRHJpdmVyLm5hbWUsICgpID0+IHRoaXMuc2Vzc2lvbnNbc2Vzc2lvbklkXSk7XG4gICAgaWYgKCFkc3RTZXNzaW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBzZXNzaW9uIHdpdGggaWQgJyR7c2Vzc2lvbklkfScgZG9lcyBub3QgZXhpc3RgKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzID0ge1xuICAgICAgcHJvdG9jb2w6IGRzdFNlc3Npb24ucHJvdG9jb2xcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIHJlcy52YWx1ZSA9IGF3YWl0IGRzdFNlc3Npb24uZXhlY3V0ZUNvbW1hbmQoY21kLCAuLi5hcmdzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXMuZXJyb3IgPSBlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJveHlBY3RpdmUgKHNlc3Npb25JZCkge1xuICAgIGNvbnN0IGRzdFNlc3Npb24gPSB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF07XG4gICAgcmV0dXJuIGRzdFNlc3Npb24gJiYgXy5pc0Z1bmN0aW9uKGRzdFNlc3Npb24ucHJveHlBY3RpdmUpICYmIGRzdFNlc3Npb24ucHJveHlBY3RpdmUoc2Vzc2lvbklkKTtcbiAgfVxuXG4gIGdldFByb3h5QXZvaWRMaXN0IChzZXNzaW9uSWQpIHtcbiAgICBjb25zdCBkc3RTZXNzaW9uID0gdGhpcy5zZXNzaW9uc1tzZXNzaW9uSWRdO1xuICAgIHJldHVybiBkc3RTZXNzaW9uID8gZHN0U2Vzc2lvbi5nZXRQcm94eUF2b2lkTGlzdCgpIDogW107XG4gIH1cblxuICBjYW5Qcm94eSAoc2Vzc2lvbklkKSB7XG4gICAgY29uc3QgZHN0U2Vzc2lvbiA9IHRoaXMuc2Vzc2lvbnNbc2Vzc2lvbklkXTtcbiAgICByZXR1cm4gZHN0U2Vzc2lvbiAmJiBkc3RTZXNzaW9uLmNhblByb3h5KHNlc3Npb25JZCk7XG4gIH1cbn1cblxuLy8gaGVscCBkZWNpZGUgd2hpY2ggY29tbWFuZHMgc2hvdWxkIGJlIHByb3hpZWQgdG8gc3ViLWRyaXZlcnMgYW5kIHdoaWNoXG4vLyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGlzLCBvdXIgdW1icmVsbGEgZHJpdmVyXG5mdW5jdGlvbiBpc0FwcGl1bURyaXZlckNvbW1hbmQgKGNtZCkge1xuICByZXR1cm4gIWlzU2Vzc2lvbkNvbW1hbmQoY21kKSB8fCBjbWQgPT09ICdkZWxldGVTZXNzaW9uJztcbn1cblxuZXhwb3J0IHsgQXBwaXVtRHJpdmVyIH07XG4iXSwiZmlsZSI6ImxpYi9hcHBpdW0uanMiLCJzb3VyY2VSb290IjoiLi4vLi4ifQ==
