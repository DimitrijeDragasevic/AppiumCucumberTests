"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RPC_RESPONSE_TIMEOUT_MS = exports.REMOTE_DEBUGGER_PORT = exports.DEBUGGER_TYPES = exports.RemoteDebugger = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _events = _interopRequireDefault(require("events"));

var _logger = _interopRequireDefault(require("./logger"));

var _appiumBaseDriver = require("appium-base-driver");

var _remoteDebuggerRpcClient = _interopRequireDefault(require("./remote-debugger-rpc-client"));

var _messageHandlers = _interopRequireDefault(require("./message-handlers"));

var _helpers = require("./helpers");

var _appiumSupport = require("appium-support");

var _lodash = _interopRequireDefault(require("lodash"));

var _bluebird = _interopRequireDefault(require("bluebird"));

const DEBUGGER_TYPES = {
  webkit: 1,
  webinspector: 2
};
exports.DEBUGGER_TYPES = DEBUGGER_TYPES;
const SELECT_APP_RETRIES = 20;
const REMOTE_DEBUGGER_PORT = 27753;
exports.REMOTE_DEBUGGER_PORT = REMOTE_DEBUGGER_PORT;
const RPC_RESPONSE_TIMEOUT_MS = 5000;
exports.RPC_RESPONSE_TIMEOUT_MS = RPC_RESPONSE_TIMEOUT_MS;
const PAGE_READY_TIMEOUT = 5000;
const RESPONSE_LOG_LENGTH = 100;
const GARBAGE_COLLECT_TIMEOUT = 5000;

class RemoteDebugger extends _events.default.EventEmitter {
  constructor(opts = {}) {
    super();
    const bundleId = opts.bundleId,
          platformVersion = opts.platformVersion,
          _opts$debuggerType = opts.debuggerType,
          debuggerType = _opts$debuggerType === void 0 ? DEBUGGER_TYPES.webinspector : _opts$debuggerType,
          _opts$useNewSafari = opts.useNewSafari,
          useNewSafari = _opts$useNewSafari === void 0 ? false : _opts$useNewSafari,
          pageLoadMs = opts.pageLoadMs,
          host = opts.host,
          _opts$port = opts.port,
          port = _opts$port === void 0 ? REMOTE_DEBUGGER_PORT : _opts$port,
          socketPath = opts.socketPath,
          _opts$pageReadyTimeou = opts.pageReadyTimeout,
          pageReadyTimeout = _opts$pageReadyTimeou === void 0 ? PAGE_READY_TIMEOUT : _opts$pageReadyTimeou,
          remoteDebugProxy = opts.remoteDebugProxy,
          _opts$garbageCollectO = opts.garbageCollectOnExecute,
          garbageCollectOnExecute = _opts$garbageCollectO === void 0 ? true : _opts$garbageCollectO;
    this.bundleId = bundleId;
    this.platformVersion = platformVersion;
    this.debuggerType = debuggerType;

    if (this.debuggerType === DEBUGGER_TYPES.webinspector) {
      this.useNewSafari = useNewSafari;
      this.pageLoadMs = pageLoadMs;

      _logger.default.debug(`useNewSafari --> ${this.useNewSafari}`);
    }

    this.garbageCollectOnExecute = garbageCollectOnExecute;
    this.host = host;
    this.port = port;
    this.socketPath = socketPath;
    this.remoteDebugProxy = remoteDebugProxy;
    this.pageReadyTimeout = pageReadyTimeout;
  }

  setup() {
    this.appDict = {};
    this.appIdKey = null;
    this.pageIdKey = null;
    this.pageLoading = false;
    this.specialCbs = {
      '_rpc_reportIdentifier:': _lodash.default.noop,
      '_rpc_forwardGetListing:': this.onPageChange.bind(this),
      '_rpc_reportConnectedApplicationList:': _lodash.default.noop,
      '_rpc_applicationConnected:': this.onAppConnect.bind(this),
      '_rpc_applicationDisconnected:': this.onAppDisconnect.bind(this),
      '_rpc_applicationUpdated:': this.onAppUpdate.bind(this),
      '_rpc_reportConnectedDriverList:': this.onReportDriverList.bind(this),
      'pageLoad': this.pageLoad.bind(this),
      'frameDetached': this.frameDetached.bind(this)
    };
    this.rpcClient = null;
  }

  teardown() {
    _logger.default.debug('Cleaning up listeners');

    this.appDict = {};
    this.appIdKey = null;
    this.pageIdKey = null;
    this.pageLoading = false;
    this.specialCbs = {};
    this.rpcClient = null;
    this.removeAllListeners(RemoteDebugger.EVENT_PAGE_CHANGE);
    this.removeAllListeners(RemoteDebugger.EVENT_DISCONNECT);
  }

  connect() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _this.setup();

      _this.rpcClient = new _remoteDebuggerRpcClient.default({
        host: _this.host,
        port: _this.port,
        socketPath: _this.socketPath,
        specialMessageHandlers: _this.specialCbs,
        messageProxy: _this.remoteDebugProxy
      });
      yield _this.rpcClient.connect();

      try {
        let appInfo = yield _this.setConnectionKey();

        _logger.default.debug('Connected to application');

        return appInfo;
      } catch (err) {
        yield _this.disconnect();
        return null;
      }
    })();
  }

  disconnect() {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      yield _this2.rpcClient.disconnect();

      _this2.emit(RemoteDebugger.EVENT_DISCONNECT, true);

      _this2.teardown();
    })();
  }

  isConnected() {
    return !!(this.rpcClient && this.rpcClient.isConnected());
  }

  logApplicationDictionary(apps) {
    function getValueString(key, value) {
      if (_lodash.default.isFunction(value)) {
        return '[Function]';
      }

      if (key === 'pageDict' && !_lodash.default.isArray(value)) {
        return '"Waiting for data"';
      }

      return JSON.stringify(value);
    }

    _logger.default.debug('Current applications available:');

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _lodash.default.toPairs(apps)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        let _step$value = (0, _slicedToArray2.default)(_step.value, 2),
            app = _step$value[0],
            info = _step$value[1];

        _logger.default.debug(`    Application: '${app}'`);

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = _lodash.default.toPairs(info)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            let _step2$value = (0, _slicedToArray2.default)(_step2.value, 2),
                key = _step2$value[0],
                value = _step2$value[1];

            let valueString = getValueString(key, value);

            _logger.default.debug(`        ${key}: ${valueString}`);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return != null) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }

  setConnectionKey() {
    var _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      return yield new _bluebird.default((resolve, reject) => {
        let connectCb = apps => {
          if (_lodash.default.isUndefined(apps) || _lodash.default.keys(apps).length === 0) {
            _logger.default.debug('Received no apps from remote debugger. Unable to connect.');

            return resolve(_this3.appDict);
          }

          let newDict = {};
          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = _lodash.default.values(apps)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              let dict = _step3.value;

              let _appInfoFromDict = (0, _helpers.appInfoFromDict)(dict),
                  _appInfoFromDict2 = (0, _slicedToArray2.default)(_appInfoFromDict, 2),
                  id = _appInfoFromDict2[0],
                  entry = _appInfoFromDict2[1];

              newDict[id] = entry;
            }
          } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
                _iterator3.return();
              }
            } finally {
              if (_didIteratorError3) {
                throw _iteratorError3;
              }
            }
          }

          _lodash.default.defaults(_this3.appDict, newDict);

          resolve(newDict);
        };

        _this3.rpcClient.setSpecialMessageHandler('_rpc_reportConnectedApplicationList:', reject, connectCb);

        _logger.default.debug('Sending connection key request');

        return (0, _asyncToGenerator2.default)(function* () {
          let _ref2 = yield _this3.rpcClient.send('setConnectionKey'),
              _ref3 = (0, _slicedToArray2.default)(_ref2, 3),
              simNameKey = _ref3[0],
              simBuildKey = _ref3[1],
              simPlatformVersion = _ref3[2];

          _logger.default.debug(`Sim name: ${simNameKey}`);

          _logger.default.debug(`Sim build: ${simBuildKey}`);

          _logger.default.debug(`Sim platform version: ${simPlatformVersion}`);
        })();
      });
    })();
  }

  updateAppsWithDict(dict) {
    this.appDict = this.appDict || {};

    let _appInfoFromDict3 = (0, _helpers.appInfoFromDict)(dict),
        _appInfoFromDict4 = (0, _slicedToArray2.default)(_appInfoFromDict3, 2),
        id = _appInfoFromDict4[0],
        entry = _appInfoFromDict4[1];

    if (this.appDict[id]) {
      entry.pageDict = this.appDict[id].pageDict;
    }

    this.appDict[id] = entry;

    if (_lodash.default.isUndefined(entry.pageDict)) {
      entry.pageDict = (0, _helpers.deferredPromise)();
    }

    if (!this.appIdKey) {
      this.appIdKey = (0, _helpers.getDebuggerAppKey)(this.bundleId, this.platformVersion, this.appDict);
    }
  }

  selectApp(currentUrl = null, maxTries = SELECT_APP_RETRIES, ignoreAboutBlankUrl = false) {
    var _this4 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Selecting application');

      if (!_this4.appDict || _lodash.default.keys(_this4.appDict).length === 0) {
        _logger.default.debug('No applications currently connected.');

        return [];
      }

      let pageDict, appIdKey;

      appLoop: for (let i = 0; i < maxTries; i++) {
        _this4.logApplicationDictionary(_this4.appDict);

        let possibleAppIds = (0, _helpers.getPossibleDebuggerAppKeys)(_this4.bundleId, _this4.platformVersion, _this4.appDict);

        _logger.default.debug(`Trying out the possible app ids: ${possibleAppIds.join(', ')}`);

        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = possibleAppIds[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            let attemptedAppIdKey = _step4.value;

            try {
              _logger.default.debug(`Selecting app ${attemptedAppIdKey} (try #${i + 1} of ${maxTries})`);

              var _ref4 = yield _this4.rpcClient.selectApp(attemptedAppIdKey, _this4.onAppConnect.bind(_this4));

              var _ref5 = (0, _slicedToArray2.default)(_ref4, 2);

              appIdKey = _ref5[0];
              pageDict = _ref5[1];

              if (_lodash.default.isEmpty(pageDict)) {
                _logger.default.debug('Empty page dictionary received. Trying again.');

                continue;
              }

              _this4.appDict[appIdKey].pageDict = (0, _helpers.pageArrayFromDict)(pageDict);
              let found = false;
              var _iteratorNormalCompletion5 = true;
              var _didIteratorError5 = false;
              var _iteratorError5 = undefined;

              try {
                dictLoop: for (var _iterator5 = _lodash.default.values(_this4.appDict)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                  const appDict = _step5.value;
                  if (found) break;

                  if (!appDict || !appDict.pageDict) {
                    continue;
                  }

                  if (appDict.pageDict.promise) {
                    try {
                      yield _bluebird.default.resolve(appDict.pageDict.promise).timeout(10000);
                    } catch (err) {
                      if (!(err instanceof _bluebird.default.TimeoutError)) {
                        throw err;
                      }

                      continue;
                    }
                  }

                  var _iteratorNormalCompletion6 = true;
                  var _didIteratorError6 = false;
                  var _iteratorError6 = undefined;

                  try {
                    for (var _iterator6 = (appDict.pageDict || [])[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                      const dict = _step6.value;

                      if ((!ignoreAboutBlankUrl || dict.url !== 'about:blank') && (!currentUrl || dict.url === currentUrl)) {
                        appIdKey = appDict.id;
                        pageDict = dict;
                        found = true;
                        break dictLoop;
                      }
                    }
                  } catch (err) {
                    _didIteratorError6 = true;
                    _iteratorError6 = err;
                  } finally {
                    try {
                      if (!_iteratorNormalCompletion6 && _iterator6.return != null) {
                        _iterator6.return();
                      }
                    } finally {
                      if (_didIteratorError6) {
                        throw _iteratorError6;
                      }
                    }
                  }
                }
              } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion5 && _iterator5.return != null) {
                    _iterator5.return();
                  }
                } finally {
                  if (_didIteratorError5) {
                    throw _iteratorError5;
                  }
                }
              }

              if (!found) {
                if (currentUrl) {
                  _logger.default.debug(`Received app, but expected url ('${currentUrl}') was not found. Trying again.`);
                } else {
                  _logger.default.debug('Received app, but no match was found. Trying again.');
                }

                pageDict = null;
                continue;
              }

              break appLoop;
            } catch (err) {
              _logger.default.debug(`Error checking application: '${err.message}'. Retrying connection`);
            }
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return != null) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }
      }

      if (!pageDict) {
        _logger.default.errorAndThrow(`Could not connect to a valid app after ${maxTries} tries.`);
      }

      if (_this4.appIdKey !== appIdKey) {
        _logger.default.debug(`Received altered app id, updating from '${_this4.appIdKey}' to '${appIdKey}'`);

        _this4.appIdKey = appIdKey;
      }

      const pagePromises = Object.values(_this4.appDict).filter(app => !!app.pageDict && !!app.pageDict.promise).map(app => app.pageDict.promise);

      if (pagePromises.length) {
        _logger.default.debug(`Waiting for ${pagePromises.length} pages to be fulfilled`);

        yield _bluebird.default.any([_bluebird.default.delay(30000), _bluebird.default.all(pagePromises)]);
      }

      let pageArray = (0, _helpers.pageArrayFromDict)(pageDict);

      _logger.default.debug(`Finally selecting app ${_this4.appIdKey}: ${(0, _helpers.simpleStringify)(pageArray)}`);

      let fullPageArray = [];
      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = _lodash.default.toPairs(_this4.appDict)[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          let _step7$value = (0, _slicedToArray2.default)(_step7.value, 2),
              app = _step7$value[0],
              info = _step7$value[1];

          if (!_lodash.default.isArray(info.pageDict)) continue;
          let id = app.replace('PID:', '');
          var _iteratorNormalCompletion8 = true;
          var _didIteratorError8 = false;
          var _iteratorError8 = undefined;

          try {
            for (var _iterator8 = info.pageDict[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
              let page = _step8.value;

              if (page.url && (!ignoreAboutBlankUrl || page.url !== 'about:blank') && (!currentUrl || page.url === currentUrl)) {
                let pageDict = _lodash.default.clone(page);

                pageDict.id = `${id}.${pageDict.id}`;
                fullPageArray.push(pageDict);
              }
            }
          } catch (err) {
            _didIteratorError8 = true;
            _iteratorError8 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion8 && _iterator8.return != null) {
                _iterator8.return();
              }
            } finally {
              if (_didIteratorError8) {
                throw _iteratorError8;
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion7 && _iterator7.return != null) {
            _iterator7.return();
          }
        } finally {
          if (_didIteratorError7) {
            throw _iteratorError7;
          }
        }
      }

      return fullPageArray;
    })();
  }

  selectPage(appIdKey, pageIdKey, skipReadyCheck = false) {
    var _this5 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _this5.appIdKey = `PID:${appIdKey}`;
      _this5.pageIdKey = pageIdKey;

      _logger.default.debug(`Selecting page '${pageIdKey}' on app '${_this5.appIdKey}' and forwarding socket setup`);

      yield _this5.rpcClient.send('setSenderKey', {
        appIdKey: _this5.appIdKey,
        pageIdKey: _this5.pageIdKey
      });

      _logger.default.debug('Sender key set');

      yield _this5.rpcClient.send('enablePage', {
        appIdKey: _this5.appIdKey,
        pageIdKey: _this5.pageIdKey,
        debuggerType: _this5.debuggerType
      });

      _logger.default.debug('Enabled activity on page');

      let ready = yield _this5.checkPageIsReady();

      if (!skipReadyCheck && !ready) {
        yield _this5.pageUnload();
      }
    })();
  }

  executeAtom(atom, args, frames) {
    var _this6 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (!_this6.rpcClient.connected) throw new Error('Remote debugger is not connected');
      let script = yield (0, _helpers.getScriptForAtom)(atom, args, frames);
      let value = yield _this6.execute(script, true);

      _logger.default.debug(`Received result for atom '${atom}' execution: ${_lodash.default.truncate((0, _helpers.simpleStringify)(value), {
        length: RESPONSE_LOG_LENGTH
      })}`);

      return value;
    })();
  }

  executeAtomAsync(atom, args, frames, responseUrl) {
    var _this7 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let asyncCallBack = `function (res) { xmlHttp = new XMLHttpRequest(); ` + `xmlHttp.open('POST', '${responseUrl}', true);` + `xmlHttp.setRequestHeader('Content-type','application/json'); ` + `xmlHttp.send(res); }`;
      let script = yield (0, _helpers.getScriptForAtom)(atom, args, frames, asyncCallBack);
      yield _this7.execute(script);
    })();
  }

  frameDetached() {
    this.emit(RemoteDebugger.EVENT_FRAMES_DETACHED);
  }

  pageLoad(startPageLoadMs, pageLoadVerifyHook) {
    var _this8 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let timeoutMs = 500;
      let start = startPageLoadMs || Date.now();

      _logger.default.debug('Page loaded, verifying whether ready');

      let verify = function () {
        var _ref6 = (0, _asyncToGenerator2.default)(function* () {
          _this8.pageLoadDelay = _appiumSupport.util.cancellableDelay(timeoutMs);

          try {
            yield _this8.pageLoadDelay;
          } catch (err) {
            if (err instanceof _bluebird.default.CancellationError) {
              return;
            }
          }

          if (!_this8.appIdKey) {
            _logger.default.debug('Not connected to an application. Ignoring page load');

            return;
          }

          if (_lodash.default.isFunction(pageLoadVerifyHook)) {
            yield pageLoadVerifyHook();
          }

          let ready = yield _this8.checkPageIsReady();

          if (ready || _this8.pageLoadMs > 0 && start + _this8.pageLoadMs < Date.now()) {
            _logger.default.debug('Page is ready');

            _this8.pageLoading = false;
          } else {
            _logger.default.debug('Page was not ready, retrying');

            yield verify();
          }
        });

        return function verify() {
          return _ref6.apply(this, arguments);
        };
      }();

      yield verify();
    })();
  }

  cancelPageLoad() {
    _logger.default.debug('Unregistering from page readiness notifications');

    this.pageLoading = false;

    if (this.pageLoadDelay) {
      this.pageLoadDelay.cancel();
    }
  }

  pageUnload() {
    var _this9 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Page unloading');

      _this9.pageLoading = true;
      yield _this9.waitForDom();
    })();
  }

  waitForDom(startPageLoadMs, pageLoadVerifyHook) {
    var _this10 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Waiting for dom...');

      yield _this10.pageLoad(startPageLoadMs, pageLoadVerifyHook);
    })();
  }

  checkPageIsReady() {
    var _this11 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let errors = (0, _helpers.checkParams)({
        appIdKey: _this11.appIdKey
      });
      if (errors) throw new Error(errors);

      _logger.default.debug('Checking document readyState');

      const readyCmd = '(function (){ return document.readyState; })()';
      let readyState = 'loading';

      try {
        readyState = yield _bluebird.default.resolve(_this11.execute(readyCmd, true)).timeout(_this11.pageReadyTimeout);
      } catch (err) {
        if (!(err instanceof _bluebird.default.TimeoutError)) {
          throw err;
        }

        _logger.default.debug(`Page readiness check timed out after ${_this11.pageReadyTimeout}ms`);

        return false;
      }

      _logger.default.debug(`readyState was ${(0, _helpers.simpleStringify)(readyState)}`);

      return readyState === 'complete';
    })();
  }

  navToUrl(url, pageLoadVerifyHook) {
    var _this12 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this12.debuggerType === DEBUGGER_TYPES.webinspector) {
        let errors = (0, _helpers.checkParams)({
          appIdKey: _this12.appIdKey,
          pageIdKey: _this12.pageIdKey
        });
        if (errors) throw new Error(errors);
      }

      _logger.default.debug(`Navigating to new URL: ${url}`);

      yield _this12.rpcClient.send('setUrl', {
        url,
        appIdKey: _this12.appIdKey,
        pageIdKey: _this12.pageIdKey,
        debuggerType: _this12.debuggerType
      });

      if (!_this12.useNewSafari) {
        yield _bluebird.default.delay(1000);
      }

      if (_this12.debuggerType === DEBUGGER_TYPES.webinspector) {
        yield _this12.waitForFrameNavigated();
      }

      yield _this12.waitForDom(Date.now(), pageLoadVerifyHook);
    })();
  }

  waitForFrameNavigated() {
    var _this13 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      return yield new _bluebird.default(function () {
        var _ref7 = (0, _asyncToGenerator2.default)(function* (resolve, reject) {
          _logger.default.debug('Waiting for frame navigated message...');

          let startMs = Date.now();

          let navEventListener = value => {
            _logger.default.debug(`Frame navigated in ${(Date.now() - startMs) / 1000} sec from source: ${value}`);

            if (_this13.navigationDelay) {
              _this13.navigationDelay.cancel();
            }

            resolve(value);
          };

          _this13.rpcClient.setSpecialMessageHandler('Page.frameNavigated', reject, navEventListener);

          if (!_this13.useNewSafari || _this13.pageLoadMs >= 0) {
            let timeout = _this13.useNewSafari ? _this13.pageLoadMs : 500;
            _this13.navigationDelay = _appiumSupport.util.cancellableDelay(timeout);

            try {
              yield _this13.navigationDelay;
              navEventListener('timeout');
            } catch (err) {}
          }
        });

        return function (_x, _x2) {
          return _ref7.apply(this, arguments);
        };
      }());
    })();
  }

  startTimeline(fn) {
    var _this14 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Starting to record the timeline');

      _this14.rpcClient.setTimelineEventHandler(fn);

      return yield _this14.rpcClient.send('startTimeline', {
        appIdKey: _this14.appIdKey,
        pageIdKey: _this14.pageIdKey,
        debuggerType: _this14.debuggerType
      });
    })();
  }

  stopTimeline() {
    var _this15 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Stopping to record the timeline');

      yield _this15.rpcClient.send('stopTimeline', {
        appIdKey: _this15.appIdKey,
        pageIdKey: _this15.pageIdKey,
        debuggerType: _this15.debuggerType
      });
    })();
  }

  startConsole(fn) {
    var _this16 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Starting to listen for JavaScript console');

      _this16.rpcClient.setConsoleLogEventHandler(fn);

      return yield _this16.rpcClient.send('startConsole', {
        appIdKey: _this16.appIdKey,
        pageIdKey: _this16.pageIdKey,
        debuggerType: _this16.debuggerType
      });
    })();
  }

  stopConsole() {
    var _this17 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Stopping to listen for JavaScript console');

      yield _this17.rpcClient.send('stopConsole', {
        appIdKey: _this17.appIdKey,
        pageIdKey: _this17.pageIdKey,
        debuggerType: _this17.debuggerType
      });
    })();
  }

  startNetwork(fn) {
    var _this18 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Starting to listen for network events');

      _this18.rpcClient.setNetworkLogEventHandler(fn);

      return yield _this18.rpcClient.send('startNetwork', {
        appIdKey: _this18.appIdKey,
        pageIdKey: _this18.pageIdKey,
        debuggerType: _this18.debuggerType
      });
    })();
  }

  stopNetwork() {
    var _this19 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Stopping to listen for network events');

      yield _this19.rpcClient.send('stopNetwork', {
        appIdKey: _this19.appIdKey,
        pageIdKey: _this19.pageIdKey,
        debuggerType: _this19.debuggerType
      });
    })();
  }

  execute(command, override) {
    var _this20 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this20.pageLoading && !override) {
        _logger.default.debug('Trying to execute but page is not loaded.');

        yield _this20.waitForDom();
      }

      if (_this20.debuggerType === DEBUGGER_TYPES.webinspector) {
        let errors = (0, _helpers.checkParams)({
          appIdKey: _this20.appIdKey,
          pageIdKey: _this20.pageIdKey
        });
        if (errors) throw new Error(errors);
      }

      if (_this20.garbageCollectOnExecute) {
        yield _this20.garbageCollect();
      }

      _logger.default.debug(`Sending javascript command ${_lodash.default.truncate(command, {
        length: 50
      })}`);

      let res = yield _this20.rpcClient.send('sendJSCommand', {
        command,
        appIdKey: _this20.appIdKey,
        pageIdKey: _this20.pageIdKey,
        debuggerType: _this20.debuggerType
      });
      return _this20.convertResult(res);
    })();
  }

  callFunction(objId, fn, args) {
    var _this21 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let errors = (0, _helpers.checkParams)({
        appIdKey: _this21.appIdKey,
        pageIdKey: _this21.pageIdKey
      });
      if (errors) throw new Error(errors);

      if (_this21.garbageCollectOnExecute) {
        yield _this21.garbageCollect();
      }

      _logger.default.debug('Calling javascript function');

      let res = yield _this21.rpcClient.send('callJSFunction', {
        objId,
        fn,
        args,
        appIdKey: _this21.appIdKey,
        pageIdKey: _this21.pageIdKey,
        debuggerType: _this21.debuggerType
      });
      return _this21.convertResult(res);
    })();
  }

  convertResult(res) {
    if (_lodash.default.isUndefined(res)) {
      throw new Error(`Did not get OK result from remote debugger. Result was: ${_lodash.default.truncate((0, _helpers.simpleStringify)(res), {
        length: RESPONSE_LOG_LENGTH
      })}`);
    } else if (_lodash.default.isString(res)) {
      try {
        res = JSON.parse(res);
      } catch (err) {}
    } else if (!_lodash.default.isObject(res)) {
      throw new Error(`Result has unexpected type: (${typeof res}).`);
    }

    if (res.status && res.status !== 0) {
      throw (0, _appiumBaseDriver.errorFromCode)(res.status, res.value.message || res.value);
    }

    return res.hasOwnProperty('value') ? res.value : res;
  }

  allowNavigationWithoutReload(allow = true) {
    if (_lodash.default.isFunction(this.rpcClient.allowNavigationWithoutReload)) {
      this.rpcClient.allowNavigationWithoutReload(allow);
    }
  }

  getCookies(urls) {
    var _this22 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug('Getting network cookies');

      return yield _this22.rpcClient.send('getCookies', {
        appIdKey: _this22.appIdKey,
        pageIdKey: _this22.pageIdKey,
        debuggerType: _this22.debuggerType,
        urls
      });
    })();
  }

  deleteCookie(cookieName, url) {
    var _this23 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug(`Deleting cookie '${cookieName}' on '${url}'`);

      return yield _this23.rpcClient.send('deleteCookie', {
        appIdKey: _this23.appIdKey,
        pageIdKey: _this23.pageIdKey,
        debuggerType: _this23.debuggerType,
        cookieName,
        url
      });
    })();
  }

  garbageCollect(timeoutMs = GARBAGE_COLLECT_TIMEOUT) {
    var _this24 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _logger.default.debug(`Garbage collecting with ${timeoutMs}ms timeout`);

      const errors = (0, _helpers.checkParams)({
        appIdKey: _this24.appIdKey,
        pageIdKey: _this24.pageIdKey
      });

      if (errors) {
        _logger.default.debug(`Unable to collect garbage at this time`);

        return;
      }

      yield _bluebird.default.resolve(_this24.rpcClient.send('garbageCollect', {
        appIdKey: _this24.appIdKey,
        pageIdKey: _this24.pageIdKey,
        debuggerType: _this24.debuggerType
      })).timeout(timeoutMs).then(function () {
        _logger.default.debug(`Garbage collection successful`);
      }).catch(function (err) {
        if (err instanceof _bluebird.default.TimeoutError) {
          _logger.default.debug(`Garbage collection timed out after ${timeoutMs}ms`);
        } else {
          _logger.default.debug(`Unable to collect garbage: ${err.message}`);
        }
      });
    })();
  }

}

exports.RemoteDebugger = RemoteDebugger;
RemoteDebugger.EVENT_PAGE_CHANGE = 'remote_debugger_page_change';
RemoteDebugger.EVENT_FRAMES_DETACHED = 'remote_debugger_frames_detached';
RemoteDebugger.EVENT_DISCONNECT = 'remote_debugger_disconnect';
var _iteratorNormalCompletion9 = true;
var _didIteratorError9 = false;
var _iteratorError9 = undefined;

try {
  for (var _iterator9 = _lodash.default.toPairs(_messageHandlers.default)[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
    let _step9$value = (0, _slicedToArray2.default)(_step9.value, 2),
        name = _step9$value[0],
        handler = _step9$value[1];

    RemoteDebugger.prototype[name] = handler;
  }
} catch (err) {
  _didIteratorError9 = true;
  _iteratorError9 = err;
} finally {
  try {
    if (!_iteratorNormalCompletion9 && _iterator9.return != null) {
      _iterator9.return();
    }
  } finally {
    if (_didIteratorError9) {
      throw _iteratorError9;
    }
  }
}require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9yZW1vdGUtZGVidWdnZXIuanMiXSwibmFtZXMiOlsiREVCVUdHRVJfVFlQRVMiLCJ3ZWJraXQiLCJ3ZWJpbnNwZWN0b3IiLCJTRUxFQ1RfQVBQX1JFVFJJRVMiLCJSRU1PVEVfREVCVUdHRVJfUE9SVCIsIlJQQ19SRVNQT05TRV9USU1FT1VUX01TIiwiUEFHRV9SRUFEWV9USU1FT1VUIiwiUkVTUE9OU0VfTE9HX0xFTkdUSCIsIkdBUkJBR0VfQ09MTEVDVF9USU1FT1VUIiwiUmVtb3RlRGVidWdnZXIiLCJldmVudHMiLCJFdmVudEVtaXR0ZXIiLCJjb25zdHJ1Y3RvciIsIm9wdHMiLCJidW5kbGVJZCIsInBsYXRmb3JtVmVyc2lvbiIsImRlYnVnZ2VyVHlwZSIsInVzZU5ld1NhZmFyaSIsInBhZ2VMb2FkTXMiLCJob3N0IiwicG9ydCIsInNvY2tldFBhdGgiLCJwYWdlUmVhZHlUaW1lb3V0IiwicmVtb3RlRGVidWdQcm94eSIsImdhcmJhZ2VDb2xsZWN0T25FeGVjdXRlIiwibG9nIiwiZGVidWciLCJzZXR1cCIsImFwcERpY3QiLCJhcHBJZEtleSIsInBhZ2VJZEtleSIsInBhZ2VMb2FkaW5nIiwic3BlY2lhbENicyIsIl8iLCJub29wIiwib25QYWdlQ2hhbmdlIiwiYmluZCIsIm9uQXBwQ29ubmVjdCIsIm9uQXBwRGlzY29ubmVjdCIsIm9uQXBwVXBkYXRlIiwib25SZXBvcnREcml2ZXJMaXN0IiwicGFnZUxvYWQiLCJmcmFtZURldGFjaGVkIiwicnBjQ2xpZW50IiwidGVhcmRvd24iLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJFVkVOVF9QQUdFX0NIQU5HRSIsIkVWRU5UX0RJU0NPTk5FQ1QiLCJjb25uZWN0IiwiUmVtb3RlRGVidWdnZXJScGNDbGllbnQiLCJzcGVjaWFsTWVzc2FnZUhhbmRsZXJzIiwibWVzc2FnZVByb3h5IiwiYXBwSW5mbyIsInNldENvbm5lY3Rpb25LZXkiLCJlcnIiLCJkaXNjb25uZWN0IiwiZW1pdCIsImlzQ29ubmVjdGVkIiwibG9nQXBwbGljYXRpb25EaWN0aW9uYXJ5IiwiYXBwcyIsImdldFZhbHVlU3RyaW5nIiwia2V5IiwidmFsdWUiLCJpc0Z1bmN0aW9uIiwiaXNBcnJheSIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0b1BhaXJzIiwiYXBwIiwiaW5mbyIsInZhbHVlU3RyaW5nIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJjb25uZWN0Q2IiLCJpc1VuZGVmaW5lZCIsImtleXMiLCJsZW5ndGgiLCJuZXdEaWN0IiwidmFsdWVzIiwiZGljdCIsImlkIiwiZW50cnkiLCJkZWZhdWx0cyIsInNldFNwZWNpYWxNZXNzYWdlSGFuZGxlciIsInNlbmQiLCJzaW1OYW1lS2V5Iiwic2ltQnVpbGRLZXkiLCJzaW1QbGF0Zm9ybVZlcnNpb24iLCJ1cGRhdGVBcHBzV2l0aERpY3QiLCJwYWdlRGljdCIsInNlbGVjdEFwcCIsImN1cnJlbnRVcmwiLCJtYXhUcmllcyIsImlnbm9yZUFib3V0QmxhbmtVcmwiLCJhcHBMb29wIiwiaSIsInBvc3NpYmxlQXBwSWRzIiwiam9pbiIsImF0dGVtcHRlZEFwcElkS2V5IiwiaXNFbXB0eSIsImZvdW5kIiwiZGljdExvb3AiLCJwcm9taXNlIiwidGltZW91dCIsIlRpbWVvdXRFcnJvciIsInVybCIsIm1lc3NhZ2UiLCJlcnJvckFuZFRocm93IiwicGFnZVByb21pc2VzIiwiT2JqZWN0IiwiZmlsdGVyIiwibWFwIiwiYW55IiwiZGVsYXkiLCJhbGwiLCJwYWdlQXJyYXkiLCJmdWxsUGFnZUFycmF5IiwicmVwbGFjZSIsInBhZ2UiLCJjbG9uZSIsInB1c2giLCJzZWxlY3RQYWdlIiwic2tpcFJlYWR5Q2hlY2siLCJyZWFkeSIsImNoZWNrUGFnZUlzUmVhZHkiLCJwYWdlVW5sb2FkIiwiZXhlY3V0ZUF0b20iLCJhdG9tIiwiYXJncyIsImZyYW1lcyIsImNvbm5lY3RlZCIsIkVycm9yIiwic2NyaXB0IiwiZXhlY3V0ZSIsInRydW5jYXRlIiwiZXhlY3V0ZUF0b21Bc3luYyIsInJlc3BvbnNlVXJsIiwiYXN5bmNDYWxsQmFjayIsIkVWRU5UX0ZSQU1FU19ERVRBQ0hFRCIsInN0YXJ0UGFnZUxvYWRNcyIsInBhZ2VMb2FkVmVyaWZ5SG9vayIsInRpbWVvdXRNcyIsInN0YXJ0IiwiRGF0ZSIsIm5vdyIsInZlcmlmeSIsInBhZ2VMb2FkRGVsYXkiLCJ1dGlsIiwiY2FuY2VsbGFibGVEZWxheSIsIkNhbmNlbGxhdGlvbkVycm9yIiwiY2FuY2VsUGFnZUxvYWQiLCJjYW5jZWwiLCJ3YWl0Rm9yRG9tIiwiZXJyb3JzIiwicmVhZHlDbWQiLCJyZWFkeVN0YXRlIiwibmF2VG9VcmwiLCJ3YWl0Rm9yRnJhbWVOYXZpZ2F0ZWQiLCJzdGFydE1zIiwibmF2RXZlbnRMaXN0ZW5lciIsIm5hdmlnYXRpb25EZWxheSIsInN0YXJ0VGltZWxpbmUiLCJmbiIsInNldFRpbWVsaW5lRXZlbnRIYW5kbGVyIiwic3RvcFRpbWVsaW5lIiwic3RhcnRDb25zb2xlIiwic2V0Q29uc29sZUxvZ0V2ZW50SGFuZGxlciIsInN0b3BDb25zb2xlIiwic3RhcnROZXR3b3JrIiwic2V0TmV0d29ya0xvZ0V2ZW50SGFuZGxlciIsInN0b3BOZXR3b3JrIiwiY29tbWFuZCIsIm92ZXJyaWRlIiwiZ2FyYmFnZUNvbGxlY3QiLCJyZXMiLCJjb252ZXJ0UmVzdWx0IiwiY2FsbEZ1bmN0aW9uIiwib2JqSWQiLCJpc1N0cmluZyIsInBhcnNlIiwiaXNPYmplY3QiLCJzdGF0dXMiLCJoYXNPd25Qcm9wZXJ0eSIsImFsbG93TmF2aWdhdGlvbldpdGhvdXRSZWxvYWQiLCJhbGxvdyIsImdldENvb2tpZXMiLCJ1cmxzIiwiZGVsZXRlQ29va2llIiwiY29va2llTmFtZSIsInRoZW4iLCJjYXRjaCIsIm1lc3NhZ2VIYW5kbGVycyIsIm5hbWUiLCJoYW5kbGVyIiwicHJvdG90eXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBR0EsTUFBTUEsY0FBYyxH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b20gJ2V2ZW50cyc7XG5pbXBvcnQgbG9nIGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7IGVycm9yRnJvbUNvZGUgfSBmcm9tICdhcHBpdW0tYmFzZS1kcml2ZXInO1xuaW1wb3J0IFJlbW90ZURlYnVnZ2VyUnBjQ2xpZW50IGZyb20gJy4vcmVtb3RlLWRlYnVnZ2VyLXJwYy1jbGllbnQnO1xuaW1wb3J0IG1lc3NhZ2VIYW5kbGVycyBmcm9tICcuL21lc3NhZ2UtaGFuZGxlcnMnO1xuaW1wb3J0IHsgYXBwSW5mb0Zyb21EaWN0LCBwYWdlQXJyYXlGcm9tRGljdCwgZ2V0RGVidWdnZXJBcHBLZXksIGdldFBvc3NpYmxlRGVidWdnZXJBcHBLZXlzLCBjaGVja1BhcmFtcyxcbiAgICAgICAgIGdldFNjcmlwdEZvckF0b20sIHNpbXBsZVN0cmluZ2lmeSwgZGVmZXJyZWRQcm9taXNlIH0gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7IHV0aWwgfSBmcm9tICdhcHBpdW0tc3VwcG9ydCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFByb21pc2UgZnJvbSAnYmx1ZWJpcmQnO1xuXG5cbmNvbnN0IERFQlVHR0VSX1RZUEVTID0ge1xuICB3ZWJraXQ6IDEsXG4gIHdlYmluc3BlY3RvcjogMlxufTtcbmNvbnN0IFNFTEVDVF9BUFBfUkVUUklFUyA9IDIwO1xuY29uc3QgUkVNT1RFX0RFQlVHR0VSX1BPUlQgPSAyNzc1MztcblxuLyogSG93IG1hbnkgbWlsbGlzZWNvbmRzIHRvIHdhaXQgZm9yIHdlYmtpdCB0byByZXR1cm4gYSByZXNwb25zZSBiZWZvcmUgdGltaW5nIG91dCAqL1xuY29uc3QgUlBDX1JFU1BPTlNFX1RJTUVPVVRfTVMgPSA1MDAwO1xuXG5jb25zdCBQQUdFX1JFQURZX1RJTUVPVVQgPSA1MDAwO1xuXG5jb25zdCBSRVNQT05TRV9MT0dfTEVOR1RIID0gMTAwO1xuXG5jb25zdCBHQVJCQUdFX0NPTExFQ1RfVElNRU9VVCA9IDUwMDA7XG5cblxuY2xhc3MgUmVtb3RlRGVidWdnZXIgZXh0ZW5kcyBldmVudHMuRXZlbnRFbWl0dGVyIHtcbiAgLypcbiAgICogVGhlIGNvbnN0cnVjdG9yIHRha2VzIGFuIG9wdHMgaGFzaCB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICogICAtIGJ1bmRsZUlkIC0gaWQgb2YgdGhlIGFwcCBiZWluZyBjb25uZWN0ZWQgdG9cbiAgICogICAtIHBsYXRmb3JtVmVyc2lvbiAtIHZlcnNpb24gb2YgaU9TXG4gICAqICAgLSBkZWJ1Z2dlclR5cGUgLSBvbmUgb2YgdGhlIERFQlVHR0VSX1RZUEVTXG4gICAqICAgLSB1c2VOZXdTYWZhcmkgLSBmb3Igd2ViIGluc3BlY3Rvciwgd2hldGhlciB0aGlzIGlzIGEgbmV3IFNhZmFyaSBpbnN0YW5jZVxuICAgKiAgIC0gcGFnZUxvYWRNcyAtIHRoZSB0aW1lLCBpbiBtcywgdGhhdCBzaG91bGQgYmUgd2FpdGVkIGZvciBwYWdlIGxvYWRpbmdcbiAgICogICAtIGhvc3QgLSB0aGUgcmVtb3RlIGRlYnVnZ2VyJ3MgaG9zdCBhZGRyZXNzXG4gICAqICAgLSBwb3J0IC0gdGhlIHJlbW90ZSBkZWJ1Z2dlciBwb3J0IHRocm91Z2ggd2hpY2ggdG8gY29tbXVuaWNhdGVcbiAgICovXG4gIGNvbnN0cnVjdG9yIChvcHRzID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgY29uc3Qge1xuICAgICAgYnVuZGxlSWQsXG4gICAgICBwbGF0Zm9ybVZlcnNpb24sXG4gICAgICBkZWJ1Z2dlclR5cGUgPSBERUJVR0dFUl9UWVBFUy53ZWJpbnNwZWN0b3IsXG4gICAgICB1c2VOZXdTYWZhcmkgPSBmYWxzZSxcbiAgICAgIHBhZ2VMb2FkTXMsXG4gICAgICBob3N0LFxuICAgICAgcG9ydCA9IFJFTU9URV9ERUJVR0dFUl9QT1JULFxuICAgICAgc29ja2V0UGF0aCxcbiAgICAgIHBhZ2VSZWFkeVRpbWVvdXQgPSBQQUdFX1JFQURZX1RJTUVPVVQsXG4gICAgICByZW1vdGVEZWJ1Z1Byb3h5LFxuICAgICAgZ2FyYmFnZUNvbGxlY3RPbkV4ZWN1dGUgPSB0cnVlLFxuICAgIH0gPSBvcHRzO1xuXG4gICAgdGhpcy5idW5kbGVJZCA9IGJ1bmRsZUlkO1xuICAgIHRoaXMucGxhdGZvcm1WZXJzaW9uID0gcGxhdGZvcm1WZXJzaW9uO1xuICAgIHRoaXMuZGVidWdnZXJUeXBlID0gZGVidWdnZXJUeXBlO1xuICAgIGlmICh0aGlzLmRlYnVnZ2VyVHlwZSA9PT0gREVCVUdHRVJfVFlQRVMud2ViaW5zcGVjdG9yKSB7XG4gICAgICB0aGlzLnVzZU5ld1NhZmFyaSA9IHVzZU5ld1NhZmFyaTtcbiAgICAgIHRoaXMucGFnZUxvYWRNcyA9IHBhZ2VMb2FkTXM7XG4gICAgICBsb2cuZGVidWcoYHVzZU5ld1NhZmFyaSAtLT4gJHt0aGlzLnVzZU5ld1NhZmFyaX1gKTtcbiAgICB9XG4gICAgdGhpcy5nYXJiYWdlQ29sbGVjdE9uRXhlY3V0ZSA9IGdhcmJhZ2VDb2xsZWN0T25FeGVjdXRlO1xuXG4gICAgdGhpcy5ob3N0ID0gaG9zdDtcbiAgICB0aGlzLnBvcnQgPSBwb3J0O1xuICAgIHRoaXMuc29ja2V0UGF0aCA9IHNvY2tldFBhdGg7XG4gICAgdGhpcy5yZW1vdGVEZWJ1Z1Byb3h5ID0gcmVtb3RlRGVidWdQcm94eTtcbiAgICB0aGlzLnBhZ2VSZWFkeVRpbWVvdXQgPSBwYWdlUmVhZHlUaW1lb3V0O1xuICB9XG5cbiAgc2V0dXAgKCkge1xuICAgIC8vIGFwcCBoYW5kbGluZyBjb25maWd1cmF0aW9uXG4gICAgdGhpcy5hcHBEaWN0ID0ge307XG4gICAgdGhpcy5hcHBJZEtleSA9IG51bGw7XG4gICAgdGhpcy5wYWdlSWRLZXkgPSBudWxsO1xuICAgIHRoaXMucGFnZUxvYWRpbmcgPSBmYWxzZTtcblxuICAgIC8vIHNldCB1cCB0aGUgc3BlY2lhbCBjYWxsYmFja3MgZm9yIGhhbmRsaW5nIHJkIGV2ZW50c1xuICAgIHRoaXMuc3BlY2lhbENicyA9IHtcbiAgICAgICdfcnBjX3JlcG9ydElkZW50aWZpZXI6JzogXy5ub29wLFxuICAgICAgJ19ycGNfZm9yd2FyZEdldExpc3Rpbmc6JzogdGhpcy5vblBhZ2VDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICdfcnBjX3JlcG9ydENvbm5lY3RlZEFwcGxpY2F0aW9uTGlzdDonOiBfLm5vb3AsXG4gICAgICAnX3JwY19hcHBsaWNhdGlvbkNvbm5lY3RlZDonOiB0aGlzLm9uQXBwQ29ubmVjdC5iaW5kKHRoaXMpLFxuICAgICAgJ19ycGNfYXBwbGljYXRpb25EaXNjb25uZWN0ZWQ6JzogdGhpcy5vbkFwcERpc2Nvbm5lY3QuYmluZCh0aGlzKSxcbiAgICAgICdfcnBjX2FwcGxpY2F0aW9uVXBkYXRlZDonOiB0aGlzLm9uQXBwVXBkYXRlLmJpbmQodGhpcyksXG4gICAgICAnX3JwY19yZXBvcnRDb25uZWN0ZWREcml2ZXJMaXN0Oic6IHRoaXMub25SZXBvcnREcml2ZXJMaXN0LmJpbmQodGhpcyksXG4gICAgICAncGFnZUxvYWQnOiB0aGlzLnBhZ2VMb2FkLmJpbmQodGhpcyksXG4gICAgICAnZnJhbWVEZXRhY2hlZCc6IHRoaXMuZnJhbWVEZXRhY2hlZC5iaW5kKHRoaXMpLFxuICAgIH07XG5cbiAgICB0aGlzLnJwY0NsaWVudCA9IG51bGw7XG4gIH1cblxuICB0ZWFyZG93biAoKSB7XG4gICAgbG9nLmRlYnVnKCdDbGVhbmluZyB1cCBsaXN0ZW5lcnMnKTtcblxuICAgIHRoaXMuYXBwRGljdCA9IHt9O1xuICAgIHRoaXMuYXBwSWRLZXkgPSBudWxsO1xuICAgIHRoaXMucGFnZUlkS2V5ID0gbnVsbDtcbiAgICB0aGlzLnBhZ2VMb2FkaW5nID0gZmFsc2U7XG5cbiAgICB0aGlzLnNwZWNpYWxDYnMgPSB7fTtcblxuICAgIHRoaXMucnBjQ2xpZW50ID0gbnVsbDtcblxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKFJlbW90ZURlYnVnZ2VyLkVWRU5UX1BBR0VfQ0hBTkdFKTtcbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhSZW1vdGVEZWJ1Z2dlci5FVkVOVF9ESVNDT05ORUNUKTtcbiAgfVxuXG4gIGFzeW5jIGNvbm5lY3QgKCkge1xuICAgIHRoaXMuc2V0dXAoKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIHJwYyBjbGllbnRcbiAgICB0aGlzLnJwY0NsaWVudCA9IG5ldyBSZW1vdGVEZWJ1Z2dlclJwY0NsaWVudCh7XG4gICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICBwb3J0OiB0aGlzLnBvcnQsXG4gICAgICBzb2NrZXRQYXRoOiB0aGlzLnNvY2tldFBhdGgsXG4gICAgICBzcGVjaWFsTWVzc2FnZUhhbmRsZXJzOiB0aGlzLnNwZWNpYWxDYnMsXG4gICAgICBtZXNzYWdlUHJveHk6IHRoaXMucmVtb3RlRGVidWdQcm94eSxcbiAgICB9KTtcbiAgICBhd2FpdCB0aGlzLnJwY0NsaWVudC5jb25uZWN0KCk7XG5cbiAgICAvLyBnZXQgdGhlIGNvbm5lY3Rpb24gaW5mb3JtYXRpb24gYWJvdXQgdGhlIGFwcFxuICAgIHRyeSB7XG4gICAgICBsZXQgYXBwSW5mbyA9IGF3YWl0IHRoaXMuc2V0Q29ubmVjdGlvbktleSgpO1xuICAgICAgbG9nLmRlYnVnKCdDb25uZWN0ZWQgdG8gYXBwbGljYXRpb24nKTtcbiAgICAgIHJldHVybiBhcHBJbmZvO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgYXdhaXQgdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkaXNjb25uZWN0ICgpIHtcbiAgICBhd2FpdCB0aGlzLnJwY0NsaWVudC5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5lbWl0KFJlbW90ZURlYnVnZ2VyLkVWRU5UX0RJU0NPTk5FQ1QsIHRydWUpO1xuICAgIHRoaXMudGVhcmRvd24oKTtcbiAgfVxuXG4gIGlzQ29ubmVjdGVkICgpIHtcbiAgICByZXR1cm4gISEodGhpcy5ycGNDbGllbnQgJiYgdGhpcy5ycGNDbGllbnQuaXNDb25uZWN0ZWQoKSk7XG4gIH1cblxuICBsb2dBcHBsaWNhdGlvbkRpY3Rpb25hcnkgKGFwcHMpIHtcbiAgICBmdW5jdGlvbiBnZXRWYWx1ZVN0cmluZyAoa2V5LCB2YWx1ZSkge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuICdbRnVuY3Rpb25dJztcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgPT09ICdwYWdlRGljdCcgJiYgIV8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuICdcIldhaXRpbmcgZm9yIGRhdGFcIic7XG4gICAgICB9XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgIH1cbiAgICBsb2cuZGVidWcoJ0N1cnJlbnQgYXBwbGljYXRpb25zIGF2YWlsYWJsZTonKTtcbiAgICBmb3IgKGxldCBbYXBwLCBpbmZvXSBvZiBfLnRvUGFpcnMoYXBwcykpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgICAgIEFwcGxpY2F0aW9uOiAnJHthcHB9J2ApO1xuICAgICAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIF8udG9QYWlycyhpbmZvKSkge1xuICAgICAgICBsZXQgdmFsdWVTdHJpbmcgPSBnZXRWYWx1ZVN0cmluZyhrZXksIHZhbHVlKTtcbiAgICAgICAgbG9nLmRlYnVnKGAgICAgICAgICR7a2V5fTogJHt2YWx1ZVN0cmluZ31gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyBzZXRDb25uZWN0aW9uS2V5ICgpIHtcbiAgICAvLyBvbmx5IHJlc29sdmUgd2hlbiB0aGUgY29ubmVjdGlvbiByZXNwb25zZSBpcyByZWNlaXZlZFxuICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAvLyBsb2NhbCBjYWxsYmFjaywgY2FsbGVkIHdoZW4gdGhlIHJlbW90ZSBkZWJ1Z2dlciBoYXMgZXN0YWJsaXNoZWRcbiAgICAgIC8vIGEgY29ubmVjdGlvbiB0byB0aGUgYXBwIHVuZGVyIHRlc3RcbiAgICAgIC8vIGBhcHBgIHdpbGwgYmUgYW4gYXJyYXkgb2YgZGljdGlvbmFyaWVzIG9mIGFwcCBpbmZvcm1hdGlvblxuICAgICAgbGV0IGNvbm5lY3RDYiA9IChhcHBzKSA9PiB7XG4gICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGFwcHMpIHx8IF8ua2V5cyhhcHBzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBsb2cuZGVidWcoJ1JlY2VpdmVkIG5vIGFwcHMgZnJvbSByZW1vdGUgZGVidWdnZXIuIFVuYWJsZSB0byBjb25uZWN0LicpO1xuICAgICAgICAgIHJldHVybiByZXNvbHZlKHRoaXMuYXBwRGljdCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG5ld0RpY3QgPSB7fTtcblxuICAgICAgICAvLyB0cmFuc2xhdGUgdGhlIHJlY2VpdmVkIGluZm9ybWF0aW9uIGludG8gYW4gZWFzaWVyLXRvLW1hbmFnZVxuICAgICAgICAvLyBoYXNoIHdpdGggYXBwIGlkIGFzIGtleSwgYW5kIGFwcCBpbmZvIGFzIHZhbHVlXG4gICAgICAgIGZvciAobGV0IGRpY3Qgb2YgXy52YWx1ZXMoYXBwcykpIHtcbiAgICAgICAgICBsZXQgW2lkLCBlbnRyeV0gPSBhcHBJbmZvRnJvbURpY3QoZGljdCk7XG4gICAgICAgICAgbmV3RGljdFtpZF0gPSBlbnRyeTtcbiAgICAgICAgfVxuICAgICAgICAvLyB1cGRhdGUgdGhlIG9iamVjdCdzIGxpc3Qgb2YgYXBwcywgYW5kIHJldHVybiBpdCB0aHJvdWdoIHRoZSBwcm9taXNlXG4gICAgICAgIF8uZGVmYXVsdHModGhpcy5hcHBEaWN0LCBuZXdEaWN0KTtcbiAgICAgICAgcmVzb2x2ZShuZXdEaWN0KTtcbiAgICAgIH07XG4gICAgICB0aGlzLnJwY0NsaWVudC5zZXRTcGVjaWFsTWVzc2FnZUhhbmRsZXIoJ19ycGNfcmVwb3J0Q29ubmVjdGVkQXBwbGljYXRpb25MaXN0OicsIHJlamVjdCwgY29ubmVjdENiKTtcblxuICAgICAgbG9nLmRlYnVnKCdTZW5kaW5nIGNvbm5lY3Rpb24ga2V5IHJlcXVlc3QnKTtcbiAgICAgIHJldHVybiAoYXN5bmMgKCkgPT4ge1xuICAgICAgICBsZXQgW3NpbU5hbWVLZXksIHNpbUJ1aWxkS2V5LCBzaW1QbGF0Zm9ybVZlcnNpb25dID0gYXdhaXQgdGhpcy5ycGNDbGllbnQuc2VuZCgnc2V0Q29ubmVjdGlvbktleScpO1xuICAgICAgICBsb2cuZGVidWcoYFNpbSBuYW1lOiAke3NpbU5hbWVLZXl9YCk7XG4gICAgICAgIGxvZy5kZWJ1ZyhgU2ltIGJ1aWxkOiAke3NpbUJ1aWxkS2V5fWApO1xuICAgICAgICBsb2cuZGVidWcoYFNpbSBwbGF0Zm9ybSB2ZXJzaW9uOiAke3NpbVBsYXRmb3JtVmVyc2lvbn1gKTtcbiAgICAgIH0pKCk7XG4gICAgfSk7XG4gIH1cblxuICB1cGRhdGVBcHBzV2l0aERpY3QgKGRpY3QpIHtcbiAgICAvLyBnZXQgdGhlIGRpY3Rpb25hcnkgZW50cnkgaW50byBhIG5pY2UgZm9ybSwgYW5kIGFkZCBpdCB0byB0aGVcbiAgICAvLyBhcHBsaWNhdGlvbiBkaWN0aW9uYXJ5XG4gICAgdGhpcy5hcHBEaWN0ID0gdGhpcy5hcHBEaWN0IHx8IHt9O1xuICAgIGxldCBbaWQsIGVudHJ5XSA9IGFwcEluZm9Gcm9tRGljdChkaWN0KTtcbiAgICBpZiAodGhpcy5hcHBEaWN0W2lkXSkge1xuICAgICAgLy8gcHJlc2VydmUgdGhlIHBhZ2UgZGljdGlvbmFyeSBmb3IgdGhpcyBlbnRyeVxuICAgICAgZW50cnkucGFnZURpY3QgPSB0aGlzLmFwcERpY3RbaWRdLnBhZ2VEaWN0O1xuICAgIH1cbiAgICB0aGlzLmFwcERpY3RbaWRdID0gZW50cnk7XG5cbiAgICAvLyBhZGQgYSBwcm9taXNlIHRvIGdldCB0aGUgcGFnZSBkaWN0aW9uYXJ5XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoZW50cnkucGFnZURpY3QpKSB7XG4gICAgICBlbnRyeS5wYWdlRGljdCA9IGRlZmVycmVkUHJvbWlzZSgpO1xuICAgIH1cblxuICAgIC8vIHRyeSB0byBnZXQgdGhlIGFwcCBpZCBmcm9tIG91ciBjb25uZWN0ZWQgYXBwc1xuICAgIGlmICghdGhpcy5hcHBJZEtleSkge1xuICAgICAgdGhpcy5hcHBJZEtleSA9IGdldERlYnVnZ2VyQXBwS2V5KHRoaXMuYnVuZGxlSWQsIHRoaXMucGxhdGZvcm1WZXJzaW9uLCB0aGlzLmFwcERpY3QpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNlbGVjdEFwcCAoY3VycmVudFVybCA9IG51bGwsIG1heFRyaWVzID0gU0VMRUNUX0FQUF9SRVRSSUVTLCBpZ25vcmVBYm91dEJsYW5rVXJsID0gZmFsc2UpIHtcbiAgICBsb2cuZGVidWcoJ1NlbGVjdGluZyBhcHBsaWNhdGlvbicpO1xuICAgIGlmICghdGhpcy5hcHBEaWN0IHx8IF8ua2V5cyh0aGlzLmFwcERpY3QpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbG9nLmRlYnVnKCdObyBhcHBsaWNhdGlvbnMgY3VycmVudGx5IGNvbm5lY3RlZC4nKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBpdGVyYXRpdmUgc29sdXRpb24sIGFzIHJlY3Vyc2lvbiB3YXMgc3dhbGxvd2luZyB0aGUgcHJvbWlzZSBhdCBzb21lIHBvaW50XG4gICAgbGV0IHBhZ2VEaWN0LCBhcHBJZEtleTtcbiAgICBhcHBMb29wOiBmb3IgKGxldCBpID0gMDsgaSA8IG1heFRyaWVzOyBpKyspIHtcbiAgICAgIHRoaXMubG9nQXBwbGljYXRpb25EaWN0aW9uYXJ5KHRoaXMuYXBwRGljdCk7XG4gICAgICBsZXQgcG9zc2libGVBcHBJZHMgPSBnZXRQb3NzaWJsZURlYnVnZ2VyQXBwS2V5cyh0aGlzLmJ1bmRsZUlkLCB0aGlzLnBsYXRmb3JtVmVyc2lvbiwgdGhpcy5hcHBEaWN0KTtcbiAgICAgIGxvZy5kZWJ1ZyhgVHJ5aW5nIG91dCB0aGUgcG9zc2libGUgYXBwIGlkczogJHtwb3NzaWJsZUFwcElkcy5qb2luKCcsICcpfWApO1xuICAgICAgZm9yIChsZXQgYXR0ZW1wdGVkQXBwSWRLZXkgb2YgcG9zc2libGVBcHBJZHMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBsb2cuZGVidWcoYFNlbGVjdGluZyBhcHAgJHthdHRlbXB0ZWRBcHBJZEtleX0gKHRyeSAjJHtpICsgMX0gb2YgJHttYXhUcmllc30pYCk7XG4gICAgICAgICAgW2FwcElkS2V5LCBwYWdlRGljdF0gPSBhd2FpdCB0aGlzLnJwY0NsaWVudC5zZWxlY3RBcHAoYXR0ZW1wdGVkQXBwSWRLZXksIHRoaXMub25BcHBDb25uZWN0LmJpbmQodGhpcykpO1xuICAgICAgICAgIC8vIGluIGlPUyA4LjIgdGhlIGNvbm5lY3QgbG9naWMgaGFwcGVucywgYnV0IHdpdGggYW4gZW1wdHkgZGljdGlvbmFyeVxuICAgICAgICAgIC8vIHdoaWNoIGxlYWRzIHRvIHRoZSByZW1vdGUgZGVidWdnZXIgZ2V0dGluZyBkaXNjb25uZWN0ZWQsIGFuZCBpbnRvIGEgbG9vcFxuICAgICAgICAgIGlmIChfLmlzRW1wdHkocGFnZURpY3QpKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoJ0VtcHR5IHBhZ2UgZGljdGlvbmFyeSByZWNlaXZlZC4gVHJ5aW5nIGFnYWluLicpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gc2F2ZSB0aGUgcGFnZSBhcnJheSBmb3IgdGhpcyBhcHBcbiAgICAgICAgICB0aGlzLmFwcERpY3RbYXBwSWRLZXldLnBhZ2VEaWN0ID0gcGFnZUFycmF5RnJvbURpY3QocGFnZURpY3QpO1xuXG4gICAgICAgICAgLy8gaWYgd2UgYXJlIGxvb2tpbmcgZm9yIGEgcGFydGljdWxhciB1cmwsIG1ha2Ugc3VyZSB3ZSBoYXZlIHRoZSByaWdodCBwYWdlLiBJZ25vcmUgZW1wdHkgb3IgdW5kZWZpbmVkIHVybHMuIElnbm9yZSBhYm91dDpibGFuayBpZiByZXF1ZXN0ZWQuXG4gICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgZGljdExvb3A6IGZvciAoY29uc3QgYXBwRGljdCBvZiBfLnZhbHVlcyh0aGlzLmFwcERpY3QpKSB7XG4gICAgICAgICAgICBpZiAoZm91bmQpIGJyZWFrOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5XG5cbiAgICAgICAgICAgIGlmICghYXBwRGljdCB8fCAhYXBwRGljdC5wYWdlRGljdCkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlIHBhZ2UgZGljdGlvbmFyeSBoYXMgbm90IGJlZW4gbG9hZGVkIHlldCBmcm9tIHRoZSB3ZWJcbiAgICAgICAgICAgIC8vIGluc3BlY3Rvciwgd2FpdCBmb3IgaXQgb3IgdGltZSBvdXQgYWZ0ZXIgMTBzXG4gICAgICAgICAgICBpZiAoYXBwRGljdC5wYWdlRGljdC5wcm9taXNlKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGFwcERpY3QucGFnZURpY3QucHJvbWlzZSkudGltZW91dCgxMDAwMCk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIFByb21pc2UuVGltZW91dEVycm9yKSkge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBvbiB0aW1lb3V0LCBqdXN0IGdvIG9uXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChjb25zdCBkaWN0IG9mIChhcHBEaWN0LnBhZ2VEaWN0IHx8IFtdKSkge1xuICAgICAgICAgICAgICBpZiAoKCFpZ25vcmVBYm91dEJsYW5rVXJsIHx8IGRpY3QudXJsICE9PSAnYWJvdXQ6YmxhbmsnKSAmJiAoIWN1cnJlbnRVcmwgfHwgZGljdC51cmwgPT09IGN1cnJlbnRVcmwpKSB7XG4gICAgICAgICAgICAgICAgLy8gc2F2ZSB3aGVyZSB3ZSBmb3VuZCB0aGUgcmlnaHQgcGFnZVxuICAgICAgICAgICAgICAgIGFwcElkS2V5ID0gYXBwRGljdC5pZDtcbiAgICAgICAgICAgICAgICBwYWdlRGljdCA9IGRpY3Q7XG4gICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrIGRpY3RMb29wO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50VXJsKSB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhgUmVjZWl2ZWQgYXBwLCBidXQgZXhwZWN0ZWQgdXJsICgnJHtjdXJyZW50VXJsfScpIHdhcyBub3QgZm91bmQuIFRyeWluZyBhZ2Fpbi5gKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnUmVjZWl2ZWQgYXBwLCBidXQgbm8gbWF0Y2ggd2FzIGZvdW5kLiBUcnlpbmcgYWdhaW4uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYWdlRGljdCA9IG51bGw7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB3ZSBoYXZlIGdvdHRlbiB0aGUgY29ycmVjdCBhcHBsaWNhdGlvbiBieSB0aGlzIHBvaW50LCBzbyBzaG9ydCBjaXJjdWl0IGV2ZXJ5dGhpbmdcbiAgICAgICAgICBicmVhayBhcHBMb29wO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2cuZGVidWcoYEVycm9yIGNoZWNraW5nIGFwcGxpY2F0aW9uOiAnJHtlcnIubWVzc2FnZX0nLiBSZXRyeWluZyBjb25uZWN0aW9uYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiwgYWZ0ZXIgYWxsIHRoaXMsIHdlIGhhdmUgbm8gZGljdGlvbmFyeSwgd2UgaGF2ZSBmYWlsZWRcbiAgICBpZiAoIXBhZ2VEaWN0KSB7XG4gICAgICBsb2cuZXJyb3JBbmRUaHJvdyhgQ291bGQgbm90IGNvbm5lY3QgdG8gYSB2YWxpZCBhcHAgYWZ0ZXIgJHttYXhUcmllc30gdHJpZXMuYCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYXBwSWRLZXkgIT09IGFwcElkS2V5KSB7XG4gICAgICBsb2cuZGVidWcoYFJlY2VpdmVkIGFsdGVyZWQgYXBwIGlkLCB1cGRhdGluZyBmcm9tICcke3RoaXMuYXBwSWRLZXl9JyB0byAnJHthcHBJZEtleX0nYCk7XG4gICAgICB0aGlzLmFwcElkS2V5ID0gYXBwSWRLZXk7XG4gICAgfVxuXG4gICAgLy8gd2FpdCBmb3IgYWxsIHRoZSBwcm9taXNlcyBhcmUgYmFjaywgb3IgMzBzIHBhc3Nlc1xuICAgIGNvbnN0IHBhZ2VQcm9taXNlcyA9IE9iamVjdC52YWx1ZXModGhpcy5hcHBEaWN0KVxuICAgICAgLmZpbHRlcigoYXBwKSA9PiAhIWFwcC5wYWdlRGljdCAmJiAhIWFwcC5wYWdlRGljdC5wcm9taXNlKVxuICAgICAgLm1hcCgoYXBwKSA9PiBhcHAucGFnZURpY3QucHJvbWlzZSk7XG4gICAgaWYgKHBhZ2VQcm9taXNlcy5sZW5ndGgpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgV2FpdGluZyBmb3IgJHtwYWdlUHJvbWlzZXMubGVuZ3RofSBwYWdlcyB0byBiZSBmdWxmaWxsZWRgKTtcbiAgICAgIGF3YWl0IFByb21pc2UuYW55KFtQcm9taXNlLmRlbGF5KDMwMDAwKSwgUHJvbWlzZS5hbGwocGFnZVByb21pc2VzKV0pO1xuICAgIH1cblxuICAgIC8vIHRyYW5zbGF0ZSB0aGUgZGljdGlvbmFyeSBpbnRvIGEgdXNlZnVsIGZvcm0sIGFuZCByZXR1cm4gdG8gc2VuZGVyXG4gICAgbGV0IHBhZ2VBcnJheSA9IHBhZ2VBcnJheUZyb21EaWN0KHBhZ2VEaWN0KTtcbiAgICBsb2cuZGVidWcoYEZpbmFsbHkgc2VsZWN0aW5nIGFwcCAke3RoaXMuYXBwSWRLZXl9OiAke3NpbXBsZVN0cmluZ2lmeShwYWdlQXJyYXkpfWApO1xuXG4gICAgbGV0IGZ1bGxQYWdlQXJyYXkgPSBbXTtcbiAgICBmb3IgKGxldCBbYXBwLCBpbmZvXSBvZiBfLnRvUGFpcnModGhpcy5hcHBEaWN0KSkge1xuICAgICAgaWYgKCFfLmlzQXJyYXkoaW5mby5wYWdlRGljdCkpIGNvbnRpbnVlOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5XG4gICAgICBsZXQgaWQgPSBhcHAucmVwbGFjZSgnUElEOicsICcnKTtcbiAgICAgIGZvciAobGV0IHBhZ2Ugb2YgaW5mby5wYWdlRGljdCkge1xuICAgICAgICBpZiAocGFnZS51cmwgJiYgKCFpZ25vcmVBYm91dEJsYW5rVXJsIHx8IHBhZ2UudXJsICE9PSAnYWJvdXQ6YmxhbmsnKSAmJiAoIWN1cnJlbnRVcmwgfHwgcGFnZS51cmwgPT09IGN1cnJlbnRVcmwpKSB7XG4gICAgICAgICAgbGV0IHBhZ2VEaWN0ID0gXy5jbG9uZShwYWdlKTtcbiAgICAgICAgICBwYWdlRGljdC5pZCA9IGAke2lkfS4ke3BhZ2VEaWN0LmlkfWA7XG4gICAgICAgICAgZnVsbFBhZ2VBcnJheS5wdXNoKHBhZ2VEaWN0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmdWxsUGFnZUFycmF5O1xuICB9XG5cbiAgYXN5bmMgc2VsZWN0UGFnZSAoYXBwSWRLZXksIHBhZ2VJZEtleSwgc2tpcFJlYWR5Q2hlY2sgPSBmYWxzZSkge1xuICAgIHRoaXMuYXBwSWRLZXkgPSBgUElEOiR7YXBwSWRLZXl9YDtcbiAgICB0aGlzLnBhZ2VJZEtleSA9IHBhZ2VJZEtleTtcblxuICAgIGxvZy5kZWJ1ZyhgU2VsZWN0aW5nIHBhZ2UgJyR7cGFnZUlkS2V5fScgb24gYXBwICcke3RoaXMuYXBwSWRLZXl9JyBhbmQgZm9yd2FyZGluZyBzb2NrZXQgc2V0dXBgKTtcblxuICAgIGF3YWl0IHRoaXMucnBjQ2xpZW50LnNlbmQoJ3NldFNlbmRlcktleScsIHtcbiAgICAgIGFwcElkS2V5OiB0aGlzLmFwcElkS2V5LFxuICAgICAgcGFnZUlkS2V5OiB0aGlzLnBhZ2VJZEtleVxuICAgIH0pO1xuICAgIGxvZy5kZWJ1ZygnU2VuZGVyIGtleSBzZXQnKTtcblxuICAgIGF3YWl0IHRoaXMucnBjQ2xpZW50LnNlbmQoJ2VuYWJsZVBhZ2UnLCB7XG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlXG4gICAgfSk7XG4gICAgbG9nLmRlYnVnKCdFbmFibGVkIGFjdGl2aXR5IG9uIHBhZ2UnKTtcblxuICAgIC8vIG1ha2Ugc3VyZSBldmVyeXRoaW5nIGlzIHJlYWR5IHRvIGdvXG4gICAgbGV0IHJlYWR5ID0gYXdhaXQgdGhpcy5jaGVja1BhZ2VJc1JlYWR5KCk7XG4gICAgaWYgKCFza2lwUmVhZHlDaGVjayAmJiAhcmVhZHkpIHtcbiAgICAgIGF3YWl0IHRoaXMucGFnZVVubG9hZCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGV4ZWN1dGVBdG9tIChhdG9tLCBhcmdzLCBmcmFtZXMpIHtcbiAgICBpZiAoIXRoaXMucnBjQ2xpZW50LmNvbm5lY3RlZCkgdGhyb3cgbmV3IEVycm9yKCdSZW1vdGUgZGVidWdnZXIgaXMgbm90IGNvbm5lY3RlZCcpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5XG5cbiAgICBsZXQgc2NyaXB0ID0gYXdhaXQgZ2V0U2NyaXB0Rm9yQXRvbShhdG9tLCBhcmdzLCBmcmFtZXMpO1xuXG4gICAgbGV0IHZhbHVlID0gYXdhaXQgdGhpcy5leGVjdXRlKHNjcmlwdCwgdHJ1ZSk7XG4gICAgbG9nLmRlYnVnKGBSZWNlaXZlZCByZXN1bHQgZm9yIGF0b20gJyR7YXRvbX0nIGV4ZWN1dGlvbjogJHtfLnRydW5jYXRlKHNpbXBsZVN0cmluZ2lmeSh2YWx1ZSksIHtsZW5ndGg6IFJFU1BPTlNFX0xPR19MRU5HVEh9KX1gKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBhc3luYyBleGVjdXRlQXRvbUFzeW5jIChhdG9tLCBhcmdzLCBmcmFtZXMsIHJlc3BvbnNlVXJsKSB7XG4gICAgbGV0IGFzeW5jQ2FsbEJhY2sgPSBgZnVuY3Rpb24gKHJlcykgeyB4bWxIdHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7IGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgYHhtbEh0dHAub3BlbignUE9TVCcsICcke3Jlc3BvbnNlVXJsfScsIHRydWUpO2AgK1xuICAgICAgICAgICAgICAgICAgICAgICAgYHhtbEh0dHAuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC10eXBlJywnYXBwbGljYXRpb24vanNvbicpOyBgICtcbiAgICAgICAgICAgICAgICAgICAgICAgIGB4bWxIdHRwLnNlbmQocmVzKTsgfWA7XG4gICAgbGV0IHNjcmlwdCA9IGF3YWl0IGdldFNjcmlwdEZvckF0b20oYXRvbSwgYXJncywgZnJhbWVzLCBhc3luY0NhbGxCYWNrKTtcbiAgICBhd2FpdCB0aGlzLmV4ZWN1dGUoc2NyaXB0KTtcbiAgfVxuXG4gIGZyYW1lRGV0YWNoZWQgKCkge1xuICAgIHRoaXMuZW1pdChSZW1vdGVEZWJ1Z2dlci5FVkVOVF9GUkFNRVNfREVUQUNIRUQpO1xuICB9XG5cbiAgYXN5bmMgcGFnZUxvYWQgKHN0YXJ0UGFnZUxvYWRNcywgcGFnZUxvYWRWZXJpZnlIb29rKSB7XG4gICAgbGV0IHRpbWVvdXRNcyA9IDUwMDtcbiAgICBsZXQgc3RhcnQgPSBzdGFydFBhZ2VMb2FkTXMgfHwgRGF0ZS5ub3coKTtcbiAgICBsb2cuZGVidWcoJ1BhZ2UgbG9hZGVkLCB2ZXJpZnlpbmcgd2hldGhlciByZWFkeScpO1xuXG4gICAgbGV0IHZlcmlmeSA9IGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMucGFnZUxvYWREZWxheSA9IHV0aWwuY2FuY2VsbGFibGVEZWxheSh0aW1lb3V0TXMpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5wYWdlTG9hZERlbGF5O1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBQcm9taXNlLkNhbmNlbGxhdGlvbkVycm9yKSB7XG4gICAgICAgICAgLy8gaWYgdGhlIHByb21pc2UgaGFzIGJlZW4gY2FuY2VsbGVkXG4gICAgICAgICAgLy8gd2Ugd2FudCB0byBza2lwIGNoZWNraW5nIHRoZSByZWFkaW5lc3NcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gd2UgY2FuIGdldCB0aGlzIGNhbGxlZCBpbiB0aGUgbWlkZGxlIG9mIHRyeWluZyB0byBmaW5kIGEgbmV3IGFwcFxuICAgICAgaWYgKCF0aGlzLmFwcElkS2V5KSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnTm90IGNvbm5lY3RlZCB0byBhbiBhcHBsaWNhdGlvbi4gSWdub3JpbmcgcGFnZSBsb2FkJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKF8uaXNGdW5jdGlvbihwYWdlTG9hZFZlcmlmeUhvb2spKSB7XG4gICAgICAgIGF3YWl0IHBhZ2VMb2FkVmVyaWZ5SG9vaygpO1xuICAgICAgfVxuXG4gICAgICBsZXQgcmVhZHkgPSBhd2FpdCB0aGlzLmNoZWNrUGFnZUlzUmVhZHkoKTtcblxuICAgICAgLy8gaWYgd2UgYXJlIHJlYWR5LCBvciB3ZSd2ZSBzcGVuZCB0b28gbXVjaCB0aW1lIG9uIHRoaXNcbiAgICAgIGlmIChyZWFkeSB8fCAodGhpcy5wYWdlTG9hZE1zID4gMCAmJiAoc3RhcnQgKyB0aGlzLnBhZ2VMb2FkTXMpIDwgRGF0ZS5ub3coKSkpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdQYWdlIGlzIHJlYWR5Jyk7XG4gICAgICAgIHRoaXMucGFnZUxvYWRpbmcgPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnUGFnZSB3YXMgbm90IHJlYWR5LCByZXRyeWluZycpO1xuICAgICAgICBhd2FpdCB2ZXJpZnkoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGF3YWl0IHZlcmlmeSgpO1xuICB9XG5cbiAgY2FuY2VsUGFnZUxvYWQgKCkge1xuICAgIGxvZy5kZWJ1ZygnVW5yZWdpc3RlcmluZyBmcm9tIHBhZ2UgcmVhZGluZXNzIG5vdGlmaWNhdGlvbnMnKTtcbiAgICB0aGlzLnBhZ2VMb2FkaW5nID0gZmFsc2U7XG4gICAgaWYgKHRoaXMucGFnZUxvYWREZWxheSkge1xuICAgICAgdGhpcy5wYWdlTG9hZERlbGF5LmNhbmNlbCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHBhZ2VVbmxvYWQgKCkge1xuICAgIGxvZy5kZWJ1ZygnUGFnZSB1bmxvYWRpbmcnKTtcbiAgICB0aGlzLnBhZ2VMb2FkaW5nID0gdHJ1ZTtcbiAgICBhd2FpdCB0aGlzLndhaXRGb3JEb20oKTtcbiAgfVxuXG4gIGFzeW5jIHdhaXRGb3JEb20gKHN0YXJ0UGFnZUxvYWRNcywgcGFnZUxvYWRWZXJpZnlIb29rKSB7XG4gICAgbG9nLmRlYnVnKCdXYWl0aW5nIGZvciBkb20uLi4nKTtcbiAgICBhd2FpdCB0aGlzLnBhZ2VMb2FkKHN0YXJ0UGFnZUxvYWRNcywgcGFnZUxvYWRWZXJpZnlIb29rKTtcbiAgfVxuXG4gIGFzeW5jIGNoZWNrUGFnZUlzUmVhZHkgKCkge1xuICAgIGxldCBlcnJvcnMgPSBjaGVja1BhcmFtcyh7YXBwSWRLZXk6IHRoaXMuYXBwSWRLZXl9KTtcbiAgICBpZiAoZXJyb3JzKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3JzKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuXG4gICAgbG9nLmRlYnVnKCdDaGVja2luZyBkb2N1bWVudCByZWFkeVN0YXRlJyk7XG4gICAgY29uc3QgcmVhZHlDbWQgPSAnKGZ1bmN0aW9uICgpeyByZXR1cm4gZG9jdW1lbnQucmVhZHlTdGF0ZTsgfSkoKSc7XG4gICAgbGV0IHJlYWR5U3RhdGUgPSAnbG9hZGluZyc7XG4gICAgdHJ5IHtcbiAgICAgIHJlYWR5U3RhdGUgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUodGhpcy5leGVjdXRlKHJlYWR5Q21kLCB0cnVlKSkudGltZW91dCh0aGlzLnBhZ2VSZWFkeVRpbWVvdXQpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgUHJvbWlzZS5UaW1lb3V0RXJyb3IpKSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhgUGFnZSByZWFkaW5lc3MgY2hlY2sgdGltZWQgb3V0IGFmdGVyICR7dGhpcy5wYWdlUmVhZHlUaW1lb3V0fW1zYCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxvZy5kZWJ1ZyhgcmVhZHlTdGF0ZSB3YXMgJHtzaW1wbGVTdHJpbmdpZnkocmVhZHlTdGF0ZSl9YCk7XG5cbiAgICByZXR1cm4gcmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJztcbiAgfVxuXG4gIGFzeW5jIG5hdlRvVXJsICh1cmwsIHBhZ2VMb2FkVmVyaWZ5SG9vaykge1xuICAgIC8vIG5vIG5lZWQgdG8gZG8gdGhpcyBjaGVjayB3aGVuIHVzaW5nIHdlYmtpdFxuICAgIGlmICh0aGlzLmRlYnVnZ2VyVHlwZSA9PT0gREVCVUdHRVJfVFlQRVMud2ViaW5zcGVjdG9yKSB7XG4gICAgICBsZXQgZXJyb3JzID0gY2hlY2tQYXJhbXMoe2FwcElkS2V5OiB0aGlzLmFwcElkS2V5LCBwYWdlSWRLZXk6IHRoaXMucGFnZUlkS2V5fSk7XG4gICAgICBpZiAoZXJyb3JzKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3JzKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuICAgIH1cblxuICAgIGxvZy5kZWJ1ZyhgTmF2aWdhdGluZyB0byBuZXcgVVJMOiAke3VybH1gKTtcbiAgICBhd2FpdCB0aGlzLnJwY0NsaWVudC5zZW5kKCdzZXRVcmwnLCB7XG4gICAgICB1cmwsXG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlXG4gICAgfSk7XG5cbiAgICBpZiAoIXRoaXMudXNlTmV3U2FmYXJpKSB7XG4gICAgICAvLyBhIHNtYWxsIHBhdXNlIGZvciB0aGUgYnJvd3NlciB0byBjYXRjaCB1cFxuICAgICAgYXdhaXQgUHJvbWlzZS5kZWxheSgxMDAwKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5kZWJ1Z2dlclR5cGUgPT09IERFQlVHR0VSX1RZUEVTLndlYmluc3BlY3Rvcikge1xuICAgICAgYXdhaXQgdGhpcy53YWl0Rm9yRnJhbWVOYXZpZ2F0ZWQoKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy53YWl0Rm9yRG9tKERhdGUubm93KCksIHBhZ2VMb2FkVmVyaWZ5SG9vayk7XG4gIH1cblxuICBhc3luYyB3YWl0Rm9yRnJhbWVOYXZpZ2F0ZWQgKCkge1xuICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBsb2cuZGVidWcoJ1dhaXRpbmcgZm9yIGZyYW1lIG5hdmlnYXRlZCBtZXNzYWdlLi4uJyk7XG4gICAgICBsZXQgc3RhcnRNcyA9IERhdGUubm93KCk7XG5cbiAgICAgIC8vIGFkZCBhIGhhbmRsZXIgZm9yIHRoZSBgUGFnZS5mcmFtZU5hdmlnYXRlZGAgbWVzc2FnZVxuICAgICAgLy8gZnJvbSB0aGUgcmVtb3RlIGRlYnVnZ2VyXG4gICAgICBsZXQgbmF2RXZlbnRMaXN0ZW5lciA9ICh2YWx1ZSkgPT4ge1xuICAgICAgICBsb2cuZGVidWcoYEZyYW1lIG5hdmlnYXRlZCBpbiAkeygoRGF0ZS5ub3coKSAtIHN0YXJ0TXMpIC8gMTAwMCl9IHNlYyBmcm9tIHNvdXJjZTogJHt2YWx1ZX1gKTtcbiAgICAgICAgaWYgKHRoaXMubmF2aWdhdGlvbkRlbGF5KSB7XG4gICAgICAgICAgdGhpcy5uYXZpZ2F0aW9uRGVsYXkuY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5ycGNDbGllbnQuc2V0U3BlY2lhbE1lc3NhZ2VIYW5kbGVyKCdQYWdlLmZyYW1lTmF2aWdhdGVkJywgcmVqZWN0LCBuYXZFdmVudExpc3RlbmVyKTtcblxuICAgICAgLy8gdGltZW91dCwgaW4gY2FzZSByZW1vdGUgZGVidWdnZXIgZG9lc24ndCByZXNwb25kLFxuICAgICAgLy8gb3IgdGFrZXMgYSBsb25nIHRpbWVcbiAgICAgIGlmICghdGhpcy51c2VOZXdTYWZhcmkgfHwgdGhpcy5wYWdlTG9hZE1zID49IDApIHtcbiAgICAgICAgLy8gdXNlIHBhZ2VMb2FkTXMsIG9yIGEgc21hbGwgYW1vdW50IG9mIHRpbWVcbiAgICAgICAgbGV0IHRpbWVvdXQgPSB0aGlzLnVzZU5ld1NhZmFyaSA/IHRoaXMucGFnZUxvYWRNcyA6IDUwMDtcbiAgICAgICAgdGhpcy5uYXZpZ2F0aW9uRGVsYXkgPSB1dGlsLmNhbmNlbGxhYmxlRGVsYXkodGltZW91dCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5uYXZpZ2F0aW9uRGVsYXk7XG4gICAgICAgICAgbmF2RXZlbnRMaXN0ZW5lcigndGltZW91dCcpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAvLyBub3RoaW5nIHRvIGRvOiB3ZSBvbmx5IGdldCBoZXJlIGlmIHRoZSByZW1vdGUgZGVidWdnZXJcbiAgICAgICAgICAvLyBhbHJlYWR5IG5vdGlmaWVkIG9mIGZyYW1lIG5hdmlnYXRpb24sIGFuZCB0aGUgZGVsYXlcbiAgICAgICAgICAvLyB3YXMgY2FuY2VsbGVkXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0VGltZWxpbmUgKGZuKSB7XG4gICAgbG9nLmRlYnVnKCdTdGFydGluZyB0byByZWNvcmQgdGhlIHRpbWVsaW5lJyk7XG4gICAgdGhpcy5ycGNDbGllbnQuc2V0VGltZWxpbmVFdmVudEhhbmRsZXIoZm4pO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnJwY0NsaWVudC5zZW5kKCdzdGFydFRpbWVsaW5lJywge1xuICAgICAgYXBwSWRLZXk6IHRoaXMuYXBwSWRLZXksXG4gICAgICBwYWdlSWRLZXk6IHRoaXMucGFnZUlkS2V5LFxuICAgICAgZGVidWdnZXJUeXBlOiB0aGlzLmRlYnVnZ2VyVHlwZVxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgc3RvcFRpbWVsaW5lICgpIHtcbiAgICBsb2cuZGVidWcoJ1N0b3BwaW5nIHRvIHJlY29yZCB0aGUgdGltZWxpbmUnKTtcbiAgICBhd2FpdCB0aGlzLnJwY0NsaWVudC5zZW5kKCdzdG9wVGltZWxpbmUnLCB7XG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlXG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBzdGFydENvbnNvbGUgKGZuKSB7XG4gICAgbG9nLmRlYnVnKCdTdGFydGluZyB0byBsaXN0ZW4gZm9yIEphdmFTY3JpcHQgY29uc29sZScpO1xuICAgIHRoaXMucnBjQ2xpZW50LnNldENvbnNvbGVMb2dFdmVudEhhbmRsZXIoZm4pO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnJwY0NsaWVudC5zZW5kKCdzdGFydENvbnNvbGUnLCB7XG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlXG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBzdG9wQ29uc29sZSAoKSB7XG4gICAgbG9nLmRlYnVnKCdTdG9wcGluZyB0byBsaXN0ZW4gZm9yIEphdmFTY3JpcHQgY29uc29sZScpO1xuICAgIGF3YWl0IHRoaXMucnBjQ2xpZW50LnNlbmQoJ3N0b3BDb25zb2xlJywge1xuICAgICAgYXBwSWRLZXk6IHRoaXMuYXBwSWRLZXksXG4gICAgICBwYWdlSWRLZXk6IHRoaXMucGFnZUlkS2V5LFxuICAgICAgZGVidWdnZXJUeXBlOiB0aGlzLmRlYnVnZ2VyVHlwZVxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgc3RhcnROZXR3b3JrIChmbikge1xuICAgIGxvZy5kZWJ1ZygnU3RhcnRpbmcgdG8gbGlzdGVuIGZvciBuZXR3b3JrIGV2ZW50cycpO1xuICAgIHRoaXMucnBjQ2xpZW50LnNldE5ldHdvcmtMb2dFdmVudEhhbmRsZXIoZm4pO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnJwY0NsaWVudC5zZW5kKCdzdGFydE5ldHdvcmsnLCB7XG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlXG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBzdG9wTmV0d29yayAoKSB7XG4gICAgbG9nLmRlYnVnKCdTdG9wcGluZyB0byBsaXN0ZW4gZm9yIG5ldHdvcmsgZXZlbnRzJyk7XG4gICAgYXdhaXQgdGhpcy5ycGNDbGllbnQuc2VuZCgnc3RvcE5ldHdvcmsnLCB7XG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlXG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBleGVjdXRlIChjb21tYW5kLCBvdmVycmlkZSkge1xuICAgIC8vIGlmIHRoZSBwYWdlIGlzIG5vdCBsb2FkZWQgeWV0LCB3YWl0IGZvciBpdFxuICAgIGlmICh0aGlzLnBhZ2VMb2FkaW5nICYmICFvdmVycmlkZSkge1xuICAgICAgbG9nLmRlYnVnKCdUcnlpbmcgdG8gZXhlY3V0ZSBidXQgcGFnZSBpcyBub3QgbG9hZGVkLicpO1xuICAgICAgYXdhaXQgdGhpcy53YWl0Rm9yRG9tKCk7XG4gICAgfVxuXG4gICAgLy8gbm8gbmVlZCB0byBjaGVjayBlcnJvcnMgaWYgaXQgaXMgd2Via2l0XG4gICAgaWYgKHRoaXMuZGVidWdnZXJUeXBlID09PSBERUJVR0dFUl9UWVBFUy53ZWJpbnNwZWN0b3IpIHtcbiAgICAgIGxldCBlcnJvcnMgPSBjaGVja1BhcmFtcyh7YXBwSWRLZXk6IHRoaXMuYXBwSWRLZXksIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXl9KTtcbiAgICAgIGlmIChlcnJvcnMpIHRocm93IG5ldyBFcnJvcihlcnJvcnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZ2FyYmFnZUNvbGxlY3RPbkV4ZWN1dGUpIHtcbiAgICAgIGF3YWl0IHRoaXMuZ2FyYmFnZUNvbGxlY3QoKTtcbiAgICB9XG5cbiAgICBsb2cuZGVidWcoYFNlbmRpbmcgamF2YXNjcmlwdCBjb21tYW5kICR7Xy50cnVuY2F0ZShjb21tYW5kLCB7bGVuZ3RoOiA1MH0pfWApO1xuICAgIGxldCByZXMgPSBhd2FpdCB0aGlzLnJwY0NsaWVudC5zZW5kKCdzZW5kSlNDb21tYW5kJywge1xuICAgICAgY29tbWFuZCxcbiAgICAgIGFwcElkS2V5OiB0aGlzLmFwcElkS2V5LFxuICAgICAgcGFnZUlkS2V5OiB0aGlzLnBhZ2VJZEtleSxcbiAgICAgIGRlYnVnZ2VyVHlwZTogdGhpcy5kZWJ1Z2dlclR5cGVcbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzLmNvbnZlcnRSZXN1bHQocmVzKTtcbiAgfVxuXG4gIGFzeW5jIGNhbGxGdW5jdGlvbiAob2JqSWQsIGZuLCBhcmdzKSB7XG4gICAgbGV0IGVycm9ycyA9IGNoZWNrUGFyYW1zKHthcHBJZEtleTogdGhpcy5hcHBJZEtleSwgcGFnZUlkS2V5OiB0aGlzLnBhZ2VJZEtleX0pO1xuICAgIGlmIChlcnJvcnMpIHRocm93IG5ldyBFcnJvcihlcnJvcnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5XG5cbiAgICBpZiAodGhpcy5nYXJiYWdlQ29sbGVjdE9uRXhlY3V0ZSkge1xuICAgICAgYXdhaXQgdGhpcy5nYXJiYWdlQ29sbGVjdCgpO1xuICAgIH1cblxuICAgIGxvZy5kZWJ1ZygnQ2FsbGluZyBqYXZhc2NyaXB0IGZ1bmN0aW9uJyk7XG4gICAgbGV0IHJlcyA9IGF3YWl0IHRoaXMucnBjQ2xpZW50LnNlbmQoJ2NhbGxKU0Z1bmN0aW9uJywge1xuICAgICAgb2JqSWQsXG4gICAgICBmbixcbiAgICAgIGFyZ3MsXG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy5jb252ZXJ0UmVzdWx0KHJlcyk7XG4gIH1cblxuICBjb252ZXJ0UmVzdWx0IChyZXMpIHtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChyZXMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYERpZCBub3QgZ2V0IE9LIHJlc3VsdCBmcm9tIHJlbW90ZSBkZWJ1Z2dlci4gUmVzdWx0IHdhczogJHtfLnRydW5jYXRlKHNpbXBsZVN0cmluZ2lmeShyZXMpLCB7bGVuZ3RoOiBSRVNQT05TRV9MT0dfTEVOR1RIfSl9YCk7XG4gICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHJlcykpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcyA9IEpTT04ucGFyc2UocmVzKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyB3ZSBtaWdodCBnZXQgYSBzZXJpYWxpemVkIG9iamVjdCwgYnV0IHdlIG1pZ2h0IG5vdFxuICAgICAgICAvLyBpZiB3ZSBnZXQgaGVyZSwgaXQgaXMganVzdCBhIHZhbHVlXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghXy5pc09iamVjdChyZXMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlc3VsdCBoYXMgdW5leHBlY3RlZCB0eXBlOiAoJHt0eXBlb2YgcmVzfSkuYCk7XG4gICAgfVxuXG4gICAgaWYgKHJlcy5zdGF0dXMgJiYgcmVzLnN0YXR1cyAhPT0gMCkge1xuICAgICAgLy8gd2UgZ290IHNvbWUgZm9ybSBvZiBlcnJvci5cbiAgICAgIHRocm93IGVycm9yRnJvbUNvZGUocmVzLnN0YXR1cywgcmVzLnZhbHVlLm1lc3NhZ2UgfHwgcmVzLnZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyB3aXRoIGVpdGhlciBoYXZlIGFuIG9iamVjdCB3aXRoIGEgYHZhbHVlYCBwcm9wZXJ0eSAoZXZlbiBpZiBgbnVsbGApLFxuICAgIC8vIG9yIGEgcGxhaW4gb2JqZWN0XG4gICAgcmV0dXJuIHJlcy5oYXNPd25Qcm9wZXJ0eSgndmFsdWUnKSA/IHJlcy52YWx1ZSA6IHJlcztcbiAgfVxuXG4gIGFsbG93TmF2aWdhdGlvbldpdGhvdXRSZWxvYWQgKGFsbG93ID0gdHJ1ZSkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24odGhpcy5ycGNDbGllbnQuYWxsb3dOYXZpZ2F0aW9uV2l0aG91dFJlbG9hZCkpIHtcbiAgICAgIHRoaXMucnBjQ2xpZW50LmFsbG93TmF2aWdhdGlvbldpdGhvdXRSZWxvYWQoYWxsb3cpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGdldENvb2tpZXMgKHVybHMpIHtcbiAgICBsb2cuZGVidWcoJ0dldHRpbmcgbmV0d29yayBjb29raWVzJyk7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucnBjQ2xpZW50LnNlbmQoJ2dldENvb2tpZXMnLCB7XG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlLFxuICAgICAgdXJscyxcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZUNvb2tpZSAoY29va2llTmFtZSwgdXJsKSB7XG4gICAgbG9nLmRlYnVnKGBEZWxldGluZyBjb29raWUgJyR7Y29va2llTmFtZX0nIG9uICcke3VybH0nYCk7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucnBjQ2xpZW50LnNlbmQoJ2RlbGV0ZUNvb2tpZScsIHtcbiAgICAgIGFwcElkS2V5OiB0aGlzLmFwcElkS2V5LFxuICAgICAgcGFnZUlkS2V5OiB0aGlzLnBhZ2VJZEtleSxcbiAgICAgIGRlYnVnZ2VyVHlwZTogdGhpcy5kZWJ1Z2dlclR5cGUsXG4gICAgICBjb29raWVOYW1lLFxuICAgICAgdXJsLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZ2FyYmFnZUNvbGxlY3QgKHRpbWVvdXRNcyA9IEdBUkJBR0VfQ09MTEVDVF9USU1FT1VUKSB7XG4gICAgbG9nLmRlYnVnKGBHYXJiYWdlIGNvbGxlY3Rpbmcgd2l0aCAke3RpbWVvdXRNc31tcyB0aW1lb3V0YCk7XG4gICAgY29uc3QgZXJyb3JzID0gY2hlY2tQYXJhbXMoe1xuICAgICAgYXBwSWRLZXk6IHRoaXMuYXBwSWRLZXksXG4gICAgICBwYWdlSWRLZXk6IHRoaXMucGFnZUlkS2V5LFxuICAgIH0pO1xuICAgIGlmIChlcnJvcnMpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgVW5hYmxlIHRvIGNvbGxlY3QgZ2FyYmFnZSBhdCB0aGlzIHRpbWVgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUodGhpcy5ycGNDbGllbnQuc2VuZCgnZ2FyYmFnZUNvbGxlY3QnLCB7XG4gICAgICBhcHBJZEtleTogdGhpcy5hcHBJZEtleSxcbiAgICAgIHBhZ2VJZEtleTogdGhpcy5wYWdlSWRLZXksXG4gICAgICBkZWJ1Z2dlclR5cGU6IHRoaXMuZGVidWdnZXJUeXBlXG4gICAgfSkpLnRpbWVvdXQodGltZW91dE1zKVxuICAgIC50aGVuKGZ1bmN0aW9uICgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBwcm9taXNlL3ByZWZlci1hd2FpdC10by10aGVuXG4gICAgICBsb2cuZGVidWcoYEdhcmJhZ2UgY29sbGVjdGlvbiBzdWNjZXNzZnVsYCk7XG4gICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByb21pc2UvcHJlZmVyLWF3YWl0LXRvLWNhbGxiYWNrc1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFByb21pc2UuVGltZW91dEVycm9yKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhgR2FyYmFnZSBjb2xsZWN0aW9uIHRpbWVkIG91dCBhZnRlciAke3RpbWVvdXRNc31tc2ApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKGBVbmFibGUgdG8gY29sbGVjdCBnYXJiYWdlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbi8vIGV2ZW50IGVtaXR0ZWQgcHVibGljYWxseVxuUmVtb3RlRGVidWdnZXIuRVZFTlRfUEFHRV9DSEFOR0UgPSAncmVtb3RlX2RlYnVnZ2VyX3BhZ2VfY2hhbmdlJztcblJlbW90ZURlYnVnZ2VyLkVWRU5UX0ZSQU1FU19ERVRBQ0hFRCA9ICdyZW1vdGVfZGVidWdnZXJfZnJhbWVzX2RldGFjaGVkJztcblJlbW90ZURlYnVnZ2VyLkVWRU5UX0RJU0NPTk5FQ1QgPSAncmVtb3RlX2RlYnVnZ2VyX2Rpc2Nvbm5lY3QnO1xuXG4vLyBhZGQgZ2VuZXJpYyBjYWxsYmFja3NcbmZvciAobGV0IFtuYW1lLCBoYW5kbGVyXSBvZiBfLnRvUGFpcnMobWVzc2FnZUhhbmRsZXJzKSkge1xuICBSZW1vdGVEZWJ1Z2dlci5wcm90b3R5cGVbbmFtZV0gPSBoYW5kbGVyO1xufVxuXG5leHBvcnQge1xuICBSZW1vdGVEZWJ1Z2dlciwgREVCVUdHRVJfVFlQRVMsIFJFTU9URV9ERUJVR0dFUl9QT1JULCBSUENfUkVTUE9OU0VfVElNRU9VVF9NUyxcbn07XG4iXSwiZmlsZSI6ImxpYi9yZW1vdGUtZGVidWdnZXIuanMiLCJzb3VyY2VSb290IjoiLi4vLi4ifQ==
