"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebKitRemoteDebugger = exports.REMOTE_DEBUGGER_PORT = exports.DEBUGGER_TYPES = exports.RemoteDebugger = void 0;

var rd = _interopRequireWildcard(require("./lib/remote-debugger"));

var wrd = _interopRequireWildcard(require("./lib/webkit-remote-debugger"));

const RemoteDebugger = rd.RemoteDebugger,
      DEBUGGER_TYPES = rd.DEBUGGER_TYPES,
      REMOTE_DEBUGGER_PORT = rd.REMOTE_DEBUGGER_PORT;
exports.REMOTE_DEBUGGER_PORT = REMOTE_DEBUGGER_PORT;
exports.DEBUGGER_TYPES = DEBUGGER_TYPES;
exports.RemoteDebugger = RemoteDebugger;
const WebKitRemoteDebugger = wrd.WebKitRemoteDebugger;
exports.WebKitRemoteDebugger = WebKitRemoteDebugger;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbIlJlbW90ZURlYnVnZ2VyIiwicmQiLCJERUJVR0dFUl9UWVBFUyIsIlJFTU9URV9ERUJVR0dFUl9QT1JUIiwiV2ViS2l0UmVtb3RlRGVidWdnZXIiLCJ3cmQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOztBQUNBOztNQUdRQSxjLEdBQXlEQyxFLENBQXpERCxjO01BQWdCRSxjLEdBQXlDRCxFLENBQXpDQyxjO01BQWdCQyxvQixHQUF5QkYsRSxDQUF6QkUsb0I7Ozs7TUFDaENDLG9CLEdBQXlCQyxHLENBQXpCRCxvQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJkIGZyb20gJy4vbGliL3JlbW90ZS1kZWJ1Z2dlcic7XG5pbXBvcnQgKiBhcyB3cmQgZnJvbSAnLi9saWIvd2Via2l0LXJlbW90ZS1kZWJ1Z2dlcic7XG5cblxuY29uc3QgeyBSZW1vdGVEZWJ1Z2dlciwgREVCVUdHRVJfVFlQRVMsIFJFTU9URV9ERUJVR0dFUl9QT1JUIH0gPSByZDtcbmNvbnN0IHsgV2ViS2l0UmVtb3RlRGVidWdnZXIgfSA9IHdyZDtcblxuZXhwb3J0IHsgUmVtb3RlRGVidWdnZXIsIERFQlVHR0VSX1RZUEVTLCBSRU1PVEVfREVCVUdHRVJfUE9SVCwgV2ViS2l0UmVtb3RlRGVidWdnZXIgfTtcbiJdLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi4ifQ==
