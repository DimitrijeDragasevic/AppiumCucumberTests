"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.appInfoFromDict = appInfoFromDict;
exports.pageArrayFromDict = pageArrayFromDict;
exports.getDebuggerAppKey = getDebuggerAppKey;
exports.getPossibleDebuggerAppKeys = getPossibleDebuggerAppKeys;
exports.checkParams = checkParams;
exports.wrapScriptForFrame = wrapScriptForFrame;
exports.getScriptForAtom = getScriptForAtom;
exports.simpleStringify = simpleStringify;
exports.deferredPromise = deferredPromise;

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _logger = _interopRequireDefault(require("./logger"));

var _atoms = _interopRequireDefault(require("./atoms"));

var _lodash = _interopRequireDefault(require("lodash"));

var _assert = _interopRequireDefault(require("assert"));

var _bluebird = _interopRequireDefault(require("bluebird"));

const WEB_CONTENT_BUNDLE_ID = 'com.apple.WebKit.WebContent';

function appInfoFromDict(dict) {
  let id = dict.WIRApplicationIdentifierKey;
  let isProxy = _lodash.default.isString(dict.WIRIsApplicationProxyKey) ? dict.WIRIsApplicationProxyKey.toLowerCase() === 'true' : dict.WIRIsApplicationProxyKey;
  let entry = {
    id,
    isProxy,
    name: dict.WIRApplicationNameKey,
    bundleId: dict.WIRApplicationBundleIdentifierKey,
    hostId: dict.WIRHostApplicationIdentifierKey,
    isActive: dict.WIRIsApplicationActiveKey,
    isAutomationEnabled: !!dict.WIRRemoteAutomationEnabledKey
  };
  return [id, entry];
}

function pageArrayFromDict(pageDict) {
  if (pageDict.id) {
    return [pageDict];
  }

  let newPageArray = [];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = _lodash.default.values(pageDict)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      let dict = _step.value;

      if (_lodash.default.isUndefined(dict.WIRTypeKey) || dict.WIRTypeKey === 'WIRTypeWeb') {
        newPageArray.push({
          id: dict.WIRPageIdentifierKey,
          title: dict.WIRTitleKey,
          url: dict.WIRURLKey,
          isKey: !_lodash.default.isUndefined(dict.WIRConnectionIdentifierKey)
        });
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

  return newPageArray;
}

function getDebuggerAppKey(bundleId, platformVersion, appDict) {
  let appId;

  if (parseFloat(platformVersion) >= 8) {
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = _lodash.default.toPairs(appDict)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        let _step2$value = (0, _slicedToArray2.default)(_step2.value, 2),
            key = _step2$value[0],
            data = _step2$value[1];

        if (data.bundleId === bundleId) {
          appId = key;
          break;
        }
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

    if (appId) {
      _logger.default.debug(`Found app id key '${appId}' for bundle '${bundleId}'`);

      let proxiedAppIds = [];
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = _lodash.default.toPairs(appDict)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          let _step3$value = (0, _slicedToArray2.default)(_step3.value, 2),
              key = _step3$value[0],
              data = _step3$value[1];

          if (data.isProxy && data.hostId === appId) {
            _logger.default.debug(`Found separate bundleId '${data.bundleId}' ` + `acting as proxy for '${bundleId}', with app id '${key}'`);

            proxiedAppIds.push(key);
          }
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

      if (proxiedAppIds.length) {
        appId = _lodash.default.last(proxiedAppIds);

        _logger.default.debug(`Using proxied app id '${appId}'`);
      }
    }
  } else {
    if (_lodash.default.has(appDict, bundleId)) {
      appId = bundleId;
    }
  }

  return appId;
}

function appIdForBundle(bundleId, appDict) {
  let appId;
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = _lodash.default.toPairs(appDict)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      let _step4$value = (0, _slicedToArray2.default)(_step4.value, 2),
          key = _step4$value[0],
          data = _step4$value[1];

      if (data.bundleId === bundleId) {
        appId = key;
        break;
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

  if (!appId && bundleId !== WEB_CONTENT_BUNDLE_ID) {
    return appIdForBundle(WEB_CONTENT_BUNDLE_ID, appDict);
  }

  return appId;
}

function getPossibleDebuggerAppKeys(bundleId, platformVersion, appDict) {
  let proxiedAppIds = [];

  if (parseFloat(platformVersion) >= 8) {
    let appId = appIdForBundle(bundleId, appDict);

    if (appId) {
      _logger.default.debug(`Found app id key '${appId}' for bundle '${bundleId}'`);

      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = _lodash.default.toPairs(appDict)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          let _step5$value = (0, _slicedToArray2.default)(_step5.value, 2),
              key = _step5$value[0],
              data = _step5$value[1];

          if (data.isProxy && data.hostId === appId) {
            _logger.default.debug(`Found separate bundleId '${data.bundleId}' ` + `acting as proxy for '${bundleId}', with app id '${key}'`);

            proxiedAppIds.push(key);
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

      if (proxiedAppIds.length === 0) {
        proxiedAppIds = [appId];
      }
    }
  } else {
    if (_lodash.default.has(appDict, bundleId)) {
      proxiedAppIds = [bundleId];
    }
  }

  return proxiedAppIds;
}

function checkParams(params) {
  let errors = [];
  var _iteratorNormalCompletion6 = true;
  var _didIteratorError6 = false;
  var _iteratorError6 = undefined;

  try {
    for (var _iterator6 = _lodash.default.toPairs(params)[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
      let _step6$value = (0, _slicedToArray2.default)(_step6.value, 2),
          param = _step6$value[0],
          value = _step6$value[1];

      try {
        _assert.default.ok(value);
      } catch (err) {
        errors.push(param);
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

  if (errors.length) {
    return errors;
  }
}

function wrapScriptForFrame(_x, _x2) {
  return _wrapScriptForFrame.apply(this, arguments);
}

function _wrapScriptForFrame() {
  _wrapScriptForFrame = (0, _asyncToGenerator2.default)(function* (script, frame) {
    _logger.default.debug(`Wrapping script for frame '${frame}'`);

    let elFromCache = yield (0, _atoms.default)('get_element_from_cache');
    return `(function (window) { var document = window.document; ` + `return (${script}); })((${elFromCache.toString('utf8')})(${JSON.stringify(frame)}))`;
  });
  return _wrapScriptForFrame.apply(this, arguments);
}

function getScriptForAtom(_x3, _x4, _x5) {
  return _getScriptForAtom.apply(this, arguments);
}

function _getScriptForAtom() {
  _getScriptForAtom = (0, _asyncToGenerator2.default)(function* (atom, args, frames, asyncCallBack = null) {
    let atomSrc = yield (0, _atoms.default)(atom);
    let script;

    if (frames.length > 0) {
      script = atomSrc;
      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = frames[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          let frame = _step7.value;
          script = yield wrapScriptForFrame(script, frame);
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
    } else {
      _logger.default.debug(`Executing '${atom}' atom in default context`);

      script = `(${atomSrc})`;
    }

    args = args.map(JSON.stringify);

    if (asyncCallBack) {
      script += `(${args.join(',')}, ${asyncCallBack}, true )`;
    } else {
      script += `(${args.join(',')})`;
    }

    return script;
  });
  return _getScriptForAtom.apply(this, arguments);
}

function simpleStringify(value) {
  if (!value) {
    return JSON.stringify(value);
  }

  let cleanValue = _lodash.default.clone(value);

  var _arr = ['ceil', 'clone', 'floor', 'round', 'scale', 'toString'];

  for (var _i = 0; _i < _arr.length; _i++) {
    let property = _arr[_i];
    delete cleanValue[property];
  }

  return JSON.stringify(cleanValue);
}

function deferredPromise() {
  let resolve;
  let reject;
  let promise = new _bluebird.default((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve,
    reject
  };
}require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9oZWxwZXJzLmpzIl0sIm5hbWVzIjpbIldFQl9DT05URU5UX0JVTkRMRV9JRCIsImFwcEluZm9Gcm9tRGljdCIsImRpY3QiLCJpZCIsIldJUkFwcGxpY2F0aW9uSWRlbnRpZmllcktleSIsImlzUHJveHkiLCJfIiwiaXNTdHJpbmciLCJXSVJJc0FwcGxpY2F0aW9uUHJveHlLZXkiLCJ0b0xvd2VyQ2FzZSIsImVudHJ5IiwibmFtZSIsIldJUkFwcGxpY2F0aW9uTmFtZUtleSIsImJ1bmRsZUlkIiwiV0lSQXBwbGljYXRpb25CdW5kbGVJZGVudGlmaWVyS2V5IiwiaG9zdElkIiwiV0lSSG9zdEFwcGxpY2F0aW9uSWRlbnRpZmllcktleSIsImlzQWN0aXZlIiwiV0lSSXNBcHBsaWNhdGlvbkFjdGl2ZUtleSIsImlzQXV0b21hdGlvbkVuYWJsZWQiLCJXSVJSZW1vdGVBdXRvbWF0aW9uRW5hYmxlZEtleSIsInBhZ2VBcnJheUZyb21EaWN0IiwicGFnZURpY3QiLCJuZXdQYWdlQXJyYXkiLCJ2YWx1ZXMiLCJpc1VuZGVmaW5lZCIsIldJUlR5cGVLZXkiLCJwdXNoIiwiV0lSUGFnZUlkZW50aWZpZXJLZXkiLCJ0aXRsZSIsIldJUlRpdGxlS2V5IiwidXJsIiwiV0lSVVJMS2V5IiwiaXNLZXkiLCJXSVJDb25uZWN0aW9uSWRlbnRpZmllcktleSIsImdldERlYnVnZ2VyQXBwS2V5IiwicGxhdGZvcm1WZXJzaW9uIiwiYXBwRGljdCIsImFwcElkIiwicGFyc2VGbG9hdCIsInRvUGFpcnMiLCJrZXkiLCJkYXRhIiwibG9nIiwiZGVidWciLCJwcm94aWVkQXBwSWRzIiwibGVuZ3RoIiwibGFzdCIsImhhcyIsImFwcElkRm9yQnVuZGxlIiwiZ2V0UG9zc2libGVEZWJ1Z2dlckFwcEtleXMiLCJjaGVja1BhcmFtcyIsInBhcmFtcyIsImVycm9ycyIsInBhcmFtIiwidmFsdWUiLCJhc3NlcnQiLCJvayIsImVyciIsIndyYXBTY3JpcHRGb3JGcmFtZSIsInNjcmlwdCIsImZyYW1lIiwiZWxGcm9tQ2FjaGUiLCJ0b1N0cmluZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJnZXRTY3JpcHRGb3JBdG9tIiwiYXRvbSIsImFyZ3MiLCJmcmFtZXMiLCJhc3luY0NhbGxCYWNrIiwiYXRvbVNyYyIsIm1hcCIsImpvaW4iLCJzaW1wbGVTdHJpbmdpZnkiLCJjbGVhblZhbHVlIiwiY2xvbmUiLCJwcm9wZXJ0eSIsImRlZmVycmVkUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwcm9taXNlIiwiUHJvbWlzZSIsInJlcyIsInJlaiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBR0EsTUFBTUEscUJBQXFCLEdBQUcsNkJBQTlCOztBQU1BLFNBQVNDLGVBQVQsQ0FBMEJDLElBQTFCLEVBQWdDO0FBQzlCLE1BQUlDLEVBQUUsR0FBR0QsSUFBSSxDQUFDRSwyQkFBZDtBQUNBLE1BQUlDLE9BQU8sR0FBR0MsZ0JBQUVDLFFBQUYsQ0FBV0wsSUFBSSxDQUFDTSx3QkFBaEIsSUFDVk4sSUFBSSxDQUFDTSx3QkFBTCxDQUE4QkMsV0FBOUIsT0FBZ0QsTUFEdEMsR0FFVlAsSUFBSSxDQUFDTSx3QkFGVDtBQUdBLE1BQUlFLEtBQUssR0FBRztBQUNWUCxJQUFBQSxFQURVO0FBRVZFLElBQUFBLE9BRlU7QUFHVk0sSUFBQUEsSUFBSSxFQUFFVCxJQUFJLENBQUNVLHFCQUhEO0FBSVZDLElBQUFBLFFBQVEsRUFBRVgsSUFBSSxDQUFDWSxpQ0FKTDtBQUtWQyxJQUFBQSxNQUFNLEVBQUViLElBQUksQ0FBQ2MsK0JBTEg7QUFNVkMsSUFBQUEsUUFBUSxFQUFFZixJQUFJLENBQUNnQix5QkFOTDtBQU9WQyxJQUFBQSxtQkFBbUIsRUFBRSxDQUFDLENBQUNqQixJQUFJLENBQUNrQjtBQVBsQixHQUFaO0FBVUEsU0FBTyxDQUFDakIsRUFBRCxFQUFLTyxLQUFMLENBQVA7QUFDRDs7QUFNRCxTQUFTVyxpQkFBVCxDQUE0QkMsUUFBNUIs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cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGxvZyBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgZ2V0QXRvbSBmcm9tICcuL2F0b21zJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgUHJvbWlzZSBmcm9tICdibHVlYmlyZCc7XG5cblxuY29uc3QgV0VCX0NPTlRFTlRfQlVORExFX0lEID0gJ2NvbS5hcHBsZS5XZWJLaXQuV2ViQ29udGVudCc7XG5cbi8qXG4gKiBUYWtlcyBhIGRpY3Rpb25hcnkgZnJvbSB0aGUgcmVtb3RlIGRlYnVnZ2VyIGFuZCBtYWtlcyBhIG1vcmUgbWFuYWdlYWJsZVxuICogZGljdGlvbmFyeSB3aG9zZSBrZXlzIGFyZSB1bmRlcnN0YW5kYWJsZVxuICovXG5mdW5jdGlvbiBhcHBJbmZvRnJvbURpY3QgKGRpY3QpIHtcbiAgbGV0IGlkID0gZGljdC5XSVJBcHBsaWNhdGlvbklkZW50aWZpZXJLZXk7XG4gIGxldCBpc1Byb3h5ID0gXy5pc1N0cmluZyhkaWN0LldJUklzQXBwbGljYXRpb25Qcm94eUtleSlcbiAgICA/IGRpY3QuV0lSSXNBcHBsaWNhdGlvblByb3h5S2V5LnRvTG93ZXJDYXNlKCkgPT09ICd0cnVlJ1xuICAgIDogZGljdC5XSVJJc0FwcGxpY2F0aW9uUHJveHlLZXk7XG4gIGxldCBlbnRyeSA9IHtcbiAgICBpZCxcbiAgICBpc1Byb3h5LFxuICAgIG5hbWU6IGRpY3QuV0lSQXBwbGljYXRpb25OYW1lS2V5LFxuICAgIGJ1bmRsZUlkOiBkaWN0LldJUkFwcGxpY2F0aW9uQnVuZGxlSWRlbnRpZmllcktleSxcbiAgICBob3N0SWQ6IGRpY3QuV0lSSG9zdEFwcGxpY2F0aW9uSWRlbnRpZmllcktleSxcbiAgICBpc0FjdGl2ZTogZGljdC5XSVJJc0FwcGxpY2F0aW9uQWN0aXZlS2V5LFxuICAgIGlzQXV0b21hdGlvbkVuYWJsZWQ6ICEhZGljdC5XSVJSZW1vdGVBdXRvbWF0aW9uRW5hYmxlZEtleSxcbiAgfTtcblxuICByZXR1cm4gW2lkLCBlbnRyeV07XG59XG5cbi8qXG4gKiBUYWtlIGEgZGljdGlvbmFyeSBmcm9tIHRoZSByZW1vdGUgZGVidWdnZXIgYW5kIG1ha2VzIGEgbW9yZSBtYW5hZ2VhYmxlXG4gKiBkaWN0aW9uYXJ5IG9mIHBhZ2VzIGF2YWlsYWJsZS5cbiAqL1xuZnVuY3Rpb24gcGFnZUFycmF5RnJvbURpY3QgKHBhZ2VEaWN0KSB7XG4gIGlmIChwYWdlRGljdC5pZCkge1xuICAgIC8vIHRoZSBwYWdlIGlzIGFscmVhZHkgdHJhbnNsYXRlZCwgc28gd3JhcCBpbiBhbiBhcnJheSBhbmQgcGFzcyBiYWNrXG4gICAgcmV0dXJuIFtwYWdlRGljdF07XG4gIH1cbiAgbGV0IG5ld1BhZ2VBcnJheSA9IFtdO1xuICBmb3IgKGxldCBkaWN0IG9mIF8udmFsdWVzKHBhZ2VEaWN0KSkge1xuICAgIC8vIGNvdW50IG9ubHkgV0lSVHlwZVdlYiBwYWdlcyBhbmQgaWdub3JlIGFsbCBvdGhlcnMgKFdJUlR5cGVKYXZhU2NyaXB0IGV0YylcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChkaWN0LldJUlR5cGVLZXkpIHx8IGRpY3QuV0lSVHlwZUtleSA9PT0gJ1dJUlR5cGVXZWInKSB7XG4gICAgICBuZXdQYWdlQXJyYXkucHVzaCh7XG4gICAgICAgIGlkOiBkaWN0LldJUlBhZ2VJZGVudGlmaWVyS2V5LFxuICAgICAgICB0aXRsZTogZGljdC5XSVJUaXRsZUtleSxcbiAgICAgICAgdXJsOiBkaWN0LldJUlVSTEtleSxcbiAgICAgICAgaXNLZXk6ICFfLmlzVW5kZWZpbmVkKGRpY3QuV0lSQ29ubmVjdGlvbklkZW50aWZpZXJLZXkpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBuZXdQYWdlQXJyYXk7XG59XG5cbi8qXG4gKiBHaXZlbiBhIGJ1bmRsZSBpZCwgZmluZHMgdGhlIGNvcnJlY3QgcmVtb3RlIGRlYnVnZ2VyIGFwcCB0aGF0IGlzXG4gKiBjb25uZWN0ZWQuXG4gKi9cbmZ1bmN0aW9uIGdldERlYnVnZ2VyQXBwS2V5IChidW5kbGVJZCwgcGxhdGZvcm1WZXJzaW9uLCBhcHBEaWN0KSB7XG4gIGxldCBhcHBJZDtcbiAgaWYgKHBhcnNlRmxvYXQocGxhdGZvcm1WZXJzaW9uKSA+PSA4KSB7XG4gICAgZm9yIChsZXQgW2tleSwgZGF0YV0gb2YgXy50b1BhaXJzKGFwcERpY3QpKSB7XG4gICAgICBpZiAoZGF0YS5idW5kbGVJZCA9PT0gYnVuZGxlSWQpIHtcbiAgICAgICAgYXBwSWQgPSBrZXk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBub3cgd2UgbmVlZCB0byBkZXRlcm1pbmUgaWYgd2Ugc2hvdWxkIHBpY2sgYSBwcm94eSBmb3IgdGhpcyBpbnN0ZWFkXG4gICAgaWYgKGFwcElkKSB7XG4gICAgICBsb2cuZGVidWcoYEZvdW5kIGFwcCBpZCBrZXkgJyR7YXBwSWR9JyBmb3IgYnVuZGxlICcke2J1bmRsZUlkfSdgKTtcbiAgICAgIGxldCBwcm94aWVkQXBwSWRzID0gW107XG4gICAgICBmb3IgKGxldCBba2V5LCBkYXRhXSBvZiBfLnRvUGFpcnMoYXBwRGljdCkpIHtcbiAgICAgICAgaWYgKGRhdGEuaXNQcm94eSAmJiBkYXRhLmhvc3RJZCA9PT0gYXBwSWQpIHtcbiAgICAgICAgICBsb2cuZGVidWcoYEZvdW5kIHNlcGFyYXRlIGJ1bmRsZUlkICcke2RhdGEuYnVuZGxlSWR9JyBgICtcbiAgICAgICAgICAgICAgICAgICAgYGFjdGluZyBhcyBwcm94eSBmb3IgJyR7YnVuZGxlSWR9Jywgd2l0aCBhcHAgaWQgJyR7a2V5fSdgKTtcbiAgICAgICAgICBwcm94aWVkQXBwSWRzLnB1c2goa2V5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHByb3hpZWRBcHBJZHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIHVzZSB0aGUgbGFzdCBhcHAgYmVpbmcgcHJveGllZFxuICAgICAgICBhcHBJZCA9IF8ubGFzdChwcm94aWVkQXBwSWRzKTtcbiAgICAgICAgbG9nLmRlYnVnKGBVc2luZyBwcm94aWVkIGFwcCBpZCAnJHthcHBJZH0nYCk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChfLmhhcyhhcHBEaWN0LCBidW5kbGVJZCkpIHtcbiAgICAgIGFwcElkID0gYnVuZGxlSWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGFwcElkO1xufVxuXG5mdW5jdGlvbiBhcHBJZEZvckJ1bmRsZSAoYnVuZGxlSWQsIGFwcERpY3QpIHtcbiAgbGV0IGFwcElkO1xuICBmb3IgKGxldCBba2V5LCBkYXRhXSBvZiBfLnRvUGFpcnMoYXBwRGljdCkpIHtcbiAgICBpZiAoZGF0YS5idW5kbGVJZCA9PT0gYnVuZGxlSWQpIHtcbiAgICAgIGFwcElkID0ga2V5O1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgbm90aGluZyBpcyBmb3VuZCwgdHJ5IHRvIGdldCB0aGUgZ2VuZXJpYyBhcHBcbiAgaWYgKCFhcHBJZCAmJiBidW5kbGVJZCAhPT0gV0VCX0NPTlRFTlRfQlVORExFX0lEKSB7XG4gICAgcmV0dXJuIGFwcElkRm9yQnVuZGxlKFdFQl9DT05URU5UX0JVTkRMRV9JRCwgYXBwRGljdCk7XG4gIH1cblxuICByZXR1cm4gYXBwSWQ7XG59XG5cbmZ1bmN0aW9uIGdldFBvc3NpYmxlRGVidWdnZXJBcHBLZXlzIChidW5kbGVJZCwgcGxhdGZvcm1WZXJzaW9uLCBhcHBEaWN0KSB7XG4gIGxldCBwcm94aWVkQXBwSWRzID0gW107XG4gIGlmIChwYXJzZUZsb2F0KHBsYXRmb3JtVmVyc2lvbikgPj0gOCkge1xuICAgIGxldCBhcHBJZCA9IGFwcElkRm9yQnVuZGxlKGJ1bmRsZUlkLCBhcHBEaWN0KTtcblxuICAgIC8vIG5vdyB3ZSBuZWVkIHRvIGRldGVybWluZSBpZiB3ZSBzaG91bGQgcGljayBhIHByb3h5IGZvciB0aGlzIGluc3RlYWRcbiAgICBpZiAoYXBwSWQpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgRm91bmQgYXBwIGlkIGtleSAnJHthcHBJZH0nIGZvciBidW5kbGUgJyR7YnVuZGxlSWR9J2ApO1xuICAgICAgZm9yIChsZXQgW2tleSwgZGF0YV0gb2YgXy50b1BhaXJzKGFwcERpY3QpKSB7XG4gICAgICAgIGlmIChkYXRhLmlzUHJveHkgJiYgZGF0YS5ob3N0SWQgPT09IGFwcElkKSB7XG4gICAgICAgICAgbG9nLmRlYnVnKGBGb3VuZCBzZXBhcmF0ZSBidW5kbGVJZCAnJHtkYXRhLmJ1bmRsZUlkfScgYCArXG4gICAgICAgICAgICAgICAgICAgIGBhY3RpbmcgYXMgcHJveHkgZm9yICcke2J1bmRsZUlkfScsIHdpdGggYXBwIGlkICcke2tleX0nYCk7XG4gICAgICAgICAgcHJveGllZEFwcElkcy5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChwcm94aWVkQXBwSWRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBwcm94aWVkQXBwSWRzID0gW2FwcElkXTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKF8uaGFzKGFwcERpY3QsIGJ1bmRsZUlkKSkge1xuICAgICAgcHJveGllZEFwcElkcyA9IFtidW5kbGVJZF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByb3hpZWRBcHBJZHM7XG59XG5cbmZ1bmN0aW9uIGNoZWNrUGFyYW1zIChwYXJhbXMpIHtcbiAgbGV0IGVycm9ycyA9IFtdO1xuICBmb3IgKGxldCBbcGFyYW0sIHZhbHVlXSBvZiBfLnRvUGFpcnMocGFyYW1zKSkge1xuICAgIHRyeSB7XG4gICAgICBhc3NlcnQub2sodmFsdWUpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgZXJyb3JzLnB1c2gocGFyYW0pO1xuICAgIH1cbiAgfVxuICBpZiAoZXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiBlcnJvcnM7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gd3JhcFNjcmlwdEZvckZyYW1lIChzY3JpcHQsIGZyYW1lKSB7XG4gIGxvZy5kZWJ1ZyhgV3JhcHBpbmcgc2NyaXB0IGZvciBmcmFtZSAnJHtmcmFtZX0nYCk7XG4gIGxldCBlbEZyb21DYWNoZSA9IGF3YWl0IGdldEF0b20oJ2dldF9lbGVtZW50X2Zyb21fY2FjaGUnKTtcbiAgcmV0dXJuIGAoZnVuY3Rpb24gKHdpbmRvdykgeyB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7IGAgK1xuICAgICAgICAgYHJldHVybiAoJHtzY3JpcHR9KTsgfSkoKCR7ZWxGcm9tQ2FjaGUudG9TdHJpbmcoJ3V0ZjgnKX0pKCR7SlNPTi5zdHJpbmdpZnkoZnJhbWUpfSkpYDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0U2NyaXB0Rm9yQXRvbSAoYXRvbSwgYXJncywgZnJhbWVzLCBhc3luY0NhbGxCYWNrID0gbnVsbCkge1xuICBsZXQgYXRvbVNyYyA9IGF3YWl0IGdldEF0b20oYXRvbSk7XG4gIGxldCBzY3JpcHQ7XG4gIGlmIChmcmFtZXMubGVuZ3RoID4gMCkge1xuICAgIHNjcmlwdCA9IGF0b21TcmM7XG4gICAgZm9yIChsZXQgZnJhbWUgb2YgZnJhbWVzKSB7XG4gICAgICBzY3JpcHQgPSBhd2FpdCB3cmFwU2NyaXB0Rm9yRnJhbWUoc2NyaXB0LCBmcmFtZSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZy5kZWJ1ZyhgRXhlY3V0aW5nICcke2F0b219JyBhdG9tIGluIGRlZmF1bHQgY29udGV4dGApO1xuICAgIHNjcmlwdCA9IGAoJHthdG9tU3JjfSlgO1xuICB9XG5cbiAgLy8gYWRkIHRoZSBhcmd1bWVudHMsIGFzIHN0cmluZ3NcbiAgYXJncyA9IGFyZ3MubWFwKEpTT04uc3RyaW5naWZ5KTtcbiAgaWYgKGFzeW5jQ2FsbEJhY2spIHtcbiAgICBzY3JpcHQgKz0gYCgke2FyZ3Muam9pbignLCcpfSwgJHthc3luY0NhbGxCYWNrfSwgdHJ1ZSApYDtcbiAgfSBlbHNlIHtcbiAgICBzY3JpcHQgKz0gYCgke2FyZ3Muam9pbignLCcpfSlgO1xuICB9XG5cbiAgcmV0dXJuIHNjcmlwdDtcbn1cblxuZnVuY3Rpb24gc2ltcGxlU3RyaW5naWZ5ICh2YWx1ZSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgfVxuXG4gIC8vIHdlIGdldCBiYWNrIG9iamVjdHMgc29tZXRpbWVzIHdpdGggc3RyaW5nIHZlcnNpb25zIG9mIGZ1bmN0aW9uc1xuICAvLyB3aGljaCBtdWRkeSB0aGUgbG9nc1xuICBsZXQgY2xlYW5WYWx1ZSA9IF8uY2xvbmUodmFsdWUpO1xuICBmb3IgKGxldCBwcm9wZXJ0eSBvZiBbJ2NlaWwnLCAnY2xvbmUnLCAnZmxvb3InLCAncm91bmQnLCAnc2NhbGUnLCAndG9TdHJpbmcnXSkge1xuICAgIGRlbGV0ZSBjbGVhblZhbHVlW3Byb3BlcnR5XTtcbiAgfVxuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoY2xlYW5WYWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGRlZmVycmVkUHJvbWlzZSAoKSB7XG4gIC8vIGh0dHA6Ly9ibHVlYmlyZGpzLmNvbS9kb2NzL2FwaS9kZWZlcnJlZC1taWdyYXRpb24uaHRtbFxuICBsZXQgcmVzb2x2ZTtcbiAgbGV0IHJlamVjdDtcbiAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBwcm9taXNlL3BhcmFtLW5hbWVzXG4gICAgcmVzb2x2ZSA9IHJlcztcbiAgICByZWplY3QgPSByZWo7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHByb21pc2UsXG4gICAgcmVzb2x2ZSxcbiAgICByZWplY3RcbiAgfTtcbn1cblxuZXhwb3J0IHtcbiAgYXBwSW5mb0Zyb21EaWN0LCBwYWdlQXJyYXlGcm9tRGljdCwgZ2V0RGVidWdnZXJBcHBLZXksXG4gIGdldFBvc3NpYmxlRGVidWdnZXJBcHBLZXlzLCBjaGVja1BhcmFtcywgd3JhcFNjcmlwdEZvckZyYW1lLCBnZXRTY3JpcHRGb3JBdG9tLFxuICBzaW1wbGVTdHJpbmdpZnksIGRlZmVycmVkUHJvbWlzZSxcbn07XG4iXSwiZmlsZSI6ImxpYi9oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6Ii4uLy4uIn0=
