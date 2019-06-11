"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _logger = _interopRequireDefault(require("./logger"));

var _lodash = _interopRequireDefault(require("lodash"));

var _bplistCreator = _interopRequireDefault(require("bplist-creator"));

var _bplistParser = _interopRequireDefault(require("bplist-parser"));

var _bufferpack = _interopRequireDefault(require("bufferpack"));

var _bluebird = _interopRequireDefault(require("bluebird"));

var _remoteDebugger = require("./remote-debugger");

var _uuidJs = _interopRequireDefault(require("uuid-js"));

var _net = _interopRequireDefault(require("net"));

var _remoteDebuggerMessageHandler = _interopRequireDefault(require("./remote-debugger-message-handler"));

var _remoteMessages = _interopRequireDefault(require("./remote-messages"));

class RemoteDebuggerRpcClient {
  constructor(opts = {}) {
    const _opts$host = opts.host,
          host = _opts$host === void 0 ? '::1' : _opts$host,
          _opts$port = opts.port,
          port = _opts$port === void 0 ? _remoteDebugger.REMOTE_DEBUGGER_PORT : _opts$port,
          socketPath = opts.socketPath,
          _opts$specialMessageH = opts.specialMessageHandlers,
          specialMessageHandlers = _opts$specialMessageH === void 0 ? {} : _opts$specialMessageH,
          messageProxy = opts.messageProxy;
    this.host = host;
    this.port = port;
    this.socketPath = socketPath;
    this.messageProxy = messageProxy;
    this.socket = null;
    this.connected = false;
    this.connId = _uuidJs.default.create().toString();
    this.senderId = _uuidJs.default.create().toString();
    this.curMsgId = 0;
    this.received = Buffer.alloc(0);
    this.readPos = 0;
    this.specialMessageHandlers = specialMessageHandlers;
    this.messageHandler = null;
  }

  connect() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _this.messageHandler = new _remoteDebuggerMessageHandler.default(_this.specialMessageHandlers);

      if (_this.socketPath) {
        if (_this.messageProxy) {
          _logger.default.debug(`Connecting to remote debugger via proxy through unix domain socket: '${_this.messageProxy}'`);

          _this.socket = _net.default.connect(_this.messageProxy);

          _this.socket.once('connect', () => {
            _logger.default.debug(`Forwarding the actual web inspector socket to the proxy: '${_this.socketPath}'`);

            _this.socket.write(JSON.stringify({
              socketPath: _this.socketPath
            }));
          });
        } else {
          _logger.default.debug(`Connecting to remote debugger through unix domain socket: '${_this.socketPath}'`);

          _this.socket = _net.default.connect(_this.socketPath);
        }
      } else {
        if (_this.messageProxy) {
          _this.port = _this.messageProxy;
        }

        _logger.default.debug(`Connecting to remote debugger ${_this.messageProxy ? 'via proxy ' : ''}through TCP: ${_this.host}:${_this.port}`);

        _this.socket = new _net.default.Socket({
          type: 'tcp6'
        });

        _this.socket.connect(_this.port, _this.host);
      }

      _this.socket.setNoDelay(true);

      _this.socket.on('close', () => {
        if (_this.connected) {
          _logger.default.debug('Debugger socket disconnected');
        }

        _this.connected = false;
        _this.socket = null;
      });

      _this.socket.on('end', () => {
        _this.connected = false;
      });

      _this.socket.on('data', _this.receive.bind(_this));

      return yield new _bluebird.default((resolve, reject) => {
        _this.socket.on('connect', () => {
          _logger.default.debug(`Debugger socket connected`);

          _this.connected = true;
          resolve();
        });

        _this.socket.on('error', err => {
          if (_this.connected) {
            _logger.default.error(`Socket error: ${err.message}`);

            _this.connected = false;
          }

          reject(err);
        });
      });
    })();
  }

  disconnect() {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this2.isConnected()) {
        _logger.default.debug('Disconnecting from remote debugger');

        _this2.socket.destroy();
      }

      _this2.connected = false;
    })();
  }

  isConnected() {
    return this.connected;
  }

  setSpecialMessageHandler(key, errorHandler, handler) {
    this.messageHandler.setSpecialMessageHandler(key, errorHandler, handler);
  }

  getSpecialMessageHandler(key) {
    return this.messageHandler.getSpecialMessageHandler(key);
  }

  setDataMessageHandler(key, errorHandler, handler) {
    this.messageHandler.setDataMessageHandler(key, errorHandler, handler);
  }

  allowNavigationWithoutReload(allow = true) {
    this.messageHandler.allowNavigationWithoutReload(allow);
  }

  selectApp(appIdKey, applicationConnectedHandler) {
    var _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      return yield new _bluebird.default((resolve, reject) => {
        let onAppChange = dict => {
          let oldAppIdKey = dict.WIRHostApplicationIdentifierKey;
          let correctAppIdKey = dict.WIRApplicationIdentifierKey;

          if (oldAppIdKey && correctAppIdKey !== oldAppIdKey) {
            _logger.default.debug(`We were notified we might have connected to the wrong app. ` + `Using id ${correctAppIdKey} instead of ${oldAppIdKey}`);
          }

          applicationConnectedHandler(dict);
          reject(new Error('New application has connected'));
        };

        _this3.setSpecialMessageHandler('_rpc_applicationConnected:', reject, onAppChange);

        return (0, _asyncToGenerator2.default)(function* () {
          let _ref2 = yield _this3.send('connectToApp', {
            appIdKey
          }),
              _ref3 = (0, _slicedToArray2.default)(_ref2, 2),
              connectedAppIdKey = _ref3[0],
              pageDict = _ref3[1];

          if (_lodash.default.isEmpty(pageDict)) {
            let msg = 'Empty page dictionary received';

            _logger.default.debug(msg);

            reject(new Error(msg));
          } else {
            resolve([connectedAppIdKey, pageDict]);
          }
        })();
      }).finally(() => {
        _this3.setSpecialMessageHandler('_rpc_applicationConnected:', null, applicationConnectedHandler);
      });
    })();
  }

  send(command, opts = {}) {
    var _this4 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let onSocketError;
      return new _bluebird.default((resolve, reject) => {
        opts = _lodash.default.defaults({
          connId: _this4.connId,
          senderId: _this4.senderId
        }, opts);
        let data = (0, _remoteMessages.default)(command, opts);
        let socketCb = _lodash.default.noop;

        onSocketError = exception => {
          if (_this4.connected) {
            _logger.default.error(`Socket error: ${exception.message}`);
          }

          reject(exception);
        };

        _this4.socket.on('error', onSocketError);

        if (_this4.messageHandler.hasSpecialMessageHandler(data.__selector)) {
          let specialMessageHandler = _this4.getSpecialMessageHandler(data.__selector);

          _this4.setSpecialMessageHandler(data.__selector, reject, function (...args) {
            _logger.default.debug(`Received response from socket send: '${_lodash.default.truncate(JSON.stringify(args), {
              length: 50
            })}'`);

            specialMessageHandler(...args);

            if (this.messageHandler.hasSpecialMessageHandler(data.__selector)) {
              this.setSpecialMessageHandler(data.__selector, null, specialMessageHandler);
            }

            resolve(args);
          }.bind(_this4));
        } else if (data.__argument && data.__argument.WIRSocketDataKey) {
          _this4.curMsgId++;

          const errorHandler = function errorHandler(err) {
            const msg = `Remote debugger error with code '${err.code}': ${err.message}`;
            reject(new Error(msg));
          };

          _this4.setDataMessageHandler(_this4.curMsgId.toString(), errorHandler, value => {
            const msg = _lodash.default.truncate(_lodash.default.isString(value) ? value : JSON.stringify(value), {
              length: 50
            });

            _logger.default.debug(`Received data response from socket send: '${msg}'`);

            _logger.default.debug(`Original command: ${command}`);

            resolve(value);
          });

          data.__argument.WIRSocketDataKey.id = _this4.curMsgId;
          data.__argument.WIRSocketDataKey = Buffer.from(JSON.stringify(data.__argument.WIRSocketDataKey));
        } else {
          socketCb = resolve;
        }

        _logger.default.debug(`Sending '${data.__selector}' message to remote debugger`);

        let plist;

        try {
          plist = (0, _bplistCreator.default)(data);
        } catch (e) {
          let msg = `Could not create binary plist from data: ${e.message}`;

          _logger.default.error(msg);

          return reject(new Error(msg));
        }

        if (_this4.socket && _this4.connected) {
          _this4.socket.cork();

          try {
            _this4.socket.write(_bufferpack.default.pack('L', [plist.length]));

            _this4.socket.write(plist, socketCb);
          } finally {
            _this4.socket.uncork();
          }
        } else {
          let msg = 'Attempted to write data to socket after it was closed!';

          _logger.default.error(msg);

          reject(new Error(msg));
        }
      }).finally(() => {
        _this4.socket.removeListener('error', onSocketError);
      });
    })();
  }

  receive(data) {
    this.received = Buffer.concat([this.received, data]);
    let dataLeftOver = true;

    while (dataLeftOver) {
      let oldReadPos = this.readPos;
      let prefix = this.received.slice(this.readPos, this.readPos + 4);
      let msgLength;

      try {
        msgLength = _bufferpack.default.unpack('L', prefix)[0];
      } catch (e) {
        _logger.default.error(`Buffer could not unpack: ${e}`);

        return;
      }

      this.readPos += 4;

      if (this.received.length < msgLength + this.readPos) {
        this.readPos = oldReadPos;
        break;
      }

      let body = this.received.slice(this.readPos, msgLength + this.readPos);
      let plist;

      try {
        plist = _bplistParser.default.parseBuffer(body);
      } catch (e) {
        _logger.default.error(`Error parsing binary plist: ${e}`);

        return;
      }

      if (plist.length === 1) {
        plist = plist[0];
      }

      var _arr = ['WIRMessageDataKey', 'WIRDestinationKey', 'WIRSocketDataKey'];

      for (var _i = 0; _i < _arr.length; _i++) {
        let key = _arr[_i];

        if (!_lodash.default.isUndefined(plist[key])) {
          plist[key] = plist[key].toString("utf8");
        }
      }

      this.readPos += msgLength;
      let leftOver = this.received.length - this.readPos;

      if (leftOver !== 0) {
        let chunk = Buffer.alloc(leftOver);
        this.received.copy(chunk, 0, this.readPos);
        this.received = chunk;
      } else {
        this.received = Buffer.alloc(0);
        dataLeftOver = false;
      }

      this.readPos = 0;

      if (plist) {
        this.messageHandler.handleMessage(plist);
      }
    }
  }

  setTimelineEventHandler(timelineEventHandler) {
    this.timelineEventHandler = timelineEventHandler;
    this.messageHandler.setTimelineEventHandler(timelineEventHandler);
  }

  setConsoleLogEventHandler(consoleEventHandler) {
    this.consoleEventHandler = consoleEventHandler;
    this.messageHandler.setConsoleLogEventHandler(consoleEventHandler);
  }

  setNetworkLogEventHandler(networkEventHandler) {
    this.networkEventHandler = networkEventHandler;
    this.messageHandler.setNetworkEventHandler(networkEventHandler);
  }

}

exports.default = RemoteDebuggerRpcClient;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9yZW1vdGUtZGVidWdnZXItcnBjLWNsaWVudC5qcyJdLCJuYW1lcyI6WyJSZW1vdGVEZWJ1Z2dlclJwY0NsaWVudCIsImNvbnN0cnVjdG9yIiwib3B0cyIsImhvc3QiLCJwb3J0IiwiUkVNT1RFX0RFQlVHR0VSX1BPUlQiLCJzb2NrZXRQYXRoIiwic3BlY2lhbE1lc3NhZ2VIYW5kbGVycyIsIm1lc3NhZ2VQcm94eSIsInNvY2tldCIsImNvbm5lY3RlZCIsImNvbm5JZCIsIlVVSUQiLCJjcmVhdGUiLCJ0b1N0cmluZyIsInNlbmRlcklkIiwiY3VyTXNnSWQiLCJyZWNlaXZlZCIsIkJ1ZmZlciIsImFsbG9jIiwicmVhZFBvcyIsIm1lc3NhZ2VIYW5kbGVyIiwiY29ubmVjdCIsIlJwY01lc3NhZ2VIYW5kbGVyIiwibG9nIiwiZGVidWciLCJuZXQiLCJvbmNlIiwid3JpdGUiLCJKU09OIiwic3RyaW5naWZ5IiwiU29ja2V0IiwidHlwZSIsInNldE5vRGVsYXkiLCJvbiIsInJlY2VpdmUiLCJiaW5kIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJlcnIiLCJlcnJvciIsIm1lc3NhZ2UiLCJkaXNjb25uZWN0IiwiaXNDb25uZWN0ZWQiLCJkZXN0cm95Iiwic2V0U3BlY2lhbE1lc3NhZ2VIYW5kbGVyIiwia2V5IiwiZXJyb3JIYW5kbGVyIiwiaGFuZGxlciIsImdldFNwZWNpYWxNZXNzYWdlSGFuZGxlciIsInNldERhdGFNZXNzYWdlSGFuZGxlciIsImFsbG93TmF2aWdhdGlvbldpdGhvdXRSZWxvYWQiLCJhbGxvdyIsInNlbGVjdEFwcCIsImFwcElkS2V5IiwiYXBwbGljYXRpb25Db25uZWN0ZWRIYW5kbGVyIiwib25BcHBDaGFuZ2UiLCJkaWN0Iiwib2xkQXBwSWRLZXkiLCJXSVJIb3N0QXBwbGljYXRpb25JZGVudGlmaWVyS2V5IiwiY29ycmVjdEFwcElkS2V5IiwiV0lSQXBwbGljYXRpb25JZGVudGlmaWVyS2V5IiwiRXJyb3IiLCJzZW5kIiwiY29ubmVjdGVkQXBwSWRLZXkiLCJwYWdlRGljdCIsIl8iLCJpc0VtcHR5IiwibXNnIiwiZmluYWxseSIsImNvbW1hbmQiLCJvblNvY2tldEVycm9yIiwiZGVmYXVsdHMiLCJkYXRhIiwic29ja2V0Q2IiLCJub29wIiwiZXhjZXB0aW9uIiwiaGFzU3BlY2lhbE1lc3NhZ2VIYW5kbGVyIiwiX19zZWxlY3RvciIsInNwZWNpYWxNZXNzYWdlSGFuZGxlciIsImFyZ3MiLCJ0cnVuY2F0ZSIsImxlbmd0aCIsIl9fYXJndW1lbnQiLCJXSVJTb2NrZXREYXRhS2V5IiwiY29kZSIsInZhbHVlIiwiaXNTdHJpbmciLCJpZCIsImZyb20iLCJwbGlzdCIsImUiLCJjb3JrIiwiYnVmZmVycGFjayIsInBhY2siLCJ1bmNvcmsiLCJyZW1vdmVMaXN0ZW5lciIsImNvbmNhdCIsImRhdGFMZWZ0T3ZlciIsIm9sZFJlYWRQb3MiLCJwcmVmaXgiLCJzbGljZSIsIm1zZ0xlbmd0aCIsInVucGFjayIsImJvZHkiLCJicGxpc3RQYXJzZXIiLCJwYXJzZUJ1ZmZlciIsImlzVW5kZWZpbmVkIiwibGVmdE92ZXIiLCJjaHVuayIsImNvcHkiLCJoYW5kbGVNZXNzYWdlIiwic2V0VGltZWxpbmVFdmVudEhhbmRsZXIiLCJ0aW1lbGluZUV2ZW50SGFuZGxlciIsInNldENvbnNvbGVMb2dFdmVudEhhbmRsZXIiLCJjb25zb2xlRXZlbnRIYW5kbGVyIiwic2V0TmV0d29ya0xvZ0V2ZW50SGFuZGxlciIsIm5ldHdvcmtFdmVudEhhbmRsZXIiLCJzZXROZXR3b3JrRXZlbnRIYW5kbGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBR2UsTUFBTUEsdUJBQU4sQ0FBOEI7QUFDM0NDLEVBQUFBLFdBQVcsQ0FBRUMsSUFBSSxHQUFHLEVBQVQsRUFBYTtBQUFBLHVCQU9sQkEsSUFQa0IsQ0FFcEJDLElBRm9CO0FBQUEsVUFF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bG9kYXNoJztcbmltcG9ydCBicGxpc3RDcmVhdGUgZnJvbSAnYnBsaXN0LWNyZWF0b3InO1xuaW1wb3J0IGJwbGlzdFBhcnNlciBmcm9tICdicGxpc3QtcGFyc2VyJztcbmltcG9ydCBidWZmZXJwYWNrIGZyb20gJ2J1ZmZlcnBhY2snO1xuaW1wb3J0IFByb21pc2UgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IHsgUkVNT1RFX0RFQlVHR0VSX1BPUlQgfSBmcm9tICcuL3JlbW90ZS1kZWJ1Z2dlcic7XG5pbXBvcnQgVVVJRCBmcm9tICd1dWlkLWpzJztcbmltcG9ydCBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCBScGNNZXNzYWdlSGFuZGxlciBmcm9tICcuL3JlbW90ZS1kZWJ1Z2dlci1tZXNzYWdlLWhhbmRsZXInO1xuaW1wb3J0IGdldFJlbW90ZUNvbW1hbmQgZnJvbSAnLi9yZW1vdGUtbWVzc2FnZXMnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlbW90ZURlYnVnZ2VyUnBjQ2xpZW50IHtcbiAgY29uc3RydWN0b3IgKG9wdHMgPSB7fSkge1xuICAgIGNvbnN0IHtcbiAgICAgIGhvc3QgPSAnOjoxJyxcbiAgICAgIHBvcnQgPSBSRU1PVEVfREVCVUdHRVJfUE9SVCxcbiAgICAgIHNvY2tldFBhdGgsXG4gICAgICBzcGVjaWFsTWVzc2FnZUhhbmRsZXJzID0ge30sXG4gICAgICBtZXNzYWdlUHJveHksXG4gICAgfSA9IG9wdHM7XG5cbiAgICAvLyBob3N0L3BvcnQgY29uZmlnIGZvciBUQ1AgY29tbXVuaWNhdGlvbiwgc29ja2V0UGF0aCBmb3IgdW5peCBkb21haW4gc29ja2V0c1xuICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgdGhpcy5wb3J0ID0gcG9ydDtcbiAgICB0aGlzLnNvY2tldFBhdGggPSBzb2NrZXRQYXRoO1xuICAgIHRoaXMubWVzc2FnZVByb3h5ID0gbWVzc2FnZVByb3h5O1xuXG4gICAgdGhpcy5zb2NrZXQgPSBudWxsO1xuICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5jb25uSWQgPSBVVUlELmNyZWF0ZSgpLnRvU3RyaW5nKCk7XG4gICAgdGhpcy5zZW5kZXJJZCA9IFVVSUQuY3JlYXRlKCkudG9TdHJpbmcoKTtcbiAgICB0aGlzLmN1ck1zZ0lkID0gMDtcbiAgICB0aGlzLnJlY2VpdmVkID0gQnVmZmVyLmFsbG9jKDApO1xuICAgIHRoaXMucmVhZFBvcyA9IDA7XG5cbiAgICAvLyBtZXNzYWdlIGhhbmRsZXJzXG4gICAgdGhpcy5zcGVjaWFsTWVzc2FnZUhhbmRsZXJzID0gc3BlY2lhbE1lc3NhZ2VIYW5kbGVycztcbiAgICB0aGlzLm1lc3NhZ2VIYW5kbGVyID0gbnVsbDtcbiAgfVxuXG4gIGFzeW5jIGNvbm5lY3QgKCkge1xuICAgIHRoaXMubWVzc2FnZUhhbmRsZXIgPSBuZXcgUnBjTWVzc2FnZUhhbmRsZXIodGhpcy5zcGVjaWFsTWVzc2FnZUhhbmRsZXJzKTtcblxuICAgIC8vIGNyZWF0ZSBzb2NrZXQgYW5kIGhhbmRsZSBpdHMgbWVzc2FnZXNcbiAgICBpZiAodGhpcy5zb2NrZXRQYXRoKSB7XG4gICAgICBpZiAodGhpcy5tZXNzYWdlUHJveHkpIHtcbiAgICAgICAgLy8gdW5peCBkb21haW4gc29ja2V0IHZpYSBwcm94eVxuICAgICAgICBsb2cuZGVidWcoYENvbm5lY3RpbmcgdG8gcmVtb3RlIGRlYnVnZ2VyIHZpYSBwcm94eSB0aHJvdWdoIHVuaXggZG9tYWluIHNvY2tldDogJyR7dGhpcy5tZXNzYWdlUHJveHl9J2ApO1xuICAgICAgICB0aGlzLnNvY2tldCA9IG5ldC5jb25uZWN0KHRoaXMubWVzc2FnZVByb3h5KTtcblxuICAgICAgICAvLyBGb3J3YXJkIHRoZSBhY3R1YWwgc29ja2V0UGF0aCB0byB0aGUgcHJveHlcbiAgICAgICAgdGhpcy5zb2NrZXQub25jZSgnY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgICBsb2cuZGVidWcoYEZvcndhcmRpbmcgdGhlIGFjdHVhbCB3ZWIgaW5zcGVjdG9yIHNvY2tldCB0byB0aGUgcHJveHk6ICcke3RoaXMuc29ja2V0UGF0aH0nYCk7XG4gICAgICAgICAgdGhpcy5zb2NrZXQud3JpdGUoSlNPTi5zdHJpbmdpZnkoe3NvY2tldFBhdGg6IHRoaXMuc29ja2V0UGF0aH0pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHVuaXggZG9tYWluIHNvY2tldFxuICAgICAgICBsb2cuZGVidWcoYENvbm5lY3RpbmcgdG8gcmVtb3RlIGRlYnVnZ2VyIHRocm91Z2ggdW5peCBkb21haW4gc29ja2V0OiAnJHt0aGlzLnNvY2tldFBhdGh9J2ApO1xuICAgICAgICB0aGlzLnNvY2tldCA9IG5ldC5jb25uZWN0KHRoaXMuc29ja2V0UGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm1lc3NhZ2VQcm94eSkge1xuICAgICAgICAvLyBjb25uZWN0IHRvIHRoZSBwcm94eSBpbnN0ZWFkIG9mIHRoZSByZW1vdGUgZGVidWdnZXIgZGlyZWN0bHlcbiAgICAgICAgdGhpcy5wb3J0ID0gdGhpcy5tZXNzYWdlUHJveHk7XG4gICAgICB9XG5cbiAgICAgIC8vIHRjcCBzb2NrZXRcbiAgICAgIGxvZy5kZWJ1ZyhgQ29ubmVjdGluZyB0byByZW1vdGUgZGVidWdnZXIgJHt0aGlzLm1lc3NhZ2VQcm94eSA/ICd2aWEgcHJveHkgJyA6ICcnfXRocm91Z2ggVENQOiAke3RoaXMuaG9zdH06JHt0aGlzLnBvcnR9YCk7XG4gICAgICB0aGlzLnNvY2tldCA9IG5ldyBuZXQuU29ja2V0KHt0eXBlOiAndGNwNid9KTtcbiAgICAgIHRoaXMuc29ja2V0LmNvbm5lY3QodGhpcy5wb3J0LCB0aGlzLmhvc3QpO1xuICAgIH1cblxuICAgIHRoaXMuc29ja2V0LnNldE5vRGVsYXkodHJ1ZSk7XG4gICAgdGhpcy5zb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnRGVidWdnZXIgc29ja2V0IGRpc2Nvbm5lY3RlZCcpO1xuICAgICAgfVxuICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcbiAgICB9KTtcbiAgICB0aGlzLnNvY2tldC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB9KTtcbiAgICB0aGlzLnNvY2tldC5vbignZGF0YScsIHRoaXMucmVjZWl2ZS5iaW5kKHRoaXMpKTtcblxuICAgIC8vIGNvbm5lY3QgdGhlIHNvY2tldFxuICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAvLyBvbmx5IHJlc29sdmUgdGhpcyBmdW5jdGlvbiB3aGVuIHdlIGFyZSBhY3R1YWxseSBjb25uZWN0ZWRcbiAgICAgIHRoaXMuc29ja2V0Lm9uKCdjb25uZWN0JywgKCkgPT4ge1xuICAgICAgICBsb2cuZGVidWcoYERlYnVnZ2VyIHNvY2tldCBjb25uZWN0ZWRgKTtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuXG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5zb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoYFNvY2tldCBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGhlIGNvbm5lY3Rpb24gd2FzIHJlZnVzZWQsIHNvIHJlamVjdCB0aGUgY29ubmVjdCBwcm9taXNlXG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBkaXNjb25uZWN0ICgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSByZXF1aXJlLWF3YWl0XG4gICAgaWYgKHRoaXMuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgbG9nLmRlYnVnKCdEaXNjb25uZWN0aW5nIGZyb20gcmVtb3RlIGRlYnVnZ2VyJyk7XG4gICAgICB0aGlzLnNvY2tldC5kZXN0cm95KCk7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gIH1cblxuICBpc0Nvbm5lY3RlZCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29ubmVjdGVkO1xuICB9XG5cbiAgc2V0U3BlY2lhbE1lc3NhZ2VIYW5kbGVyIChrZXksIGVycm9ySGFuZGxlciwgaGFuZGxlcikge1xuICAgIHRoaXMubWVzc2FnZUhhbmRsZXIuc2V0U3BlY2lhbE1lc3NhZ2VIYW5kbGVyKGtleSwgZXJyb3JIYW5kbGVyLCBoYW5kbGVyKTtcbiAgfVxuXG4gIGdldFNwZWNpYWxNZXNzYWdlSGFuZGxlciAoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZUhhbmRsZXIuZ2V0U3BlY2lhbE1lc3NhZ2VIYW5kbGVyKGtleSk7XG4gIH1cblxuICBzZXREYXRhTWVzc2FnZUhhbmRsZXIgKGtleSwgZXJyb3JIYW5kbGVyLCBoYW5kbGVyKSB7XG4gICAgdGhpcy5tZXNzYWdlSGFuZGxlci5zZXREYXRhTWVzc2FnZUhhbmRsZXIoa2V5LCBlcnJvckhhbmRsZXIsIGhhbmRsZXIpO1xuICB9XG5cbiAgYWxsb3dOYXZpZ2F0aW9uV2l0aG91dFJlbG9hZCAoYWxsb3cgPSB0cnVlKSB7XG4gICAgdGhpcy5tZXNzYWdlSGFuZGxlci5hbGxvd05hdmlnYXRpb25XaXRob3V0UmVsb2FkKGFsbG93KTtcbiAgfVxuXG4gIGFzeW5jIHNlbGVjdEFwcCAoYXBwSWRLZXksIGFwcGxpY2F0aW9uQ29ubmVjdGVkSGFuZGxlcikge1xuICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAvLyBsb2NhbCBjYWxsYmFjaywgdGVtcG9yYXJpbHkgYWRkZWQgYXMgY2FsbGJhY2sgdG9cbiAgICAgIC8vIGBfcnBjX2FwcGxpY2F0aW9uQ29ubmVjdGVkOmAgcmVtb3RlIGRlYnVnZ2VyIHJlc3BvbnNlXG4gICAgICAvLyB0byBoYW5kbGUgdGhlIGluaXRpYWwgY29ubmVjdGlvblxuICAgICAgbGV0IG9uQXBwQ2hhbmdlID0gKGRpY3QpID0+IHtcbiAgICAgICAgLy8gZnJvbSB0aGUgZGljdGlvbmFyeSByZXR1cm5lZCwgZ2V0IHRoZSBpZHNcbiAgICAgICAgbGV0IG9sZEFwcElkS2V5ID0gZGljdC5XSVJIb3N0QXBwbGljYXRpb25JZGVudGlmaWVyS2V5O1xuICAgICAgICBsZXQgY29ycmVjdEFwcElkS2V5ID0gZGljdC5XSVJBcHBsaWNhdGlvbklkZW50aWZpZXJLZXk7XG5cbiAgICAgICAgLy8gaWYgdGhpcyBpcyBhIHJlcG9ydCBvZiBhIHByb3h5IHJlZGlyZWN0IGZyb20gdGhlIHJlbW90ZSBkZWJ1Z2dlclxuICAgICAgICAvLyB3ZSB3YW50IHRvIHVwZGF0ZSBvdXIgZGljdGlvbmFyeSBhbmQgZ2V0IGEgbmV3IGFwcCBpZFxuICAgICAgICBpZiAob2xkQXBwSWRLZXkgJiYgY29ycmVjdEFwcElkS2V5ICE9PSBvbGRBcHBJZEtleSkge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgV2Ugd2VyZSBub3RpZmllZCB3ZSBtaWdodCBoYXZlIGNvbm5lY3RlZCB0byB0aGUgd3JvbmcgYXBwLiBgICtcbiAgICAgICAgICAgICAgICAgICAgYFVzaW5nIGlkICR7Y29ycmVjdEFwcElkS2V5fSBpbnN0ZWFkIG9mICR7b2xkQXBwSWRLZXl9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBhcHBsaWNhdGlvbkNvbm5lY3RlZEhhbmRsZXIoZGljdCk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ05ldyBhcHBsaWNhdGlvbiBoYXMgY29ubmVjdGVkJykpO1xuICAgICAgfTtcbiAgICAgIHRoaXMuc2V0U3BlY2lhbE1lc3NhZ2VIYW5kbGVyKCdfcnBjX2FwcGxpY2F0aW9uQ29ubmVjdGVkOicsIHJlamVjdCwgb25BcHBDaGFuZ2UpO1xuXG4gICAgICAvLyBkbyB0aGUgYWN0dWFsIGNvbm5lY3RpbmcgdG8gdGhlIGFwcFxuICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBbY29ubmVjdGVkQXBwSWRLZXksIHBhZ2VEaWN0XSA9IGF3YWl0IHRoaXMuc2VuZCgnY29ubmVjdFRvQXBwJywge1xuICAgICAgICAgIGFwcElkS2V5XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHNvbWV0aW1lcyB0aGUgY29ubmVjdCBsb2dpYyBoYXBwZW5zLCBidXQgd2l0aCBhbiBlbXB0eSBkaWN0aW9uYXJ5XG4gICAgICAgIC8vIHdoaWNoIGxlYWRzIHRvIHRoZSByZW1vdGUgZGVidWdnZXIgZ2V0dGluZyBkaXNjb25uZWN0ZWQsIGFuZCBpbnRvIGEgbG9vcFxuICAgICAgICBpZiAoXy5pc0VtcHR5KHBhZ2VEaWN0KSkge1xuICAgICAgICAgIGxldCBtc2cgPSAnRW1wdHkgcGFnZSBkaWN0aW9uYXJ5IHJlY2VpdmVkJztcbiAgICAgICAgICBsb2cuZGVidWcobXNnKTtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKG1zZykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUoW2Nvbm5lY3RlZEFwcElkS2V5LCBwYWdlRGljdF0pO1xuICAgICAgICB9XG4gICAgICB9KSgpO1xuICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgLy8gbm8gbWF0dGVyIHdoYXQsIHdlIHdhbnQgdG8gcmVzdG9yZSB0aGUgaGFuZGxlciB0aGF0IHdhcyBjaGFuZ2VkLlxuICAgICAgdGhpcy5zZXRTcGVjaWFsTWVzc2FnZUhhbmRsZXIoJ19ycGNfYXBwbGljYXRpb25Db25uZWN0ZWQ6JywgbnVsbCwgYXBwbGljYXRpb25Db25uZWN0ZWRIYW5kbGVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHNlbmQgKGNvbW1hbmQsIG9wdHMgPSB7fSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHJlcXVpcmUtYXdhaXRcbiAgICAvLyBlcnJvciBsaXN0ZW5lciwgd2hpY2ggbmVlZHMgdG8gYmUgcmVtb3ZlZCBhZnRlciB0aGUgcHJvbWlzZSBpcyByZXNvbHZlZFxuICAgIGxldCBvblNvY2tldEVycm9yO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIC8vIHByb21pc2UgdG8gYmUgcmVzb2x2ZWQgd2hlbmV2ZXIgcmVtb3RlIGRlYnVnZ2VyXG4gICAgICAvLyByZXBsaWVzIHRvIG91ciByZXF1ZXN0XG5cbiAgICAgIC8vIHJldHJpZXZlIHRoZSBjb3JyZWN0IGNvbW1hbmQgdG8gc2VuZFxuICAgICAgb3B0cyA9IF8uZGVmYXVsdHMoe2Nvbm5JZDogdGhpcy5jb25uSWQsIHNlbmRlcklkOiB0aGlzLnNlbmRlcklkfSwgb3B0cyk7XG4gICAgICBsZXQgZGF0YSA9IGdldFJlbW90ZUNvbW1hbmQoY29tbWFuZCwgb3B0cyk7XG5cbiAgICAgIC8vIG1vc3Qgb2YgdGhlIHRpbWUgd2UgZG9uJ3QgY2FyZSB3aGVuIHNvY2tldC53cml0ZSBkb2VzXG4gICAgICAvLyBzbyBnaXZlIGl0IGFuIGVtcHR5IGZ1bmN0aW9uXG4gICAgICBsZXQgc29ja2V0Q2IgPSBfLm5vb3A7XG5cbiAgICAgIC8vIGhhbmRsZSBzb2NrZXQgcHJvYmxlbXNcbiAgICAgIG9uU29ja2V0RXJyb3IgPSAoZXhjZXB0aW9uKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgICAgIGxvZy5lcnJvcihgU29ja2V0IGVycm9yOiAke2V4Y2VwdGlvbi5tZXNzYWdlfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGhlIGNvbm5lY3Rpb24gd2FzIHJlZnVzZWQsIHNvIHJlamVjdCB0aGUgY29ubmVjdCBwcm9taXNlXG4gICAgICAgIHJlamVjdChleGNlcHRpb24pO1xuICAgICAgfTtcbiAgICAgIHRoaXMuc29ja2V0Lm9uKCdlcnJvcicsIG9uU29ja2V0RXJyb3IpO1xuICAgICAgaWYgKHRoaXMubWVzc2FnZUhhbmRsZXIuaGFzU3BlY2lhbE1lc3NhZ2VIYW5kbGVyKGRhdGEuX19zZWxlY3RvcikpIHtcbiAgICAgICAgLy8gc3BlY2lhbCByZXBsaWVzIHdpbGwgcmV0dXJuIGFueSBudW1iZXIgb2YgYXJndW1lbnRzXG4gICAgICAgIC8vIHRlbXBvcmFyaWx5IHdyYXAgd2l0aCBwcm9taXNlIGhhbmRsaW5nXG4gICAgICAgIGxldCBzcGVjaWFsTWVzc2FnZUhhbmRsZXIgPSB0aGlzLmdldFNwZWNpYWxNZXNzYWdlSGFuZGxlcihkYXRhLl9fc2VsZWN0b3IpO1xuICAgICAgICB0aGlzLnNldFNwZWNpYWxNZXNzYWdlSGFuZGxlcihkYXRhLl9fc2VsZWN0b3IsIHJlamVjdCwgZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgICBsb2cuZGVidWcoYFJlY2VpdmVkIHJlc3BvbnNlIGZyb20gc29ja2V0IHNlbmQ6ICcke18udHJ1bmNhdGUoSlNPTi5zdHJpbmdpZnkoYXJncyksIHtsZW5ndGg6IDUwfSl9J2ApO1xuXG4gICAgICAgICAgLy8gY2FsbCB0aGUgb3JpZ2luYWwgbGlzdGVuZXIsIGFuZCBwdXQgaXQgYmFjaywgaWYgbmVjZXNzYXJ5XG4gICAgICAgICAgc3BlY2lhbE1lc3NhZ2VIYW5kbGVyKC4uLmFyZ3MpO1xuICAgICAgICAgIGlmICh0aGlzLm1lc3NhZ2VIYW5kbGVyLmhhc1NwZWNpYWxNZXNzYWdlSGFuZGxlcihkYXRhLl9fc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAvLyB0aGlzIG1lYW5zIHRoYXQgdGhlIHN5c3RlbSBoYXMgbm90IHJlbW92ZWQgdGhpcyBsaXN0ZW5lclxuICAgICAgICAgICAgdGhpcy5zZXRTcGVjaWFsTWVzc2FnZUhhbmRsZXIoZGF0YS5fX3NlbGVjdG9yLCBudWxsLCBzcGVjaWFsTWVzc2FnZUhhbmRsZXIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUoYXJncyk7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICB9IGVsc2UgaWYgKGRhdGEuX19hcmd1bWVudCAmJiBkYXRhLl9fYXJndW1lbnQuV0lSU29ja2V0RGF0YUtleSkge1xuICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIHRoZSBtZXNzYWdlcyBjb21pbmcgYW5kIGdvaW5nIHVzaW5nXG4gICAgICAgIC8vIGEgc2ltcGxlIHNlcXVlbnRpYWwgaWRcbiAgICAgICAgdGhpcy5jdXJNc2dJZCsrO1xuXG4gICAgICAgIGNvbnN0IGVycm9ySGFuZGxlciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICBjb25zdCBtc2cgPSBgUmVtb3RlIGRlYnVnZ2VyIGVycm9yIHdpdGggY29kZSAnJHtlcnIuY29kZX0nOiAke2Vyci5tZXNzYWdlfWA7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNldERhdGFNZXNzYWdlSGFuZGxlcih0aGlzLmN1ck1zZ0lkLnRvU3RyaW5nKCksIGVycm9ySGFuZGxlciwgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uc3QgbXNnID0gXy50cnVuY2F0ZShfLmlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogSlNPTi5zdHJpbmdpZnkodmFsdWUpLCB7bGVuZ3RoOiA1MH0pO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgUmVjZWl2ZWQgZGF0YSByZXNwb25zZSBmcm9tIHNvY2tldCBzZW5kOiAnJHttc2d9J2ApO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgT3JpZ2luYWwgY29tbWFuZDogJHtjb21tYW5kfWApO1xuICAgICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGF0YS5fX2FyZ3VtZW50LldJUlNvY2tldERhdGFLZXkuaWQgPSB0aGlzLmN1ck1zZ0lkO1xuICAgICAgICBkYXRhLl9fYXJndW1lbnQuV0lSU29ja2V0RGF0YUtleSA9XG4gICAgICAgICAgICBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShkYXRhLl9fYXJndW1lbnQuV0lSU29ja2V0RGF0YUtleSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd2Ugd2FudCB0byBpbW1lZGlhdGVseSByZXNvbHZlIHRoaXMgc29ja2V0LndyaXRlXG4gICAgICAgIC8vIGFueSBsb25nIHRlcm0gY2FsbGJhY2tzIHdpbGwgZG8gdGhlaXIgYnVzaW5lc3MgaW4gdGhlIGJhY2tncm91bmRcbiAgICAgICAgc29ja2V0Q2IgPSByZXNvbHZlO1xuICAgICAgfVxuXG4gICAgICBsb2cuZGVidWcoYFNlbmRpbmcgJyR7ZGF0YS5fX3NlbGVjdG9yfScgbWVzc2FnZSB0byByZW1vdGUgZGVidWdnZXJgKTtcblxuICAgICAgLy8gcmVtb3RlIGRlYnVnZ2VyIGV4cGVjdHMgYSBiaW5hcnkgcGxpc3QgYXMgZGF0YVxuICAgICAgbGV0IHBsaXN0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGxpc3QgPSBicGxpc3RDcmVhdGUoZGF0YSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxldCBtc2cgPSBgQ291bGQgbm90IGNyZWF0ZSBiaW5hcnkgcGxpc3QgZnJvbSBkYXRhOiAke2UubWVzc2FnZX1gO1xuICAgICAgICBsb2cuZXJyb3IobXNnKTtcbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IobXNnKSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnNvY2tldCAmJiB0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgICAvLyBjb3JrIGFuZCB1bmNvcmsgaW4gb3JkZXIgdG8gbm90IGJ1ZmZlciB0aGUgd3JpdGVcbiAgICAgICAgLy8gb24gc29tZSBzeXN0ZW1zIHRoaXMgaXMgbmVjZXNzYXJ5IG9yIHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gZ2V0cyBjb25mdXNlZC5cbiAgICAgICAgdGhpcy5zb2NrZXQuY29yaygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoaXMuc29ja2V0LndyaXRlKGJ1ZmZlcnBhY2sucGFjaygnTCcsIFtwbGlzdC5sZW5ndGhdKSk7XG4gICAgICAgICAgdGhpcy5zb2NrZXQud3JpdGUocGxpc3QsIHNvY2tldENiKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICB0aGlzLnNvY2tldC51bmNvcmsoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IG1zZyA9ICdBdHRlbXB0ZWQgdG8gd3JpdGUgZGF0YSB0byBzb2NrZXQgYWZ0ZXIgaXQgd2FzIGNsb3NlZCEnO1xuICAgICAgICBsb2cuZXJyb3IobXNnKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtc2cpKTtcbiAgICAgIH1cbiAgICB9KVxuICAgIC5maW5hbGx5KCgpID0+IHtcbiAgICAgIC8vIHJlbW92ZSB0aGlzIGxpc3RlbmVyLCBzbyB3ZSBkb24ndCBleGhhdXN0IHRoZSBzeXN0ZW1cbiAgICAgIHRoaXMuc29ja2V0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uU29ja2V0RXJyb3IpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVjZWl2ZSAoZGF0YSkge1xuICAgIC8vIEFwcGVuZCB0aGlzIG5ldyBkYXRhIHRvIHRoZSBleGlzdGluZyBCdWZmZXJcbiAgICB0aGlzLnJlY2VpdmVkID0gQnVmZmVyLmNvbmNhdChbdGhpcy5yZWNlaXZlZCwgZGF0YV0pO1xuICAgIGxldCBkYXRhTGVmdE92ZXIgPSB0cnVlO1xuXG4gICAgLy8gUGFyc2UgbXVsdGlwbGUgbWVzc2FnZXMgaW4gdGhlIHNhbWUgcGFja2V0XG4gICAgd2hpbGUgKGRhdGFMZWZ0T3Zlcikge1xuICAgICAgLy8gU3RvcmUgYSByZWZlcmVuY2UgdG8gd2hlcmUgd2Ugd2VyZVxuICAgICAgbGV0IG9sZFJlYWRQb3MgPSB0aGlzLnJlYWRQb3M7XG5cbiAgICAgIC8vIFJlYWQgdGhlIHByZWZpeCAocGxpc3QgbGVuZ3RoKSB0byBzZWUgaG93IGZhciB0byByZWFkIG5leHRcbiAgICAgIC8vIEl0J3MgYWx3YXlzIDQgYnl0ZXMgbG9uZ1xuICAgICAgbGV0IHByZWZpeCA9IHRoaXMucmVjZWl2ZWQuc2xpY2UodGhpcy5yZWFkUG9zLCB0aGlzLnJlYWRQb3MgKyA0KTtcblxuICAgICAgbGV0IG1zZ0xlbmd0aDtcbiAgICAgIHRyeSB7XG4gICAgICAgIG1zZ0xlbmd0aCA9IGJ1ZmZlcnBhY2sudW5wYWNrKCdMJywgcHJlZml4KVswXTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGBCdWZmZXIgY291bGQgbm90IHVucGFjazogJHtlfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEp1bXAgZm9yd2FyZCA0IGJ5dGVzXG4gICAgICB0aGlzLnJlYWRQb3MgKz0gNDtcblxuICAgICAgLy8gSXMgdGhlcmUgZW5vdWdoIGRhdGEgaGVyZT9cbiAgICAgIC8vIElmIG5vdCwganVtcCBiYWNrIHRvIG91ciBvcmlnaW5hbCBwb3NpdGlvbiBhbmQgZ3Rmb1xuICAgICAgaWYgKHRoaXMucmVjZWl2ZWQubGVuZ3RoIDwgbXNnTGVuZ3RoICsgdGhpcy5yZWFkUG9zKSB7XG4gICAgICAgIHRoaXMucmVhZFBvcyA9IG9sZFJlYWRQb3M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IHRoZSBtYWluIGJvZHkgb2YgdGhlIG1lc3NhZ2UgKHdoZXJlIHRoZSBwbGlzdCBzaG91bGQgYmUpXG4gICAgICBsZXQgYm9keSA9IHRoaXMucmVjZWl2ZWQuc2xpY2UodGhpcy5yZWFkUG9zLCBtc2dMZW5ndGggKyB0aGlzLnJlYWRQb3MpO1xuXG4gICAgICAvLyBFeHRyYWN0IHRoZSBwbGlzdFxuICAgICAgbGV0IHBsaXN0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGxpc3QgPSBicGxpc3RQYXJzZXIucGFyc2VCdWZmZXIoYm9keSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihgRXJyb3IgcGFyc2luZyBiaW5hcnkgcGxpc3Q6ICR7ZX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBicGxpc3RQYXJzZXIucGFyc2VCdWZmZXIgcmV0dXJucyBhbiBhcnJheVxuICAgICAgaWYgKHBsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBwbGlzdCA9IHBsaXN0WzBdO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCBrZXkgb2YgWydXSVJNZXNzYWdlRGF0YUtleScsICdXSVJEZXN0aW5hdGlvbktleScsICdXSVJTb2NrZXREYXRhS2V5J10pIHtcbiAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHBsaXN0W2tleV0pKSB7XG4gICAgICAgICAgcGxpc3Rba2V5XSA9IHBsaXN0W2tleV0udG9TdHJpbmcoXCJ1dGY4XCIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEp1bXAgZm9yd2FyZCB0aGUgbGVuZ3RoIG9mIHRoZSBwbGlzdFxuICAgICAgdGhpcy5yZWFkUG9zICs9IG1zZ0xlbmd0aDtcblxuICAgICAgLy8gQ2FsY3VsYXRlIGhvdyBtdWNoIGJ1ZmZlciBpcyBsZWZ0XG4gICAgICBsZXQgbGVmdE92ZXIgPSB0aGlzLnJlY2VpdmVkLmxlbmd0aCAtIHRoaXMucmVhZFBvcztcblxuICAgICAgLy8gSXMgdGhlcmUgc29tZSBsZWZ0IG92ZXI/XG4gICAgICBpZiAobGVmdE92ZXIgIT09IDApIHtcbiAgICAgICAgLy8gQ29weSB3aGF0J3MgbGVmdCBvdmVyIGludG8gYSBuZXcgYnVmZmVyLCBhbmQgc2F2ZSBpdCBmb3IgbmV4dCB0aW1lXG4gICAgICAgIGxldCBjaHVuayA9IEJ1ZmZlci5hbGxvYyhsZWZ0T3Zlcik7XG4gICAgICAgIHRoaXMucmVjZWl2ZWQuY29weShjaHVuaywgMCwgdGhpcy5yZWFkUG9zKTtcbiAgICAgICAgdGhpcy5yZWNlaXZlZCA9IGNodW5rO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBlbXB0eSB0aGUgYnVmZmVyIGFuZCBnZXQgb3V0IG9mIHRoZSBsb29wXG4gICAgICAgIHRoaXMucmVjZWl2ZWQgPSBCdWZmZXIuYWxsb2MoMCk7XG4gICAgICAgIGRhdGFMZWZ0T3ZlciA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXNldCB0aGUgcmVhZCBwb3NpdGlvblxuICAgICAgdGhpcy5yZWFkUG9zID0gMDtcblxuICAgICAgLy8gTm93IGRvIHNvbWV0aGluZyB3aXRoIHRoZSBwbGlzdFxuICAgICAgaWYgKHBsaXN0KSB7XG4gICAgICAgIHRoaXMubWVzc2FnZUhhbmRsZXIuaGFuZGxlTWVzc2FnZShwbGlzdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2V0VGltZWxpbmVFdmVudEhhbmRsZXIgKHRpbWVsaW5lRXZlbnRIYW5kbGVyKSB7XG4gICAgdGhpcy50aW1lbGluZUV2ZW50SGFuZGxlciA9IHRpbWVsaW5lRXZlbnRIYW5kbGVyO1xuICAgIHRoaXMubWVzc2FnZUhhbmRsZXIuc2V0VGltZWxpbmVFdmVudEhhbmRsZXIodGltZWxpbmVFdmVudEhhbmRsZXIpO1xuICB9XG5cbiAgc2V0Q29uc29sZUxvZ0V2ZW50SGFuZGxlciAoY29uc29sZUV2ZW50SGFuZGxlcikge1xuICAgIHRoaXMuY29uc29sZUV2ZW50SGFuZGxlciA9IGNvbnNvbGVFdmVudEhhbmRsZXI7XG4gICAgdGhpcy5tZXNzYWdlSGFuZGxlci5zZXRDb25zb2xlTG9nRXZlbnRIYW5kbGVyKGNvbnNvbGVFdmVudEhhbmRsZXIpO1xuICB9XG5cbiAgc2V0TmV0d29ya0xvZ0V2ZW50SGFuZGxlciAobmV0d29ya0V2ZW50SGFuZGxlcikge1xuICAgIHRoaXMubmV0d29ya0V2ZW50SGFuZGxlciA9IG5ldHdvcmtFdmVudEhhbmRsZXI7XG4gICAgdGhpcy5tZXNzYWdlSGFuZGxlci5zZXROZXR3b3JrRXZlbnRIYW5kbGVyKG5ldHdvcmtFdmVudEhhbmRsZXIpO1xuICB9XG59XG4iXSwiZmlsZSI6ImxpYi9yZW1vdGUtZGVidWdnZXItcnBjLWNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiIuLi8uLiJ9
