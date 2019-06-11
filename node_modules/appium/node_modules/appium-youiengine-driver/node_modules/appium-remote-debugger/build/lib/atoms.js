"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAtoms = getAtoms;
exports.default = void 0;

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _appiumSupport = require("appium-support");

var _path = _interopRequireDefault(require("path"));

const atomsCache = {};

function getAtoms(_x) {
  return _getAtoms.apply(this, arguments);
}

function _getAtoms() {
  _getAtoms = (0, _asyncToGenerator2.default)(function* (atomName) {
    let atomFileName = __filename.indexOf('build/lib/atoms') !== -1 ? _path.default.resolve(__dirname, '..', '..', 'atoms', `${atomName}.js`) : _path.default.resolve(__dirname, '..', 'atoms', `${atomName}.js`);

    if (!atomsCache.hasOwnProperty(atomName)) {
      try {
        atomsCache[atomName] = yield _appiumSupport.fs.readFile(atomFileName);
      } catch (e) {
        throw new Error(`Unable to load Atom '${atomName}' from file '${atomFileName}'`);
      }
    }

    return atomsCache[atomName];
  });
  return _getAtoms.apply(this, arguments);
}

var _default = getAtoms;
exports.default = _default;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9hdG9tcy5qcyJdLCJuYW1lcyI6WyJhdG9tc0NhY2hlIiwiZ2V0QXRvbXMiLCJhdG9tTmFtZSIsImF0b21GaWxlTmFtZSIsIl9fZmlsZW5hbWUiLCJpbmRleE9mIiwicGF0aCIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJoYXNPd25Qcm9wZXJ0eSIsImZzIiwicmVhZEZpbGUiLCJlIiwiRXJyb3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBOztBQUNBOztBQUdBLE1BQU1BLFVBQVUsR0FBRyxFQUFuQjs7U0FFZUMsUTs7Ozs7OENBQWYsV0FBeUJDLFFBQXpCLEVBQW1DO0FBQ2pDLFFBQUlDLFlBQVksR0FBR0MsVUFBVSxDQUFDQyxPQUFYLENBQW1CLGlCQUFuQixNQUEwQyxDQUFDLENBQTNDLEdBQ2pCQyxjQUFLQyxPQUFMLENBQWFDLFNBQWIsRUFBd0IsSUFBeEIsRUFBOEIsSUFBOUIsRUFBb0MsT0FBcEMsRUFBOEMsR0FBRU4sUUFBUyxLQUF6RCxDQURpQixHQUVqQkksY0FBS0MsT0FBTCxDQUFhQyxTQUFiLEVBQXdCLElBQXhCLEVBQThCLE9BQTlCLEVBQXdDLEdBQUVOLFFBQVMsS0FBbkQsQ0FGRjs7QUFLQSxRQUFJLENBQUNGLFVBQVUsQ0FBQ1MsY0FBWCxDQUEwQlAsUUFBMUIsQ0FBTCxFQUEwQztBQUN4QyxVQUFJO0FBQ0ZGLFFBQUFBLFVBQVUsQ0FBQ0UsUUFBRCxDQUFWLFNBQTZCUSxrQkFBR0MsUUFBSCxDQUFZUixZQUFaLENBQTdCO0FBQ0QsT0FGRCxDQUVFLE9BQU9TLENBQVAsRUFBVTtBQUNWLGNBQU0sSUFBSUMsS0FBSixDQUFXLHdCQUF1QlgsUUFBUyxnQkFBZUMsWUFBYSxHQUF2RSxDQUFOO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPSCxVQUFVLENBQUNFLFFBQUQsQ0FBakI7QUFDRCxHOzs7O2VBR2NELFEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmcyB9IGZyb20gJ2FwcGl1bS1zdXBwb3J0JztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5cbmNvbnN0IGF0b21zQ2FjaGUgPSB7fTtcblxuYXN5bmMgZnVuY3Rpb24gZ2V0QXRvbXMgKGF0b21OYW1lKSB7XG4gIGxldCBhdG9tRmlsZU5hbWUgPSBfX2ZpbGVuYW1lLmluZGV4T2YoJ2J1aWxkL2xpYi9hdG9tcycpICE9PSAtMSA/XG4gICAgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ2F0b21zJywgYCR7YXRvbU5hbWV9LmpzYCkgOlxuICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICdhdG9tcycsIGAke2F0b21OYW1lfS5qc2ApO1xuXG4gIC8vIGNoZWNrIGlmIHdlIGhhdmUgYWxyZWFkeSBsb2FkZWQgYW4gY2FjaGVkIHRoaXMgYXRvbVxuICBpZiAoIWF0b21zQ2FjaGUuaGFzT3duUHJvcGVydHkoYXRvbU5hbWUpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF0b21zQ2FjaGVbYXRvbU5hbWVdID0gYXdhaXQgZnMucmVhZEZpbGUoYXRvbUZpbGVOYW1lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBsb2FkIEF0b20gJyR7YXRvbU5hbWV9JyBmcm9tIGZpbGUgJyR7YXRvbUZpbGVOYW1lfSdgKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYXRvbXNDYWNoZVthdG9tTmFtZV07XG59XG5cbmV4cG9ydCB7IGdldEF0b21zIH07XG5leHBvcnQgZGVmYXVsdCBnZXRBdG9tcztcbiJdLCJmaWxlIjoibGliL2F0b21zLmpzIiwic291cmNlUm9vdCI6Ii4uLy4uIn0=
