"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.WEBVIEW_BASE = exports.WEBVIEW_WIN = exports.NATIVE_WIN = exports.helpers = exports.commands = void 0;

require("source-map-support/register");

var _lodash = _interopRequireDefault(require("lodash"));

var _bluebird = _interopRequireDefault(require("bluebird"));

var _asyncbox = require("asyncbox");

var _appiumRemoteDebugger = require("appium-remote-debugger");

var _iosPerformanceLog = _interopRequireDefault(require("../device-log/ios-performance-log"));

var _appiumBaseDriver = require("appium-base-driver");

var _logger = _interopRequireDefault(require("../logger"));

var _appiumSupport = require("appium-support");

const NATIVE_WIN = 'NATIVE_APP';
exports.NATIVE_WIN = NATIVE_WIN;
const WEBVIEW_WIN = 'WEBVIEW';
exports.WEBVIEW_WIN = WEBVIEW_WIN;
const WEBVIEW_BASE = `${WEBVIEW_WIN}_`;
exports.WEBVIEW_BASE = WEBVIEW_BASE;
let commands = {},
    helpers = {},
    extensions = {};
exports.helpers = helpers;
exports.commands = commands;

commands.getCurrentContext = async function () {
  if (this.curContext && this.curContext !== NATIVE_WIN) {
    return `${WEBVIEW_BASE}${this.curContext}`;
  } else {
    return NATIVE_WIN;
  }
};

commands.getContexts = async function () {
  _logger.default.debug('Getting list of available contexts');

  let contexts = await this.getContextsAndViews(false);

  let mapFn = context => context.id.toString();

  if (this.opts.fullContextList) {
    mapFn = context => {
      return {
        id: context.id.toString(),
        title: context.view.title,
        url: context.view.url
      };
    };
  }

  return contexts.map(mapFn);
};

commands.setContext = async function (name, callback, skipReadyCheck) {
  function alreadyInContext(desired, current) {
    return desired === current || desired === null && current === NATIVE_WIN || desired === NATIVE_WIN && current === null;
  }

  _logger.default.debug(`Attempting to set context to '${name}'`);

  if (alreadyInContext(name, this.curContext)) {} else if (name === NATIVE_WIN || name === null) {
    this.curContext = null;

    if (this.isRealDevice()) {
      this.remote.disconnect();
    }
  } else {
    if (_lodash.default.isUndefined(this.contexts)) {
      await this.getContexts();
    }

    let contextId = name.replace(WEBVIEW_BASE, '');

    if (contextId === '') {
      contextId = this.contexts[1];
    }

    if (!_lodash.default.includes(this.contexts, contextId)) {
      throw new _appiumBaseDriver.errors.NoSuchContextError();
    }

    if (this.isRealDevice()) {
      if (this.remote) {
        await this.remote.disconnect();
      }

      this.curContext = contextId;
      await this.remote.connect(contextId);
    } else {
      let [appIdKey, pageIdKey] = _lodash.default.map(contextId.split('.'), id => parseInt(id, 10));

      await this.remote.selectPage(appIdKey, pageIdKey, skipReadyCheck);
      this.curContext = contextId;
    }
  }

  if (this.opts.enablePerformanceLogging && this.remote) {
    _logger.default.debug(`Starting performance log on '${this.curContext}'`);

    this.logs.performance = new _iosPerformanceLog.default(this.remote);
    await this.logs.performance.startCapture();
  }
};

commands.getWindowHandle = async function () {
  if (!this.isWebContext()) {
    throw new _appiumBaseDriver.errors.NotImplementedError();
  }

  return this.curContext.toString();
};

commands.getWindowHandles = async function () {
  if (!this.isWebContext()) {
    throw new _appiumBaseDriver.errors.NotImplementedError();
  }

  this.windowHandleCache = await this.listWebFrames(false);

  const idArray = _lodash.default.map(this.windowHandleCache, 'id');

  if (!this.contexts) {
    this.contexts = idArray;
  }

  return _lodash.default.map(idArray, id => id.toString());
};

commands.setWindow = async function (name, skipReadyCheck) {
  if (!this.isWebContext()) {
    throw new _appiumBaseDriver.errors.NotImplementedError();
  }

  if (!_lodash.default.includes(_lodash.default.map(this.windowHandleCache, 'id'), name)) {
    throw new _appiumBaseDriver.errors.NoSuchWindowError();
  }

  let pageIdKey = parseInt(name, 10);

  if (!this.isRealDevice()) {
    await this.remote.selectPage(pageIdKey, skipReadyCheck);
    this.curContext = this.curWindowHandle = name;
  } else {
    if (name === this.curWindowHandle) {
      _logger.default.debug(`Remote debugger is already connected to window '${name}'`);
    } else if (!_lodash.default.includes(_lodash.default.map(this.windowHandleCache, 'id'), name)) {
      throw new _appiumBaseDriver.errors.NoSuchWindowError();
    } else {
      await this.remote.disconnect();
      this.curContext = this.curWindowHandle = name;
      await this.remote.connect(name);
    }
  }
};

helpers.webContextIndex = function () {
  return this.curContext.replace(WEBVIEW_BASE, '') - 1;
};

extensions.initAutoWebview = async function () {
  if (this.opts.autoWebview) {
    _logger.default.debug('Setting auto webview');

    await this.navToInitialWebview(this);
  }
};

extensions.getContextsAndViews = async function (useUrl = true) {
  _logger.default.debug('Retrieving contexts and views');

  let webviews = await this.listWebFrames(useUrl);
  let ctxs = [{
    id: NATIVE_WIN,
    view: {}
  }];
  this.contexts = [NATIVE_WIN];

  for (let view of webviews) {
    ctxs.push({
      id: `${WEBVIEW_BASE}${view.id}`,
      view
    });
    this.contexts.push(view.id.toString());
  }

  return ctxs;
};

extensions.getNewRemoteDebugger = async function () {
  return new _appiumRemoteDebugger.RemoteDebugger({
    bundleId: this.opts.bundleId,
    useNewSafari: this.useNewSafari(),
    pageLoadMs: this.pageLoadMs,
    platformVersion: this.opts.platformVersion,
    remoteDebugProxy: this.opts.remoteDebugProxy,
    garbageCollectOnExecute: _appiumSupport.util.hasValue(this.opts.safariGarbageCollect) ? !!this.opts.safariGarbageCollect : true
  });
};

extensions.listWebFrames = async function (useUrl = true) {
  if (!this.opts.bundleId) {
    _logger.default.errorAndThrow('Cannot enter web frame without a bundle ID');
  }

  useUrl = useUrl && !!this.getCurrentUrl();

  _logger.default.debug(`Selecting by url: ${useUrl} ${useUrl ? `(expected url: '${this.getCurrentUrl()}')` : ''}`);

  let currentUrl = useUrl ? this.getCurrentUrl() : undefined;
  let pageArray;

  if (this.isRealDevice() && this.remote && this.opts.bundleId) {
    pageArray = await this.remote.pageArrayFromJson(this.opts.ignoreAboutBlankUrl);
  } else if (this.remote && this.remote.appIdKey) {
    pageArray = await this.remote.selectApp(currentUrl, this.opts.webviewConnectRetries, this.opts.ignoreAboutBlankUrl);
  } else if (this.isRealDevice()) {
    try {
      this.remote = new _appiumRemoteDebugger.WebKitRemoteDebugger({
        port: this.opts.webkitDebugProxyPort,
        webkitResponseTimeout: this.opts.webkitResponseTimeout
      });
      pageArray = await this.remote.pageArrayFromJson(this.opts.ignoreAboutBlankUrl);
    } catch (err) {
      if (!_lodash.default.includes(err.message, 'connect ECONNREFUSED')) throw err;

      _logger.default.warn('Attempted to get a list of webview contexts but could not connect to ' + 'ios-webkit-debug-proxy. If you expect to find webviews, please ensure ' + 'that the proxy is running and accessible');

      this.remote = null;
      pageArray = [];
    }
  } else {
    this.remote = await this.getNewRemoteDebugger();
    let appInfo = await this.remote.connect();

    if (!appInfo) {
      _logger.default.debug('Unable to connect to the remote debugger.');

      return [];
    }

    pageArray = await this.remote.selectApp(currentUrl, this.opts.webviewConnectRetries, this.opts.ignoreAboutBlankUrl);
    this.remote.on(_appiumRemoteDebugger.RemoteDebugger.EVENT_PAGE_CHANGE, this.onPageChange.bind(this));
    this.remote.on(_appiumRemoteDebugger.RemoteDebugger.EVENT_FRAMES_DETACHED, () => {
      if (!_lodash.default.isEmpty(this.curWebFrames)) {
        _logger.default.debug(`Clearing ${this.curWebFrames.length} frames: ${this.curWebFrames.join(', ')}`);
      }

      this.curWebFrames = [];
    });

    let tryClosingAlert = async () => {
      let didDismiss = await this.closeAlertBeforeTest();

      if (!didDismiss) {
        throw new Error('Close alert failed. Retry.');
      }
    };

    try {
      await (0, _asyncbox.retryInterval)(3, 4000, tryClosingAlert);
    } catch (err) {
      if (err.message !== 'Close alert failed. Retry.') {
        _logger.default.errorAndThrow(err);
      }
    }
  }

  if (pageArray.length === 0) {
    _logger.default.debug('No web frames found.');
  }

  return pageArray;
};

extensions.onPageChange = async function (pageChangeNotification) {
  _logger.default.debug(`Remote debugger notified us of a new page listing: ${JSON.stringify(pageChangeNotification)}`);

  if (this.selectingNewPage) {
    _logger.default.debug('We are in the middle of selecting a page, ignoring');

    return;
  }

  if (!this.remote || !this.remote.isConnected()) {
    _logger.default.debug('We have not yet connected, ignoring');

    return;
  }

  const {
    appIdKey,
    pageArray
  } = pageChangeNotification;
  let newIds = [];
  let newPages = [];
  let keyId = null;

  for (const page of pageArray) {
    const id = page.id.toString();
    newIds.push(id);

    if (page.isKey) {
      keyId = id;
    }

    const contextId = `${appIdKey}.${id}`;

    if (!_lodash.default.includes(this.contexts, contextId)) {
      newPages.push(id);
      this.contexts.push(contextId);
    }
  }

  if (!keyId) {
    _logger.default.debug('No key id found. Choosing first id from page array');

    keyId = newIds[0] || null;
  }

  if (!_appiumSupport.util.hasValue(this.curContext)) {
    _logger.default.debug('We do not appear to have window set yet, ignoring');

    return;
  }

  const [curAppIdKey, curPageIdKey] = this.curContext.split('.');

  if (curAppIdKey !== appIdKey) {
    _logger.default.debug('Page change not referring to currently selected app, ignoring.');

    return;
  }

  let newPage = null;

  if (newPages.length) {
    newPage = _lodash.default.last(newPages);

    _logger.default.debug(`We have new pages, selecting page '${newPage}'`);
  } else if (!_lodash.default.includes(newIds, curPageIdKey)) {
    _logger.default.debug('New page listing from remote debugger does not contain ' + 'current window; assuming it is closed');

    if (!_appiumSupport.util.hasValue(keyId)) {
      _logger.default.error('Do not have our current window anymore, and there ' + 'are not any more to load! Doing nothing...');

      this.setCurrentUrl(undefined);
      return;
    }

    _logger.default.debug(`Debugger already selected page '${keyId}', ` + `confirming that choice.`);

    this.curContext = `${appIdKey}.${keyId}`;
    newPage = keyId;
  } else {
    _logger.default.debug('Checking if page needs to load');

    const needsPageLoad = (() => {
      const contextArray = _lodash.default.map(pageArray, page => `${appIdKey}.${page.id}`);

      return !_lodash.default.isEqual(_lodash.default.find(this.contexts, this.curContext), _lodash.default.find(contextArray, this.curContext));
    })();

    if (needsPageLoad) {
      _logger.default.debug('Page load needed. Loading...');

      await this.remote.pageLoad();
    }

    _logger.default.debug('New page listing is same as old, doing nothing');
  }

  if (_appiumSupport.util.hasValue(this.curContext)) {
    let currentPageId = parseInt(_lodash.default.last(this.curContext.split('.')), 10);

    let page = _lodash.default.find(pageArray, p => parseInt(p.id, 10) === currentPageId);

    if (page && page.url !== this.getCurrentUrl()) {
      _logger.default.debug(`Redirected from '${this.getCurrentUrl()}' to '${page.url}'`);

      this.setCurrentUrl(page.url);
    }
  }

  if (_appiumSupport.util.hasValue(newPage)) {
    this.selectingNewPage = true;
    await this.remote.selectPage(appIdKey, parseInt(newPage, 10));
    this.selectingNewPage = false;
    this.curContext = `${appIdKey}.${newPage}`;
  }

  this.windowHandleCache = pageArray;
};

extensions.getLatestWebviewContextForTitle = async function (regExp) {
  let contexts = await this.getContextsAndViews();
  let matchingCtx;

  for (let ctx of contexts) {
    if (ctx.view && (ctx.view.title && ctx.view.title.match(regExp) || ctx.view.url && ctx.view.url.match(regExp))) {
      if (ctx.view.url !== 'about:blank') {
        matchingCtx = ctx;
      } else {
        if (parseFloat(this.iosSdkVersion) < 7 || parseFloat(this.iosSdkVersion) >= 9 || this.opts.platformVersion === '7.1' && this.opts.app && this.opts.app.toLowerCase() !== 'safari') {
          matchingCtx = ctx;
        }
      }

      break;
    }
  }

  return matchingCtx ? matchingCtx.id : undefined;
};

extensions.useNewSafari = function () {
  return parseFloat(this.iosSdkVersion) >= 8.1 && parseFloat(this.opts.platformVersion) >= 8.1 && !this.isRealDevice() && this.opts.safari;
};

extensions.navToInitialWebview = async function () {
  let timeout = 0;

  if (this.isRealDevice()) {
    timeout = 3000;

    _logger.default.debug(`Waiting for ${timeout} ms before navigating to view.`);
  }

  await _bluebird.default.delay(timeout);

  if (this.useNewSafari()) {
    await this.typeAndNavToUrl();
  } else if (parseInt(this.iosSdkVersion, 10) >= 7 && !this.isRealDevice() && this.opts.safari) {
    await this.navToViewThroughFavorites();
  } else {
    await this.navToViewWithTitle(/.*/);
  }
};

async function openNewPage() {
  let newPageButton = await this.findElement('xpath', "//UIAButton[contains(@name,'New page')]");
  await this.nativeTap(newPageButton.ELEMENT);
}

extensions.typeAndNavToUrl = async function () {
  let address = this.opts.address ? this.opts.address : '127.0.0.1';
  this.setCurrentUrl(this.caps.safariInitialUrl || `http://${address}:${this.opts.port}/welcome`);
  let tries = 0;
  const MAX_TRIES = 2;

  let navigate = async () => {
    let oldImpWait = this.implicitWaitMs;
    this.implicitWaitMs = 7000;
    let el = await (0, _asyncbox.retryInterval)(3, 1000, async () => {
      return await this.findElement('accessibility id', 'URL');
    });
    this.implicitWaitMs = oldImpWait;

    try {
      await this.nativeTap(el.ELEMENT);
    } catch (err) {
      if (_lodash.default.includes(err.message, 'could not be tapped')) {
        if (tries++ >= MAX_TRIES) throw err;
        await openNewPage();
        return await navigate();
      } else {
        throw err;
      }
    }

    try {
      let el = await this.findElement('class name', 'UIATextField');
      await this.setValueImmediate(this.getCurrentUrl(), el);
    } catch (err) {
      if (tries++ >= MAX_TRIES) throw err;
      return await navigate();
    }

    try {
      el = await this.findElement('accessibility id', 'Go');
      await this.nativeTap(el.ELEMENT);
    } catch (err) {
      if (_lodash.default.includes(err.message, 'could not be tapped')) {
        _logger.default.error('Unable to submit URL because \'Go\' button could not be tapped. ' + 'Please make sure your keyboard is toggled on.');
      }

      throw err;
    }

    await this.navToViewWithTitle(undefined, new RegExp(this.getCurrentUrl(), 'i'));
    await this.remote.pageUnload();
  };

  await navigate();
};

extensions.navToViewThroughFavorites = async function () {
  _logger.default.debug('We are on iOS7+ simulator: clicking apple button to get into a webview');

  let oldImpWait = this.implicitWaitMs;
  this.implicitWaitMs = 7000;
  let el;

  try {
    el = await this.findElement('xpath', '//UIAScrollView[1]/UIAButton[1]');
  } catch (err) {
    let msg = 'Could not find button to click to get into webview. ' + 'Proceeding on the assumption we have a working one.';

    _logger.default.error(msg);

    this.implicitWaitMs = oldImpWait;
    return await this.navToViewWithTitle(/.*/i);
  }

  this.implicitWaitMs = oldImpWait;

  try {
    await this.nativeTap(el.ELEMENT);
  } catch (err) {
    let msg = 'Could not click button to get into webview. ' + 'Proceeding on the assumption we have a working one.';

    _logger.default.error(msg);
  }

  await this.navToViewWithTitle(/apple/i);
};

extensions.navToViewWithTitle = async function (titleRegex, urlRegExp) {
  _logger.default.debug('Navigating to most recently opened webview');

  let start = Date.now();
  let spinTime = 500;

  let spinHandles = async () => {
    let res;

    try {
      res = await this.getLatestWebviewContextForTitle(titleRegex || urlRegExp);
    } catch (err) {
      if (!err.message.includes('Could not connect to a valid app after')) {
        const error = new Error(`Could not navigate to webview! Err: ${err.message}`);
        error.stack += `\nCaused by: ${err.stack}`;
        throw error;
      }

      _logger.default.debug('Could not navigate to webview. Retrying if possible.');
    }

    if (res) {
      let latestWindow = res;

      _logger.default.debug(`Picking webview '${latestWindow}'`);

      await this.setContext(latestWindow);
      await this.remote.cancelPageLoad();
      return;
    }

    if (Date.now() - start >= 90000) {
      throw new Error('Could not navigate to webview; there are none!');
    }

    _logger.default.warn("Could not find any webviews yet, refreshing/retrying");

    if (this.isRealDevice() || !this.opts.safari) {
      await _bluebird.default.delay(spinTime);
      return await spinHandles();
    }

    let element;

    try {
      _logger.default.debug('Finding and tapping reload button');

      element = await this.findUIElementOrElements('accessibility id', 'ReloadButton', '', false);
      await this.nativeTap(element.ELEMENT);
    } catch (err) {
      _logger.default.warn(`Error finding and tapping reload button: ${err.message}`);

      _logger.default.warn('Retrying.');

      await _bluebird.default.delay(spinTime);
    }

    return await spinHandles();
  };

  await spinHandles();
};

helpers.closeAlertBeforeTest = async function () {
  let present = await this.uiAutoClient.sendCommand('au.alertIsPresent()');

  if (!present) {
    return false;
  }

  _logger.default.debug('Alert present before starting test, let us banish it');

  await this.uiAutoClient.sendCommand('au.dismissAlert()');

  _logger.default.debug('Alert banished!');

  return true;
};

helpers.stopRemote = async function (closeWindowBeforeDisconnecting = false) {
  if (!this.remote) {
    _logger.default.errorAndThrow('Tried to leave a web frame but were not in one');
  }

  if (closeWindowBeforeDisconnecting) {
    await this.closeWindow();
  }

  await this.remote.disconnect();
  this.curContext = null;
  this.curWebFrames = [];
  this.curWebCoords = null;
  this.remote = null;
};

helpers.isWebContext = function () {
  return !!this.curContext && this.curContext !== NATIVE_WIN;
};

helpers.setCurrentUrl = function (url) {
  this._currentUrl = url;
};

helpers.getCurrentUrl = function () {
  return this._currentUrl;
};

Object.assign(extensions, commands, helpers);
var _default = extensions;
exports.default = _default;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9jb21tYW5kcy9jb250ZXh0LmpzIl0sIm5hbWVzIjpbIk5BVElWRV9XSU4iLCJXRUJWSUVXX1dJTiIsIldFQlZJRVdfQkFTRSIsImNvbW1hbmRzIiwiaGVscGVycyIsImV4dGVuc2lvbnMiLCJnZXRDdXJyZW50Q29udGV4dCIsImN1ckNvbnRleHQiLCJnZXRDb250ZXh0cyIsImxvZ2dlciIsImRlYnVnIiwiY29udGV4dHMiLCJnZXRDb250ZXh0c0FuZFZpZXdzIiwibWFwRm4iLCJjb250ZXh0IiwiaWQiLCJ0b1N0cmluZyIsIm9wdHMiLCJmdWxsQ29udGV4dExpc3QiLCJ0aXRsZSIsInZpZXciLCJ1cmwiLCJtYXAiLCJzZXRDb250ZXh0IiwibmFtZSIsImNhbGxiYWNrIiwic2tpcFJlYWR5Q2hlY2siLCJhbHJlYWR5SW5Db250ZXh0IiwiZGVzaXJlZCIsImN1cnJlbnQiLCJpc1JlYWxEZXZpY2UiLCJyZW1vdGUiLCJkaXNjb25uZWN0IiwiXyIsImlzVW5kZWZpbmVkIiwiY29udGV4dElkIiwicmVwbGFjZSIsImluY2x1ZGVzIiwiZXJyb3JzIiwiTm9TdWNoQ29udGV4dEVycm9yIiwiY29ubmVjdCIsImFwcElkS2V5IiwicGFnZUlkS2V5Iiwic3BsaXQiLCJwYXJzZUludCIsInNlbGVjdFBhZ2UiLCJlbmFibGVQZXJmb3JtYW5jZUxvZ2dpbmciLCJsb2dzIiwicGVyZm9ybWFuY2UiLCJJT1NQZXJmb3JtYW5jZUxvZyIsInN0YXJ0Q2FwdHVyZSIsImdldFdpbmRvd0hhbmRsZSIsImlzV2ViQ29udGV4dCIsIk5vdEltcGxlbWVudGVkRXJyb3IiLCJnZXRXaW5kb3dIYW5kbGVzIiwid2luZG93SGFuZGxlQ2FjaGUiLCJsaXN0V2ViRnJhbWVzIiwiaWRBcnJheSIsInNldFdpbmRvdyIsIk5vU3VjaFdpbmRvd0Vycm9yIiwiY3VyV2luZG93SGFuZGxlIiwid2ViQ29udGV4dEluZGV4IiwiaW5pdEF1dG9XZWJ2aWV3IiwiYXV0b1dlYnZpZXciLCJuYXZUb0luaXRpYWxXZWJ2aWV3IiwidXNlVXJsIiwid2Vidmlld3MiLCJjdHhzIiwicHVzaCIsImdldE5ld1JlbW90ZURlYnVnZ2VyIiwiUmVtb3RlRGVidWdnZXIiLCJidW5kbGVJZCIsInVzZU5ld1NhZmFyaSIsInBhZ2VMb2FkTXMiLCJwbGF0Zm9ybVZlcnNpb24iLCJyZW1vdGVEZWJ1Z1Byb3h5IiwiZ2FyYmFnZUNvbGxlY3RPbkV4ZWN1dGUiLCJ1dGlsIiwiaGFzVmFsdWUiLCJzYWZhcmlHYXJiYWdlQ29sbGVjdCIsImVycm9yQW5kVGhyb3ciLCJnZXRDdXJyZW50VXJsIiwiY3VycmVudFVybCIsInVuZGVmaW5lZCIsInBhZ2VBcnJheSIsInBhZ2VBcnJheUZyb21Kc29uIiwiaWdub3JlQWJvdXRCbGFua1VybCIsInNlbGVjdEFwcCIsIndlYnZpZXdDb25uZWN0UmV0cmllcyIsIldlYktpdFJlbW90ZURlYnVnZ2VyIiwicG9ydCIsIndlYmtpdERlYnVnUHJveHlQb3J0Iiwid2Via2l0UmVzcG9uc2VUaW1lb3V0IiwiZXJyIiwibWVzc2FnZSIsIndhcm4iLCJhcHBJbmZvIiwib24iLCJFVkVOVF9QQUdFX0NIQU5HRSIsIm9uUGFnZUNoYW5nZSIsImJpbmQiLCJFVkVOVF9GUkFNRVNfREVUQUNIRUQiLCJpc0VtcHR5IiwiY3VyV2ViRnJhbWVzIiwibGVuZ3RoIiwiam9pbiIsInRyeUNsb3NpbmdBbGVydCIsImRpZERpc21pc3MiLCJjbG9zZUFsZXJ0QmVmb3JlVGVzdCIsIkVycm9yIiwicGFnZUNoYW5nZU5vdGlmaWNhdGlvbiIsIkpTT04iLCJzdHJpbmdpZnkiLCJzZWxlY3RpbmdOZXdQYWdlIiwiaXNDb25uZWN0ZWQiLCJuZXdJZHMiLCJuZXdQYWdlcyIsImtleUlkIiwicGFnZSIsImlzS2V5IiwiY3VyQXBwSWRLZXkiLCJjdXJQYWdlSWRLZXkiLCJuZXdQYWdlIiwibGFzdCIsImVycm9yIiwic2V0Q3VycmVudFVybCIsIm5lZWRzUGFnZUxvYWQiLCJjb250ZXh0QXJyYXkiLCJpc0VxdWFsIiwiZmluZCIsInBhZ2VMb2FkIiwiY3VycmVudFBhZ2VJZCIsInAiLCJnZXRMYXRlc3RXZWJ2aWV3Q29udGV4dEZvclRpdGxlIiwicmVnRXhwIiwibWF0Y2hpbmdDdHgiLCJjdHgiLCJtYXRjaCIsInBhcnNlRmxvYXQiLCJpb3NTZGtWZXJzaW9uIiwiYXBwIiwidG9Mb3dlckNhc2UiLCJzYWZhcmkiLCJ0aW1lb3V0IiwiQiIsImRlbGF5IiwidHlwZUFuZE5hdlRvVXJsIiwibmF2VG9WaWV3VGhyb3VnaEZhdm9yaXRlcyIsIm5hdlRvVmlld1dpdGhUaXRsZSIsIm9wZW5OZXdQYWdlIiwibmV3UGFnZUJ1dHRvbiIsImZpbmRFbGVtZW50IiwibmF0aXZlVGFwIiwiRUxFTUVOVCIsImFkZHJlc3MiLCJjYXBzIiwic2FmYXJpSW5pdGlhbFVybCIsInRyaWVzIiwiTUFYX1RSSUVTIiwibmF2aWdhdGUiLCJvbGRJbXBXYWl0IiwiaW1wbGljaXRXYWl0TXMiLCJlbCIsInNldFZhbHVlSW1tZWRpYXRlIiwiUmVnRXhwIiwicGFnZVVubG9hZCIsIm1zZyIsInRpdGxlUmVnZXgiLCJ1cmxSZWdFeHAiLCJzdGFydCIsIkRhdGUiLCJub3ciLCJzcGluVGltZSIsInNwaW5IYW5kbGVzIiwicmVzIiwic3RhY2siLCJsYXRlc3RXaW5kb3ciLCJjYW5jZWxQYWdlTG9hZCIsImVsZW1lbnQiLCJmaW5kVUlFbGVtZW50T3JFbGVtZW50cyIsInByZXNlbnQiLCJ1aUF1dG9DbGllbnQiLCJzZW5kQ29tbWFuZCIsInN0b3BSZW1vdGUiLCJjbG9zZVdpbmRvd0JlZm9yZURpc2Nvbm5lY3RpbmciLCJjbG9zZVdpbmRvdyIsImN1cldlYkNvb3JkcyIsIl9jdXJyZW50VXJsIiwiT2JqZWN0IiwiYXNzaWduIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUdBLE1BQU1BLFVBQVUsR0FBRyxZQUFuQjs7QUFDQSxNQUFNQyxXQUFXLEdBQUcsU0FBcEI7O0FBQ0EsTUFB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QUNELENBRkQ7O0FBS0FDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjeEwsVUFBZCxFQUEwQkYsUUFBMUIsRUFBb0NDLE9BQXBDO2VBRWVDLFUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IEIgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IHsgcmV0cnlJbnRlcnZhbCB9IGZyb20gJ2FzeW5jYm94JztcbmltcG9ydCB7IFJlbW90ZURlYnVnZ2VyLCBXZWJLaXRSZW1vdGVEZWJ1Z2dlciB9IGZyb20gJ2FwcGl1bS1yZW1vdGUtZGVidWdnZXInO1xuaW1wb3J0IElPU1BlcmZvcm1hbmNlTG9nIGZyb20gJy4uL2RldmljZS1sb2cvaW9zLXBlcmZvcm1hbmNlLWxvZyc7XG5pbXBvcnQgeyBlcnJvcnMgfSBmcm9tICdhcHBpdW0tYmFzZS1kcml2ZXInO1xuaW1wb3J0IGxvZ2dlciBmcm9tICcuLi9sb2dnZXInO1xuaW1wb3J0IHsgdXRpbCB9IGZyb20gJ2FwcGl1bS1zdXBwb3J0JztcblxuXG5jb25zdCBOQVRJVkVfV0lOID0gJ05BVElWRV9BUFAnO1xuY29uc3QgV0VCVklFV19XSU4gPSAnV0VCVklFVyc7XG5jb25zdCBXRUJWSUVXX0JBU0UgPSBgJHtXRUJWSUVXX1dJTn1fYDtcblxubGV0IGNvbW1hbmRzID0ge30sIGhlbHBlcnMgPSB7fSwgZXh0ZW5zaW9ucyA9IHt9O1xuXG5jb21tYW5kcy5nZXRDdXJyZW50Q29udGV4dCA9IGFzeW5jIGZ1bmN0aW9uICgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSByZXF1aXJlLWF3YWl0XG4gIGlmICh0aGlzLmN1ckNvbnRleHQgJiYgdGhpcy5jdXJDb250ZXh0ICE9PSBOQVRJVkVfV0lOKSB7XG4gICAgcmV0dXJuIGAke1dFQlZJRVdfQkFTRX0ke3RoaXMuY3VyQ29udGV4dH1gO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBOQVRJVkVfV0lOO1xuICB9XG59O1xuXG5jb21tYW5kcy5nZXRDb250ZXh0cyA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgbG9nZ2VyLmRlYnVnKCdHZXR0aW5nIGxpc3Qgb2YgYXZhaWxhYmxlIGNvbnRleHRzJyk7XG4gIGxldCBjb250ZXh0cyA9IGF3YWl0IHRoaXMuZ2V0Q29udGV4dHNBbmRWaWV3cyhmYWxzZSk7XG5cbiAgbGV0IG1hcEZuID0gKGNvbnRleHQpID0+IGNvbnRleHQuaWQudG9TdHJpbmcoKTtcbiAgaWYgKHRoaXMub3B0cy5mdWxsQ29udGV4dExpc3QpIHtcbiAgICBtYXBGbiA9IChjb250ZXh0KSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogY29udGV4dC5pZC50b1N0cmluZygpLFxuICAgICAgICB0aXRsZTogY29udGV4dC52aWV3LnRpdGxlLFxuICAgICAgICB1cmw6IGNvbnRleHQudmlldy51cmwsXG4gICAgICB9O1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIGNvbnRleHRzLm1hcChtYXBGbik7XG59O1xuXG5jb21tYW5kcy5zZXRDb250ZXh0ID0gYXN5bmMgZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrLCBza2lwUmVhZHlDaGVjaykge1xuICBmdW5jdGlvbiBhbHJlYWR5SW5Db250ZXh0IChkZXNpcmVkLCBjdXJyZW50KSB7XG4gICAgcmV0dXJuIChkZXNpcmVkID09PSBjdXJyZW50IHx8XG4gICAgICAgICAgIChkZXNpcmVkID09PSBudWxsICYmIGN1cnJlbnQgPT09IE5BVElWRV9XSU4pIHx8XG4gICAgICAgICAgIChkZXNpcmVkID09PSBOQVRJVkVfV0lOICYmIGN1cnJlbnQgPT09IG51bGwpKTtcbiAgfVxuXG4gIGxvZ2dlci5kZWJ1ZyhgQXR0ZW1wdGluZyB0byBzZXQgY29udGV4dCB0byAnJHtuYW1lfSdgKTtcbiAgaWYgKGFscmVhZHlJbkNvbnRleHQobmFtZSwgdGhpcy5jdXJDb250ZXh0KSkge1xuICAgIC8vIGFscmVhZHkgaW4gdGhlIG5hbWVkIGNvbnRleHQsIG5vIG5lZWQgdG8gZG8gYW55dGhpbmdcbiAgfSBlbHNlIGlmIChuYW1lID09PSBOQVRJVkVfV0lOIHx8IG5hbWUgPT09IG51bGwpIHtcbiAgICAvLyBzd2l0Y2hpbmcgaW50byB0aGUgbmF0aXZlIGNvbnRleHRcbiAgICB0aGlzLmN1ckNvbnRleHQgPSBudWxsO1xuICAgIGlmICh0aGlzLmlzUmVhbERldmljZSgpKSB7XG4gICAgICB0aGlzLnJlbW90ZS5kaXNjb25uZWN0KCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHN3aXRjaGluZyBpbnRvIGEgd2VidmlldyBjb250ZXh0XG5cbiAgICAvLyBpZiBjb250ZXh0cyBoYXZlIG5vdCBhbHJlYWR5IGJlZW4gcmV0cmlldmVkLCBnZXQgdGhlbVxuICAgIGlmIChfLmlzVW5kZWZpbmVkKHRoaXMuY29udGV4dHMpKSB7XG4gICAgICBhd2FpdCB0aGlzLmdldENvbnRleHRzKCk7XG4gICAgfVxuXG4gICAgbGV0IGNvbnRleHRJZCA9IG5hbWUucmVwbGFjZShXRUJWSUVXX0JBU0UsICcnKTtcbiAgICBpZiAoY29udGV4dElkID09PSAnJykge1xuICAgICAgLy8gYWxsb3cgdXNlciB0byBwYXNzIGluIFwiV0VCVklFV1wiIHdpdGhvdXQgYW4gaW5kZXhcbiAgICAgIC8vIHRoZSBzZWNvbmQgY29udGV4dCB3aWxsIGJlIHRoZSBmaXJzdCB3ZWJ2aWV3IGFzXG4gICAgICAvLyB0aGUgZmlyc3QgaXMgYWx3YXlzIE5BVElWRV9BUFBcbiAgICAgIGNvbnRleHRJZCA9IHRoaXMuY29udGV4dHNbMV07XG4gICAgfVxuICAgIGlmICghXy5pbmNsdWRlcyh0aGlzLmNvbnRleHRzLCBjb250ZXh0SWQpKSB7XG4gICAgICB0aHJvdyBuZXcgZXJyb3JzLk5vU3VjaENvbnRleHRFcnJvcigpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzUmVhbERldmljZSgpKSB7XG4gICAgICBpZiAodGhpcy5yZW1vdGUpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW1vdGUuZGlzY29ubmVjdCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5jdXJDb250ZXh0ID0gY29udGV4dElkO1xuICAgICAgYXdhaXQgdGhpcy5yZW1vdGUuY29ubmVjdChjb250ZXh0SWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBgY29udGV4dElkYCB3aWxsIGJlIGluIHRoZSBmb3JtIG9mIGBhcHBJZC5wYWdlSWRgIGluIHRoaXMgY2FzZVxuICAgICAgbGV0IFthcHBJZEtleSwgcGFnZUlkS2V5XSA9IF8ubWFwKGNvbnRleHRJZC5zcGxpdCgnLicpLCAoaWQpID0+IHBhcnNlSW50KGlkLCAxMCkpO1xuICAgICAgYXdhaXQgdGhpcy5yZW1vdGUuc2VsZWN0UGFnZShhcHBJZEtleSwgcGFnZUlkS2V5LCBza2lwUmVhZHlDaGVjayk7XG4gICAgICB0aGlzLmN1ckNvbnRleHQgPSBjb250ZXh0SWQ7XG4gICAgfVxuICB9XG5cbiAgLy8gYXR0ZW1wdCB0byBzdGFydCBwZXJmb3JtYW5jZSBsb2dnaW5nLCBpZiByZXF1ZXN0ZWRcbiAgaWYgKHRoaXMub3B0cy5lbmFibGVQZXJmb3JtYW5jZUxvZ2dpbmcgJiYgdGhpcy5yZW1vdGUpIHtcbiAgICBsb2dnZXIuZGVidWcoYFN0YXJ0aW5nIHBlcmZvcm1hbmNlIGxvZyBvbiAnJHt0aGlzLmN1ckNvbnRleHR9J2ApO1xuICAgIHRoaXMubG9ncy5wZXJmb3JtYW5jZSA9IG5ldyBJT1NQZXJmb3JtYW5jZUxvZyh0aGlzLnJlbW90ZSk7XG4gICAgYXdhaXQgdGhpcy5sb2dzLnBlcmZvcm1hbmNlLnN0YXJ0Q2FwdHVyZSgpO1xuICB9XG59O1xuXG5jb21tYW5kcy5nZXRXaW5kb3dIYW5kbGUgPSBhc3luYyBmdW5jdGlvbiAoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcmVxdWlyZS1hd2FpdFxuICBpZiAoIXRoaXMuaXNXZWJDb250ZXh0KCkpIHtcbiAgICB0aHJvdyBuZXcgZXJyb3JzLk5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxuICByZXR1cm4gdGhpcy5jdXJDb250ZXh0LnRvU3RyaW5nKCk7XG59O1xuXG5jb21tYW5kcy5nZXRXaW5kb3dIYW5kbGVzID0gYXN5bmMgZnVuY3Rpb24gKCkge1xuICBpZiAoIXRoaXMuaXNXZWJDb250ZXh0KCkpIHtcbiAgICB0aHJvdyBuZXcgZXJyb3JzLk5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxuXG4gIHRoaXMud2luZG93SGFuZGxlQ2FjaGUgPSBhd2FpdCB0aGlzLmxpc3RXZWJGcmFtZXMoZmFsc2UpO1xuICBjb25zdCBpZEFycmF5ID0gXy5tYXAodGhpcy53aW5kb3dIYW5kbGVDYWNoZSwgJ2lkJyk7XG4gIC8vIHNpbmNlIHdlIHVzZSB0aGlzLmNvbnRleHRzIHRvIG1hbmFnZSBzZWxlY3RpbmcgZGVidWdnZXIgcGFnZXMsIG1ha2VcbiAgLy8gc3VyZSBpdCBnZXRzIHBvcHVsYXRlZCBldmVuIGlmIHNvbWVvbmUgZGlkIG5vdCB1c2UgdGhlXG4gIC8vIGdldENvbnRleHRzIG1ldGhvZFxuICBpZiAoIXRoaXMuY29udGV4dHMpIHtcbiAgICB0aGlzLmNvbnRleHRzID0gaWRBcnJheTtcbiAgfVxuICByZXR1cm4gXy5tYXAoaWRBcnJheSwgKGlkKSA9PiBpZC50b1N0cmluZygpKTtcbn07XG5cbmNvbW1hbmRzLnNldFdpbmRvdyA9IGFzeW5jIGZ1bmN0aW9uIChuYW1lLCBza2lwUmVhZHlDaGVjaykge1xuICBpZiAoIXRoaXMuaXNXZWJDb250ZXh0KCkpIHtcbiAgICB0aHJvdyBuZXcgZXJyb3JzLk5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxuXG4gIGlmICghXy5pbmNsdWRlcyhfLm1hcCh0aGlzLndpbmRvd0hhbmRsZUNhY2hlLCAnaWQnKSwgbmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgZXJyb3JzLk5vU3VjaFdpbmRvd0Vycm9yKCk7XG4gIH1cbiAgbGV0IHBhZ2VJZEtleSA9IHBhcnNlSW50KG5hbWUsIDEwKTtcbiAgaWYgKCF0aGlzLmlzUmVhbERldmljZSgpKSB7XG4gICAgYXdhaXQgdGhpcy5yZW1vdGUuc2VsZWN0UGFnZShwYWdlSWRLZXksIHNraXBSZWFkeUNoZWNrKTtcbiAgICB0aGlzLmN1ckNvbnRleHQgPSB0aGlzLmN1cldpbmRvd0hhbmRsZSA9IG5hbWU7XG4gIH0gZWxzZSB7XG4gICAgaWYgKG5hbWUgPT09IHRoaXMuY3VyV2luZG93SGFuZGxlKSB7XG4gICAgICBsb2dnZXIuZGVidWcoYFJlbW90ZSBkZWJ1Z2dlciBpcyBhbHJlYWR5IGNvbm5lY3RlZCB0byB3aW5kb3cgJyR7bmFtZX0nYCk7XG4gICAgfSBlbHNlIGlmICghXy5pbmNsdWRlcyhfLm1hcCh0aGlzLndpbmRvd0hhbmRsZUNhY2hlLCAnaWQnKSwgbmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBlcnJvcnMuTm9TdWNoV2luZG93RXJyb3IoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5yZW1vdGUuZGlzY29ubmVjdCgpO1xuICAgICAgdGhpcy5jdXJDb250ZXh0ID0gdGhpcy5jdXJXaW5kb3dIYW5kbGUgPSBuYW1lO1xuICAgICAgYXdhaXQgdGhpcy5yZW1vdGUuY29ubmVjdChuYW1lKTtcbiAgICB9XG4gIH1cbn07XG5cbmhlbHBlcnMud2ViQ29udGV4dEluZGV4ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5jdXJDb250ZXh0LnJlcGxhY2UoV0VCVklFV19CQVNFLCAnJykgLSAxO1xufTtcblxuZXh0ZW5zaW9ucy5pbml0QXV0b1dlYnZpZXcgPSBhc3luYyBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm9wdHMuYXV0b1dlYnZpZXcpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1NldHRpbmcgYXV0byB3ZWJ2aWV3Jyk7XG4gICAgYXdhaXQgdGhpcy5uYXZUb0luaXRpYWxXZWJ2aWV3KHRoaXMpO1xuICB9XG59O1xuXG5leHRlbnNpb25zLmdldENvbnRleHRzQW5kVmlld3MgPSBhc3luYyBmdW5jdGlvbiAodXNlVXJsID0gdHJ1ZSkge1xuICBsb2dnZXIuZGVidWcoJ1JldHJpZXZpbmcgY29udGV4dHMgYW5kIHZpZXdzJyk7XG4gIGxldCB3ZWJ2aWV3cyA9IGF3YWl0IHRoaXMubGlzdFdlYkZyYW1lcyh1c2VVcmwpO1xuXG4gIGxldCBjdHhzID0gW3tpZDogTkFUSVZFX1dJTiwgdmlldzoge319XTtcbiAgdGhpcy5jb250ZXh0cyA9IFtOQVRJVkVfV0lOXTtcbiAgZm9yIChsZXQgdmlldyBvZiB3ZWJ2aWV3cykge1xuICAgIGN0eHMucHVzaCh7aWQ6IGAke1dFQlZJRVdfQkFTRX0ke3ZpZXcuaWR9YCwgdmlld30pO1xuICAgIHRoaXMuY29udGV4dHMucHVzaCh2aWV3LmlkLnRvU3RyaW5nKCkpO1xuICB9XG4gIHJldHVybiBjdHhzO1xufTtcblxuZXh0ZW5zaW9ucy5nZXROZXdSZW1vdGVEZWJ1Z2dlciA9IGFzeW5jIGZ1bmN0aW9uICgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSByZXF1aXJlLWF3YWl0XG4gIHJldHVybiBuZXcgUmVtb3RlRGVidWdnZXIoe1xuICAgIGJ1bmRsZUlkOiB0aGlzLm9wdHMuYnVuZGxlSWQsXG4gICAgdXNlTmV3U2FmYXJpOiB0aGlzLnVzZU5ld1NhZmFyaSgpLFxuICAgIHBhZ2VMb2FkTXM6IHRoaXMucGFnZUxvYWRNcyxcbiAgICBwbGF0Zm9ybVZlcnNpb246IHRoaXMub3B0cy5wbGF0Zm9ybVZlcnNpb24sXG4gICAgcmVtb3RlRGVidWdQcm94eTogdGhpcy5vcHRzLnJlbW90ZURlYnVnUHJveHksXG4gICAgZ2FyYmFnZUNvbGxlY3RPbkV4ZWN1dGU6IHV0aWwuaGFzVmFsdWUodGhpcy5vcHRzLnNhZmFyaUdhcmJhZ2VDb2xsZWN0KVxuICAgICAgPyAhIXRoaXMub3B0cy5zYWZhcmlHYXJiYWdlQ29sbGVjdFxuICAgICAgOiB0cnVlLFxuICB9KTtcbn07XG5cbmV4dGVuc2lvbnMubGlzdFdlYkZyYW1lcyA9IGFzeW5jIGZ1bmN0aW9uICh1c2VVcmwgPSB0cnVlKSB7XG4gIGlmICghdGhpcy5vcHRzLmJ1bmRsZUlkKSB7XG4gICAgbG9nZ2VyLmVycm9yQW5kVGhyb3coJ0Nhbm5vdCBlbnRlciB3ZWIgZnJhbWUgd2l0aG91dCBhIGJ1bmRsZSBJRCcpO1xuICB9XG5cbiAgdXNlVXJsID0gdXNlVXJsICYmICEhdGhpcy5nZXRDdXJyZW50VXJsKCk7XG4gIGxvZ2dlci5kZWJ1ZyhgU2VsZWN0aW5nIGJ5IHVybDogJHt1c2VVcmx9ICR7dXNlVXJsID8gYChleHBlY3RlZCB1cmw6ICcke3RoaXMuZ2V0Q3VycmVudFVybCgpfScpYCA6ICcnfWApO1xuXG4gIGxldCBjdXJyZW50VXJsID0gdXNlVXJsID8gdGhpcy5nZXRDdXJyZW50VXJsKCkgOiB1bmRlZmluZWQ7XG4gIGxldCBwYWdlQXJyYXk7XG4gIGlmICh0aGlzLmlzUmVhbERldmljZSgpICYmIHRoaXMucmVtb3RlICYmIHRoaXMub3B0cy5idW5kbGVJZCkge1xuICAgIC8vIHJlYWwgZGV2aWNlLCBhbmQgYWxyZWFkeSBjb25uZWN0ZWRcbiAgICBwYWdlQXJyYXkgPSBhd2FpdCB0aGlzLnJlbW90ZS5wYWdlQXJyYXlGcm9tSnNvbih0aGlzLm9wdHMuaWdub3JlQWJvdXRCbGFua1VybCk7XG4gIH0gZWxzZSBpZiAodGhpcy5yZW1vdGUgJiYgdGhpcy5yZW1vdGUuYXBwSWRLZXkpIHtcbiAgICAvLyBzaW11bGF0b3IsIGFuZCBhbHJlYWR5IGNvbm5lY3RlZFxuICAgIHBhZ2VBcnJheSA9IGF3YWl0IHRoaXMucmVtb3RlLnNlbGVjdEFwcChjdXJyZW50VXJsLCB0aGlzLm9wdHMud2Vidmlld0Nvbm5lY3RSZXRyaWVzLCB0aGlzLm9wdHMuaWdub3JlQWJvdXRCbGFua1VybCk7XG4gIH0gZWxzZSBpZiAodGhpcy5pc1JlYWxEZXZpY2UoKSkge1xuICAgIC8vIHJlYWwgZGV2aWNlLCBhbmQgbm90IGNvbm5lY3RlZFxuICAgIHRyeSB7XG4gICAgICB0aGlzLnJlbW90ZSA9IG5ldyBXZWJLaXRSZW1vdGVEZWJ1Z2dlcih7XG4gICAgICAgIHBvcnQ6IHRoaXMub3B0cy53ZWJraXREZWJ1Z1Byb3h5UG9ydCxcbiAgICAgICAgd2Via2l0UmVzcG9uc2VUaW1lb3V0OiB0aGlzLm9wdHMud2Via2l0UmVzcG9uc2VUaW1lb3V0LFxuICAgICAgfSk7XG4gICAgICBwYWdlQXJyYXkgPSBhd2FpdCB0aGlzLnJlbW90ZS5wYWdlQXJyYXlGcm9tSnNvbih0aGlzLm9wdHMuaWdub3JlQWJvdXRCbGFua1VybCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBpdCBpcyByZWFzb25hYmxlIHRvIGV4cGVjdCB0aGF0IHRoaXMgbWlnaHQgYmUgY2FsbGVkIHdoZW4gdGhlcmUgaXMgbm9cbiAgICAgIC8vIHdlYmtpdCByZW1vdGUgZGVidWdnZXIgdG8gY29ubmVjdCB0b1xuICAgICAgaWYgKCFfLmluY2x1ZGVzKGVyci5tZXNzYWdlLCAnY29ubmVjdCBFQ09OTlJFRlVTRUQnKSkgdGhyb3cgZXJyOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5XG5cbiAgICAgIGxvZ2dlci53YXJuKCdBdHRlbXB0ZWQgdG8gZ2V0IGEgbGlzdCBvZiB3ZWJ2aWV3IGNvbnRleHRzIGJ1dCBjb3VsZCBub3QgY29ubmVjdCB0byAnICtcbiAgICAgICAgICAgICAgICAgICdpb3Mtd2Via2l0LWRlYnVnLXByb3h5LiBJZiB5b3UgZXhwZWN0IHRvIGZpbmQgd2Vidmlld3MsIHBsZWFzZSBlbnN1cmUgJyArXG4gICAgICAgICAgICAgICAgICAndGhhdCB0aGUgcHJveHkgaXMgcnVubmluZyBhbmQgYWNjZXNzaWJsZScpO1xuICAgICAgdGhpcy5yZW1vdGUgPSBudWxsO1xuICAgICAgcGFnZUFycmF5ID0gW107XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHNpbXVsYXRvciwgYW5kIG5vdCBjb25uZWN0ZWRcbiAgICB0aGlzLnJlbW90ZSA9IGF3YWl0IHRoaXMuZ2V0TmV3UmVtb3RlRGVidWdnZXIoKTtcblxuICAgIGxldCBhcHBJbmZvID0gYXdhaXQgdGhpcy5yZW1vdGUuY29ubmVjdCgpO1xuICAgIGlmICghYXBwSW5mbykge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdVbmFibGUgdG8gY29ubmVjdCB0byB0aGUgcmVtb3RlIGRlYnVnZ2VyLicpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBwYWdlQXJyYXkgPSBhd2FpdCB0aGlzLnJlbW90ZS5zZWxlY3RBcHAoY3VycmVudFVybCwgdGhpcy5vcHRzLndlYnZpZXdDb25uZWN0UmV0cmllcywgdGhpcy5vcHRzLmlnbm9yZUFib3V0QmxhbmtVcmwpO1xuICAgIHRoaXMucmVtb3RlLm9uKFJlbW90ZURlYnVnZ2VyLkVWRU5UX1BBR0VfQ0hBTkdFLCB0aGlzLm9uUGFnZUNoYW5nZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW90ZS5vbihSZW1vdGVEZWJ1Z2dlci5FVkVOVF9GUkFNRVNfREVUQUNIRUQsICgpID0+IHtcbiAgICAgIGlmICghXy5pc0VtcHR5KHRoaXMuY3VyV2ViRnJhbWVzKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYENsZWFyaW5nICR7dGhpcy5jdXJXZWJGcmFtZXMubGVuZ3RofSBmcmFtZXM6ICR7dGhpcy5jdXJXZWJGcmFtZXMuam9pbignLCAnKX1gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY3VyV2ViRnJhbWVzID0gW107XG4gICAgfSk7XG5cbiAgICBsZXQgdHJ5Q2xvc2luZ0FsZXJ0ID0gYXN5bmMgKCkgPT4ge1xuICAgICAgbGV0IGRpZERpc21pc3MgPSBhd2FpdCB0aGlzLmNsb3NlQWxlcnRCZWZvcmVUZXN0KCk7XG4gICAgICBpZiAoIWRpZERpc21pc3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDbG9zZSBhbGVydCBmYWlsZWQuIFJldHJ5LicpO1xuICAgICAgfVxuICAgIH07XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHJldHJ5SW50ZXJ2YWwoMywgNDAwMCwgdHJ5Q2xvc2luZ0FsZXJ0KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIGlmIHRoZSBsb29wIHRvIGNsb3NlIGFsZXJ0cyBmYWlsZWQgdG8gZGlzbWlzcywgaWdub3JlLFxuICAgICAgLy8gb3RoZXJ3aXNlIGxvZyBhbmQgdGhyb3cgdGhlIGVycm9yXG4gICAgICBpZiAoZXJyLm1lc3NhZ2UgIT09ICdDbG9zZSBhbGVydCBmYWlsZWQuIFJldHJ5LicpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yQW5kVGhyb3coZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAocGFnZUFycmF5Lmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIHdlIGhhdmUgbm8gd2ViIGZyYW1lcywgYnV0IGNvbnRpbnVlIGFueXdheVxuICAgIGxvZ2dlci5kZWJ1ZygnTm8gd2ViIGZyYW1lcyBmb3VuZC4nKTtcbiAgfVxuICByZXR1cm4gcGFnZUFycmF5O1xufTtcblxuZXh0ZW5zaW9ucy5vblBhZ2VDaGFuZ2UgPSBhc3luYyBmdW5jdGlvbiAocGFnZUNoYW5nZU5vdGlmaWNhdGlvbikge1xuICBsb2dnZXIuZGVidWcoYFJlbW90ZSBkZWJ1Z2dlciBub3RpZmllZCB1cyBvZiBhIG5ldyBwYWdlIGxpc3Rpbmc6ICR7SlNPTi5zdHJpbmdpZnkocGFnZUNoYW5nZU5vdGlmaWNhdGlvbil9YCk7XG4gIGlmICh0aGlzLnNlbGVjdGluZ05ld1BhZ2UpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1dlIGFyZSBpbiB0aGUgbWlkZGxlIG9mIHNlbGVjdGluZyBhIHBhZ2UsIGlnbm9yaW5nJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghdGhpcy5yZW1vdGUgfHwgIXRoaXMucmVtb3RlLmlzQ29ubmVjdGVkKCkpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1dlIGhhdmUgbm90IHlldCBjb25uZWN0ZWQsIGlnbm9yaW5nJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qge2FwcElkS2V5LCBwYWdlQXJyYXl9ID0gcGFnZUNoYW5nZU5vdGlmaWNhdGlvbjtcblxuICBsZXQgbmV3SWRzID0gW107XG4gIGxldCBuZXdQYWdlcyA9IFtdO1xuICBsZXQga2V5SWQgPSBudWxsO1xuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgcGFnZUFycmF5KSB7XG4gICAgY29uc3QgaWQgPSBwYWdlLmlkLnRvU3RyaW5nKCk7XG4gICAgbmV3SWRzLnB1c2goaWQpO1xuICAgIGlmIChwYWdlLmlzS2V5KSB7XG4gICAgICBrZXlJZCA9IGlkO1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0SWQgPSBgJHthcHBJZEtleX0uJHtpZH1gO1xuXG4gICAgLy8gYWRkIGlmIHRoaXMgaXMgYSBuZXcgcGFnZVxuICAgIGlmICghXy5pbmNsdWRlcyh0aGlzLmNvbnRleHRzLCBjb250ZXh0SWQpKSB7XG4gICAgICBuZXdQYWdlcy5wdXNoKGlkKTtcbiAgICAgIHRoaXMuY29udGV4dHMucHVzaChjb250ZXh0SWQpO1xuICAgIH1cbiAgfVxuXG4gIGlmICgha2V5SWQpIHtcbiAgICAvLyBpZiB0aGVyZSBpcyBubyBrZXkgaWQsIHB1bGwgdGhlIGZpcnN0IGlkIGZyb20gdGhlIHBhZ2UgYXJyYXkgYW5kIHVzZSB0aGF0XG4gICAgLy8gYXMgYSBzdGFuZCBpblxuICAgIGxvZ2dlci5kZWJ1ZygnTm8ga2V5IGlkIGZvdW5kLiBDaG9vc2luZyBmaXJzdCBpZCBmcm9tIHBhZ2UgYXJyYXknKTtcbiAgICBrZXlJZCA9IG5ld0lkc1swXSB8fCBudWxsO1xuICB9XG5cbiAgaWYgKCF1dGlsLmhhc1ZhbHVlKHRoaXMuY3VyQ29udGV4dCkpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1dlIGRvIG5vdCBhcHBlYXIgdG8gaGF2ZSB3aW5kb3cgc2V0IHlldCwgaWdub3JpbmcnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBbY3VyQXBwSWRLZXksIGN1clBhZ2VJZEtleV0gPSB0aGlzLmN1ckNvbnRleHQuc3BsaXQoJy4nKTtcblxuICBpZiAoY3VyQXBwSWRLZXkgIT09IGFwcElkS2V5KSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdQYWdlIGNoYW5nZSBub3QgcmVmZXJyaW5nIHRvIGN1cnJlbnRseSBzZWxlY3RlZCBhcHAsIGlnbm9yaW5nLicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBuZXdQYWdlID0gbnVsbDtcbiAgaWYgKG5ld1BhZ2VzLmxlbmd0aCkge1xuICAgIG5ld1BhZ2UgPSBfLmxhc3QobmV3UGFnZXMpO1xuICAgIGxvZ2dlci5kZWJ1ZyhgV2UgaGF2ZSBuZXcgcGFnZXMsIHNlbGVjdGluZyBwYWdlICcke25ld1BhZ2V9J2ApO1xuICB9IGVsc2UgaWYgKCFfLmluY2x1ZGVzKG5ld0lkcywgY3VyUGFnZUlkS2V5KSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnTmV3IHBhZ2UgbGlzdGluZyBmcm9tIHJlbW90ZSBkZWJ1Z2dlciBkb2VzIG5vdCBjb250YWluICcgK1xuICAgICAgICAgICAgICAgICAnY3VycmVudCB3aW5kb3c7IGFzc3VtaW5nIGl0IGlzIGNsb3NlZCcpO1xuICAgIGlmICghdXRpbC5oYXNWYWx1ZShrZXlJZCkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRG8gbm90IGhhdmUgb3VyIGN1cnJlbnQgd2luZG93IGFueW1vcmUsIGFuZCB0aGVyZSAnICtcbiAgICAgICAgICAgICAgICAgICAnYXJlIG5vdCBhbnkgbW9yZSB0byBsb2FkISBEb2luZyBub3RoaW5nLi4uJyk7XG4gICAgICB0aGlzLnNldEN1cnJlbnRVcmwodW5kZWZpbmVkKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2dnZXIuZGVidWcoYERlYnVnZ2VyIGFscmVhZHkgc2VsZWN0ZWQgcGFnZSAnJHtrZXlJZH0nLCBgICtcbiAgICAgICAgICAgICAgICAgYGNvbmZpcm1pbmcgdGhhdCBjaG9pY2UuYCk7XG4gICAgdGhpcy5jdXJDb250ZXh0ID0gYCR7YXBwSWRLZXl9LiR7a2V5SWR9YDtcbiAgICBuZXdQYWdlID0ga2V5SWQ7XG4gIH0gZWxzZSB7XG4gICAgLy8gYXQgdGhpcyBwb2ludCwgdGhlcmUgYXJlIG5vIG5ldyBwYWdlcywgYW5kIHRoZSBjdXJyZW50IHBhZ2Ugc3RpbGwgZXhpc3RzXG4gICAgbG9nZ2VyLmRlYnVnKCdDaGVja2luZyBpZiBwYWdlIG5lZWRzIHRvIGxvYWQnKTtcbiAgICAvLyBJZiBhIHdpbmRvdyBuYXZpZ2F0ZXMgdG8gYW4gYW5jaG9yIGl0IGRvZXNuJ3QgYWx3YXlzIGZpcmUgYSBwYWdlXG4gICAgLy8gY2FsbGJhY2sgZXZlbnQuIExldCdzIGNoZWNrIGlmIHdlIHdvdW5kIHVwIGluIHN1Y2ggYSBzaXR1YXRpb24uXG4gICAgY29uc3QgbmVlZHNQYWdlTG9hZCA9ICgoKSA9PiB7XG4gICAgICAvLyBuZWVkIHRvIG1hcCB0aGUgcGFnZSBpZHMgdG8gY29udGV4dCBpZHNcbiAgICAgIGNvbnN0IGNvbnRleHRBcnJheSA9IF8ubWFwKHBhZ2VBcnJheSwgKHBhZ2UpID0+IGAke2FwcElkS2V5fS4ke3BhZ2UuaWR9YCk7XG4gICAgICAvLyBjaGVjayBpZiB0aGUgY3VycmVudCBjb250ZXh0IGV4aXN0cyBpbiBib3RoIG91ciByZWNvcmRlZCBjb250ZXh0cyxcbiAgICAgIC8vIGFuZCB0aGUgcGFnZSBhcnJheVxuICAgICAgcmV0dXJuICFfLmlzRXF1YWwoXy5maW5kKHRoaXMuY29udGV4dHMsIHRoaXMuY3VyQ29udGV4dCksIF8uZmluZChjb250ZXh0QXJyYXksIHRoaXMuY3VyQ29udGV4dCkpO1xuICAgIH0pKCk7XG5cbiAgICBpZiAobmVlZHNQYWdlTG9hZCkge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdQYWdlIGxvYWQgbmVlZGVkLiBMb2FkaW5nLi4uJyk7XG4gICAgICBhd2FpdCB0aGlzLnJlbW90ZS5wYWdlTG9hZCgpO1xuICAgIH1cblxuICAgIGxvZ2dlci5kZWJ1ZygnTmV3IHBhZ2UgbGlzdGluZyBpcyBzYW1lIGFzIG9sZCwgZG9pbmcgbm90aGluZycpO1xuICB9XG5cbiAgLy8gbWFrZSBzdXJlIHRoYXQgdGhlIHBhZ2UgbGlzdGluZyBpc24ndCBpbmRpY2F0aW5nIGEgcmVkaXJlY3RcbiAgaWYgKHV0aWwuaGFzVmFsdWUodGhpcy5jdXJDb250ZXh0KSkge1xuICAgIGxldCBjdXJyZW50UGFnZUlkID0gcGFyc2VJbnQoXy5sYXN0KHRoaXMuY3VyQ29udGV4dC5zcGxpdCgnLicpKSwgMTApO1xuICAgIGxldCBwYWdlID0gXy5maW5kKHBhZ2VBcnJheSwgKHApID0+IHBhcnNlSW50KHAuaWQsIDEwKSA9PT0gY3VycmVudFBhZ2VJZCk7XG4gICAgaWYgKHBhZ2UgJiYgcGFnZS51cmwgIT09IHRoaXMuZ2V0Q3VycmVudFVybCgpKSB7XG4gICAgICBsb2dnZXIuZGVidWcoYFJlZGlyZWN0ZWQgZnJvbSAnJHt0aGlzLmdldEN1cnJlbnRVcmwoKX0nIHRvICcke3BhZ2UudXJsfSdgKTtcbiAgICAgIHRoaXMuc2V0Q3VycmVudFVybChwYWdlLnVybCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHV0aWwuaGFzVmFsdWUobmV3UGFnZSkpIHtcbiAgICB0aGlzLnNlbGVjdGluZ05ld1BhZ2UgPSB0cnVlO1xuICAgIGF3YWl0IHRoaXMucmVtb3RlLnNlbGVjdFBhZ2UoYXBwSWRLZXksIHBhcnNlSW50KG5ld1BhZ2UsIDEwKSk7XG4gICAgdGhpcy5zZWxlY3RpbmdOZXdQYWdlID0gZmFsc2U7XG4gICAgdGhpcy5jdXJDb250ZXh0ID0gYCR7YXBwSWRLZXl9LiR7bmV3UGFnZX1gO1xuICB9XG4gIHRoaXMud2luZG93SGFuZGxlQ2FjaGUgPSBwYWdlQXJyYXk7XG59O1xuXG5leHRlbnNpb25zLmdldExhdGVzdFdlYnZpZXdDb250ZXh0Rm9yVGl0bGUgPSBhc3luYyBmdW5jdGlvbiAocmVnRXhwKSB7XG4gIGxldCBjb250ZXh0cyA9IGF3YWl0IHRoaXMuZ2V0Q29udGV4dHNBbmRWaWV3cygpO1xuICBsZXQgbWF0Y2hpbmdDdHg7XG4gIGZvciAobGV0IGN0eCBvZiBjb250ZXh0cykge1xuICAgIGlmIChjdHgudmlldyAmJiAoKGN0eC52aWV3LnRpdGxlICYmIGN0eC52aWV3LnRpdGxlLm1hdGNoKHJlZ0V4cCkpIHx8IChjdHgudmlldy51cmwgJiYgY3R4LnZpZXcudXJsLm1hdGNoKHJlZ0V4cCkpKSkge1xuICAgICAgaWYgKGN0eC52aWV3LnVybCAhPT0gJ2Fib3V0OmJsYW5rJykge1xuICAgICAgICBtYXRjaGluZ0N0eCA9IGN0eDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGluIHRoZSBjYXNlcyBvZiBYY29kZSA8IDUgKGkuZS4sIGlPUyBTREsgVmVyc2lvbiBsZXNzIHRoYW4gNylcbiAgICAgICAgLy8gaU9TIDcuMSwgaU9TIDkuMCAmIGlPUyA5LjEgaW4gYSB3ZWJ2aWV3IChub3QgaW4gU2FmYXJpKVxuICAgICAgICAvLyB3ZSBjYW4gaGF2ZSB0aGUgdXJsIGJlIGBhYm91dDpibGFua2BcbiAgICAgICAgaWYgKHBhcnNlRmxvYXQodGhpcy5pb3NTZGtWZXJzaW9uKSA8IDcgfHwgcGFyc2VGbG9hdCh0aGlzLmlvc1Nka1ZlcnNpb24pID49IDkgfHxcbiAgICAgICAgICAgICh0aGlzLm9wdHMucGxhdGZvcm1WZXJzaW9uID09PSAnNy4xJyAmJiB0aGlzLm9wdHMuYXBwICYmIHRoaXMub3B0cy5hcHAudG9Mb3dlckNhc2UoKSAhPT0gJ3NhZmFyaScpKSB7XG4gICAgICAgICAgbWF0Y2hpbmdDdHggPSBjdHg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWF0Y2hpbmdDdHggPyBtYXRjaGluZ0N0eC5pZCA6IHVuZGVmaW5lZDtcbn07XG5cbi8vIFJpZ2h0IG5vdyB3ZSBkb24ndCBuZWNlc3NhcmlseSB3YWl0IGZvciB3ZWJ2aWV3XG4vLyBhbmQgZnJhbWUgdG8gbG9hZCwgd2hpY2ggbGVhZHMgdG8gcmFjZSBjb25kaXRpb25zIGFuZCBmbGFraW5lc3MsXG4vLyBsZXQncyBzZWUgaWYgd2UgY2FuIHRyYW5zaXRpb24gdG8gc29tZXRoaW5nIGJldHRlclxuZXh0ZW5zaW9ucy51c2VOZXdTYWZhcmkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBwYXJzZUZsb2F0KHRoaXMuaW9zU2RrVmVyc2lvbikgPj0gOC4xICYmXG4gICAgICAgICBwYXJzZUZsb2F0KHRoaXMub3B0cy5wbGF0Zm9ybVZlcnNpb24pID49IDguMSAmJlxuICAgICAgICAgIXRoaXMuaXNSZWFsRGV2aWNlKCkgJiZcbiAgICAgICAgIHRoaXMub3B0cy5zYWZhcmk7XG59O1xuXG5leHRlbnNpb25zLm5hdlRvSW5pdGlhbFdlYnZpZXcgPSBhc3luYyBmdW5jdGlvbiAoKSB7XG4gIGxldCB0aW1lb3V0ID0gMDtcbiAgaWYgKHRoaXMuaXNSZWFsRGV2aWNlKCkpIHtcbiAgICB0aW1lb3V0ID0gMzAwMDtcbiAgICBsb2dnZXIuZGVidWcoYFdhaXRpbmcgZm9yICR7dGltZW91dH0gbXMgYmVmb3JlIG5hdmlnYXRpbmcgdG8gdmlldy5gKTtcbiAgfVxuICBhd2FpdCBCLmRlbGF5KHRpbWVvdXQpO1xuICBpZiAodGhpcy51c2VOZXdTYWZhcmkoKSkge1xuICAgIGF3YWl0IHRoaXMudHlwZUFuZE5hdlRvVXJsKCk7XG4gIH0gZWxzZSBpZiAocGFyc2VJbnQodGhpcy5pb3NTZGtWZXJzaW9uLCAxMCkgPj0gNyAmJiAhdGhpcy5pc1JlYWxEZXZpY2UoKSAmJiB0aGlzLm9wdHMuc2FmYXJpKSB7XG4gICAgYXdhaXQgdGhpcy5uYXZUb1ZpZXdUaHJvdWdoRmF2b3JpdGVzKCk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgdGhpcy5uYXZUb1ZpZXdXaXRoVGl0bGUoLy4qLyk7XG4gIH1cbn07XG5cbmFzeW5jIGZ1bmN0aW9uIG9wZW5OZXdQYWdlICgpIHtcbiAgbGV0IG5ld1BhZ2VCdXR0b24gPSBhd2FpdCB0aGlzLmZpbmRFbGVtZW50KCd4cGF0aCcsIFwiLy9VSUFCdXR0b25bY29udGFpbnMoQG5hbWUsJ05ldyBwYWdlJyldXCIpO1xuICBhd2FpdCB0aGlzLm5hdGl2ZVRhcChuZXdQYWdlQnV0dG9uLkVMRU1FTlQpO1xufVxuXG5leHRlbnNpb25zLnR5cGVBbmROYXZUb1VybCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgbGV0IGFkZHJlc3MgPSB0aGlzLm9wdHMuYWRkcmVzcyA/IHRoaXMub3B0cy5hZGRyZXNzIDogJzEyNy4wLjAuMSc7XG4gIHRoaXMuc2V0Q3VycmVudFVybCh0aGlzLmNhcHMuc2FmYXJpSW5pdGlhbFVybCB8fCBgaHR0cDovLyR7YWRkcmVzc306JHt0aGlzLm9wdHMucG9ydH0vd2VsY29tZWApO1xuXG4gIGxldCB0cmllcyA9IDA7XG4gIGNvbnN0IE1BWF9UUklFUyA9IDI7XG4gIGxldCBuYXZpZ2F0ZSA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgb2xkSW1wV2FpdCA9IHRoaXMuaW1wbGljaXRXYWl0TXM7XG4gICAgdGhpcy5pbXBsaWNpdFdhaXRNcyA9IDcwMDA7XG5cbiAgICAvLyBmaW5kIHRoZSB1cmwgYmFyLCBhbmQgdGFwIG9uIGl0LiByZXRyeSB0byBtYWtlIHN1cmUgd2UgZG9uJ3QgdHJ5XG4gICAgLy8gdG9vIHNvb24gd2hpbGUgdGhlIHZpZXcgaXMgc3RpbGwgbG9hZGluZ1xuICAgIGxldCBlbCA9IGF3YWl0IHJldHJ5SW50ZXJ2YWwoMywgMTAwMCwgYXN5bmMgKCkgPT4ge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZmluZEVsZW1lbnQoJ2FjY2Vzc2liaWxpdHkgaWQnLCAnVVJMJyk7XG4gICAgfSk7XG4gICAgdGhpcy5pbXBsaWNpdFdhaXRNcyA9IG9sZEltcFdhaXQ7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5uYXRpdmVUYXAoZWwuRUxFTUVOVCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhlcnIubWVzc2FnZSwgJ2NvdWxkIG5vdCBiZSB0YXBwZWQnKSkge1xuICAgICAgICBpZiAodHJpZXMrKyA+PSBNQVhfVFJJRVMpIHRocm93IGVycjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuXG4gICAgICAgIC8vIGdlbmVyYWxseSB0aGlzIG1lYW5zIHRoYXQgU2FmYXJpIGlzIGluIHBhZ2Ugdmlld2luZyBtb2RlXG4gICAgICAgIC8vIHNvIHRyeSB0byBvcGVuIGEgbmV3IHBhZ2UgYW5kIHRoZW4gcmVkbyB0aGUgbmF2aWdhdGlvblxuICAgICAgICBhd2FpdCBvcGVuTmV3UGFnZSgpO1xuICAgICAgICByZXR1cm4gYXdhaXQgbmF2aWdhdGUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBnZXQgdGhlIGxhc3QgYWRkcmVzcyBlbGVtZW50IGFuZCBzZXQgdGhlIHVybFxuICAgIHRyeSB7XG4gICAgICBsZXQgZWwgPSBhd2FpdCB0aGlzLmZpbmRFbGVtZW50KCdjbGFzcyBuYW1lJywgJ1VJQVRleHRGaWVsZCcpO1xuICAgICAgYXdhaXQgdGhpcy5zZXRWYWx1ZUltbWVkaWF0ZSh0aGlzLmdldEN1cnJlbnRVcmwoKSwgZWwpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgLy8gdGhpcyBpcyBmbGFrZXkgb24gY2VydGFpbiBzeXN0ZW1zIHNvIHdlIHJldHJ5IHVudGlsIHdlIGdldCBzb21ldGhpbmdcbiAgICAgIC8vIGlvcyBzaW1zOiBzYWZhcmkgb3BlbnMgYnV0IHRoZSB0ZXh0IGZpZWxkIGNhbid0IGJlIGZvdW5kXG4gICAgICBpZiAodHJpZXMrKyA+PSBNQVhfVFJJRVMpIHRocm93IGVycjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuICAgICAgcmV0dXJuIGF3YWl0IG5hdmlnYXRlKCk7XG4gICAgfVxuXG4gICAgLy8gbWFrZSBpdCBoYXBwZW5cbiAgICB0cnkge1xuICAgICAgZWwgPSBhd2FpdCB0aGlzLmZpbmRFbGVtZW50KCdhY2Nlc3NpYmlsaXR5IGlkJywgJ0dvJyk7XG4gICAgICBhd2FpdCB0aGlzLm5hdGl2ZVRhcChlbC5FTEVNRU5UKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKGVyci5tZXNzYWdlLCAnY291bGQgbm90IGJlIHRhcHBlZCcpKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcignVW5hYmxlIHRvIHN1Ym1pdCBVUkwgYmVjYXVzZSBcXCdHb1xcJyBidXR0b24gY291bGQgbm90IGJlIHRhcHBlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAnUGxlYXNlIG1ha2Ugc3VyZSB5b3VyIGtleWJvYXJkIGlzIHRvZ2dsZWQgb24uJyk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMubmF2VG9WaWV3V2l0aFRpdGxlKHVuZGVmaW5lZCwgbmV3IFJlZ0V4cCh0aGlzLmdldEN1cnJlbnRVcmwoKSwgJ2knKSk7XG5cbiAgICAvLyB3YWl0IGZvciBwYWdlIHRvIGZpbmlzaCBsb2FkaW5nLlxuICAgIGF3YWl0IHRoaXMucmVtb3RlLnBhZ2VVbmxvYWQoKTtcbiAgfTtcbiAgYXdhaXQgbmF2aWdhdGUoKTtcbn07XG5cbmV4dGVuc2lvbnMubmF2VG9WaWV3VGhyb3VnaEZhdm9yaXRlcyA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgbG9nZ2VyLmRlYnVnKCdXZSBhcmUgb24gaU9TNysgc2ltdWxhdG9yOiBjbGlja2luZyBhcHBsZSBidXR0b24gdG8gZ2V0IGludG8gYSB3ZWJ2aWV3Jyk7XG4gIGxldCBvbGRJbXBXYWl0ID0gdGhpcy5pbXBsaWNpdFdhaXRNcztcbiAgdGhpcy5pbXBsaWNpdFdhaXRNcyA9IDcwMDA7IC8vIHdhaXQgN3MgZm9yIGFwcGxlIGJ1dHRvbiB0byBleGlzdFxuXG4gIGxldCBlbDtcbiAgdHJ5IHtcbiAgICBlbCA9IGF3YWl0IHRoaXMuZmluZEVsZW1lbnQoJ3hwYXRoJywgJy8vVUlBU2Nyb2xsVmlld1sxXS9VSUFCdXR0b25bMV0nKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgbGV0IG1zZyA9ICdDb3VsZCBub3QgZmluZCBidXR0b24gdG8gY2xpY2sgdG8gZ2V0IGludG8gd2Vidmlldy4gJyArXG4gICAgICAgICAgICAgICdQcm9jZWVkaW5nIG9uIHRoZSBhc3N1bXB0aW9uIHdlIGhhdmUgYSB3b3JraW5nIG9uZS4nO1xuICAgIGxvZ2dlci5lcnJvcihtc2cpO1xuICAgIHRoaXMuaW1wbGljaXRXYWl0TXMgPSBvbGRJbXBXYWl0O1xuICAgIHJldHVybiBhd2FpdCB0aGlzLm5hdlRvVmlld1dpdGhUaXRsZSgvLiovaSk7XG4gIH1cbiAgdGhpcy5pbXBsaWNpdFdhaXRNcyA9IG9sZEltcFdhaXQ7XG4gIHRyeSB7XG4gICAgYXdhaXQgdGhpcy5uYXRpdmVUYXAoZWwuRUxFTUVOVCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGxldCBtc2cgPSAnQ291bGQgbm90IGNsaWNrIGJ1dHRvbiB0byBnZXQgaW50byB3ZWJ2aWV3LiAnICtcbiAgICAgICAgICAgICAgJ1Byb2NlZWRpbmcgb24gdGhlIGFzc3VtcHRpb24gd2UgaGF2ZSBhIHdvcmtpbmcgb25lLic7XG4gICAgbG9nZ2VyLmVycm9yKG1zZyk7XG4gIH1cbiAgYXdhaXQgdGhpcy5uYXZUb1ZpZXdXaXRoVGl0bGUoL2FwcGxlL2kpO1xufTtcblxuZXh0ZW5zaW9ucy5uYXZUb1ZpZXdXaXRoVGl0bGUgPSBhc3luYyBmdW5jdGlvbiAodGl0bGVSZWdleCwgdXJsUmVnRXhwKSB7XG4gIGxvZ2dlci5kZWJ1ZygnTmF2aWdhdGluZyB0byBtb3N0IHJlY2VudGx5IG9wZW5lZCB3ZWJ2aWV3Jyk7XG4gIGxldCBzdGFydCA9IERhdGUubm93KCk7XG4gIGxldCBzcGluVGltZSA9IDUwMDtcbiAgbGV0IHNwaW5IYW5kbGVzID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCByZXM7XG4gICAgdHJ5IHtcbiAgICAgIHJlcyA9IGF3YWl0IHRoaXMuZ2V0TGF0ZXN0V2Vidmlld0NvbnRleHRGb3JUaXRsZSh0aXRsZVJlZ2V4IHx8IHVybFJlZ0V4cCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoIWVyci5tZXNzYWdlLmluY2x1ZGVzKCdDb3VsZCBub3QgY29ubmVjdCB0byBhIHZhbGlkIGFwcCBhZnRlcicpKSB7XG4gICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBDb3VsZCBub3QgbmF2aWdhdGUgdG8gd2VidmlldyEgRXJyOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICBlcnJvci5zdGFjayArPSBgXFxuQ2F1c2VkIGJ5OiAke2Vyci5zdGFja31gO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICAgIGxvZ2dlci5kZWJ1ZygnQ291bGQgbm90IG5hdmlnYXRlIHRvIHdlYnZpZXcuIFJldHJ5aW5nIGlmIHBvc3NpYmxlLicpO1xuICAgIH1cbiAgICBpZiAocmVzKSB7XG4gICAgICBsZXQgbGF0ZXN0V2luZG93ID0gcmVzO1xuICAgICAgbG9nZ2VyLmRlYnVnKGBQaWNraW5nIHdlYnZpZXcgJyR7bGF0ZXN0V2luZG93fSdgKTtcbiAgICAgIGF3YWl0IHRoaXMuc2V0Q29udGV4dChsYXRlc3RXaW5kb3cpO1xuICAgICAgYXdhaXQgdGhpcy5yZW1vdGUuY2FuY2VsUGFnZUxvYWQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBubyB3ZWJ2aWV3IHdhcyBmb3VuZFxuICAgIGlmICgoRGF0ZS5ub3coKSAtIHN0YXJ0KSA+PSA5MDAwMCkge1xuICAgICAgLy8gdG9vIHNsb3csIGdldCBvdXRcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IG5hdmlnYXRlIHRvIHdlYnZpZXc7IHRoZXJlIGFyZSBub25lIScpO1xuICAgIH1cblxuICAgIGxvZ2dlci53YXJuKFwiQ291bGQgbm90IGZpbmQgYW55IHdlYnZpZXdzIHlldCwgcmVmcmVzaGluZy9yZXRyeWluZ1wiKTtcbiAgICBpZiAodGhpcy5pc1JlYWxEZXZpY2UoKSB8fCAhdGhpcy5vcHRzLnNhZmFyaSkge1xuICAgICAgLy8gb24gYSByZWFsIGRldmljZSwgd2hlbiBub3QgdXNpbmcgU2FmYXJpLCB3ZSBqdXN0IHdhbnQgdG8gdHJ5IGFnYWluXG4gICAgICBhd2FpdCBCLmRlbGF5KHNwaW5UaW1lKTtcbiAgICAgIHJldHVybiBhd2FpdCBzcGluSGFuZGxlcygpO1xuICAgIH1cblxuICAgIC8vIGZpbmQgdGhlIHJlbG9hZCBidXR0b24gYW5kIHRhcCBpdCwgaWYgcG9zc2libGVcbiAgICBsZXQgZWxlbWVudDtcbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdGaW5kaW5nIGFuZCB0YXBwaW5nIHJlbG9hZCBidXR0b24nKTtcbiAgICAgIGVsZW1lbnQgPSBhd2FpdCB0aGlzLmZpbmRVSUVsZW1lbnRPckVsZW1lbnRzKCdhY2Nlc3NpYmlsaXR5IGlkJywgJ1JlbG9hZEJ1dHRvbicsICcnLCBmYWxzZSk7XG4gICAgICBhd2FpdCB0aGlzLm5hdGl2ZVRhcChlbGVtZW50LkVMRU1FTlQpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLndhcm4oYEVycm9yIGZpbmRpbmcgYW5kIHRhcHBpbmcgcmVsb2FkIGJ1dHRvbjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIGxvZ2dlci53YXJuKCdSZXRyeWluZy4nKTtcbiAgICAgIGF3YWl0IEIuZGVsYXkoc3BpblRpbWUpO1xuICAgIH1cblxuICAgIC8vIHRyeSBpdCBhbGwgYWdhaW5cbiAgICByZXR1cm4gYXdhaXQgc3BpbkhhbmRsZXMoKTtcbiAgfTtcbiAgYXdhaXQgc3BpbkhhbmRsZXMoKTtcbn07XG5cbmhlbHBlcnMuY2xvc2VBbGVydEJlZm9yZVRlc3QgPSBhc3luYyBmdW5jdGlvbiAoKSB7XG4gIGxldCBwcmVzZW50ID0gYXdhaXQgdGhpcy51aUF1dG9DbGllbnQuc2VuZENvbW1hbmQoJ2F1LmFsZXJ0SXNQcmVzZW50KCknKTtcbiAgaWYgKCFwcmVzZW50KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbG9nZ2VyLmRlYnVnKCdBbGVydCBwcmVzZW50IGJlZm9yZSBzdGFydGluZyB0ZXN0LCBsZXQgdXMgYmFuaXNoIGl0Jyk7XG4gIGF3YWl0IHRoaXMudWlBdXRvQ2xpZW50LnNlbmRDb21tYW5kKCdhdS5kaXNtaXNzQWxlcnQoKScpO1xuICBsb2dnZXIuZGVidWcoJ0FsZXJ0IGJhbmlzaGVkIScpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmhlbHBlcnMuc3RvcFJlbW90ZSA9IGFzeW5jIGZ1bmN0aW9uIChjbG9zZVdpbmRvd0JlZm9yZURpc2Nvbm5lY3RpbmcgPSBmYWxzZSkge1xuICBpZiAoIXRoaXMucmVtb3RlKSB7XG4gICAgbG9nZ2VyLmVycm9yQW5kVGhyb3coJ1RyaWVkIHRvIGxlYXZlIGEgd2ViIGZyYW1lIGJ1dCB3ZXJlIG5vdCBpbiBvbmUnKTtcbiAgfVxuXG4gIGlmIChjbG9zZVdpbmRvd0JlZm9yZURpc2Nvbm5lY3RpbmcpIHtcbiAgICBhd2FpdCB0aGlzLmNsb3NlV2luZG93KCk7XG4gIH1cbiAgYXdhaXQgdGhpcy5yZW1vdGUuZGlzY29ubmVjdCgpO1xuICB0aGlzLmN1ckNvbnRleHQgPSBudWxsO1xuICB0aGlzLmN1cldlYkZyYW1lcyA9IFtdO1xuICB0aGlzLmN1cldlYkNvb3JkcyA9IG51bGw7XG4gIHRoaXMucmVtb3RlID0gbnVsbDtcbn07XG5cbmhlbHBlcnMuaXNXZWJDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gISF0aGlzLmN1ckNvbnRleHQgJiYgdGhpcy5jdXJDb250ZXh0ICE9PSBOQVRJVkVfV0lOO1xufTtcblxuaGVscGVycy5zZXRDdXJyZW50VXJsID0gZnVuY3Rpb24gKHVybCkge1xuICB0aGlzLl9jdXJyZW50VXJsID0gdXJsO1xufTtcblxuaGVscGVycy5nZXRDdXJyZW50VXJsID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fY3VycmVudFVybDtcbn07XG5cblxuT2JqZWN0LmFzc2lnbihleHRlbnNpb25zLCBjb21tYW5kcywgaGVscGVycyk7XG5leHBvcnQgeyBjb21tYW5kcywgaGVscGVycywgTkFUSVZFX1dJTiwgV0VCVklFV19XSU4sIFdFQlZJRVdfQkFTRSB9O1xuZXhwb3J0IGRlZmF1bHQgZXh0ZW5zaW9ucztcbiJdLCJmaWxlIjoibGliL2NvbW1hbmRzL2NvbnRleHQuanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4ifQ==
