const config = require('../config/config')
const tvChannel = require('../config/TV_CHANNELS')

const allChannels = tvChannel
  .map(innerArray => innerArray.images)
  .flat()
  .map(imagePath => config.getChannelName(imagePath.path))

function sliceOptionName (string) {
  let index = string.indexOf('\n')
  return string.slice(0, index)
}

const options = ['Application Version',
  'OS Version',
  'Platform',
  'Device Model',
  'Build Version']

module.exports.allChannels = allChannels
module.exports.options = options
module.exports.sliceOptionName = sliceOptionName
