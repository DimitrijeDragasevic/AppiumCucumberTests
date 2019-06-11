const { appLocation } = require('../config/appLocation')
const _ = require('lodash')

class TestData {
  static load (commandPath) {
    return (commandPath === undefined || !_.isString(commandPath) || commandPath === '') ? appLocation : commandPath
  }
}

module.exports = TestData
