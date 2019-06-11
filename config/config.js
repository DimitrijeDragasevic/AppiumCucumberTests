const ADB = require('appium-adb').ADB
const _ = require('lodash')
const TestData = require('../support/testData')

const randomNumber = Math.floor(Math.random() * 6)
const bigRandomNumber = Math.floor(Math.random() * 11)

const keyCodes = {
  'UP': 19,
  'DOWN': 20,
  'LEFT': 21,
  'RIGHT': 22,
  'BACK': 4,
  'OK': 23,
  'FF': 90,
  'SCROLLUP': 166,
  'SCROLLDOWN': 167
}

const specialKeyCodes = {
  'EON': 'eon',
  'GUIDE': 'guide',
  'ON_DEMAND': 'ondemand',
  'RADIO': 'radio',
  'SOURCE_EXIT': 'livetv',
  'SEARCH': 'search'
}

const waitTime = {
  'mini': 200,
  'shorter': 1000,
  'short': 5000,
  'medium': 10000,
  'long': 15000
}

async function sendCustomKey (key) {
  const adb = await ADB.createADB()
  if (!_.isString(key) || key === undefined) {
    throw new Error(`this ${key} is not valid key !`)
  }
  await adb.shell([
    'am', 'broadcast',
    '-a', 'com.ug.eon.android.tv.specialkeys',
    '--es', 'key', `${key}`,
    '-p', 'com.ug.eon.android.tv'
  ])
}

async function sendKeyCode (key, times) {
  const adb = await ADB.createADB()
  if (_.isString(key) || key === undefined) {
    throw new Error(`this ${key} is not a valid keycode`)
  }

  for (let i = 0; i < times; i++) {
    await adb.shell(`input keyevent ${key}`)
    console.log('I sent a keycode!')
  }
}

function getChannelName (imagePath) {
  let index = imagePath.indexOf('_')
  return imagePath.slice(21, index)
}

function getPictureLogoName (imageTag) {
  let index = imageTag.indexOf('_')
  return imageTag.slice(80, index)
}

function getHoursFromStr (str) {
  let first = str.indexOf('//') + 3
  return str.slice(first, first + 2)
}

function getHoursAndMinsFromStr (str) {
  let first = str.indexOf('\n')
  return str.slice(first, first + 6).trim()
}

function getCurrentTime () {
  let unFormattedDate = new Date()
  let currentHour = unFormattedDate.getHours().toString()
  let currentMinute = unFormattedDate.getMinutes().toString()
  // current time
  return currentHour.concat(':', currentMinute)
}

module.exports.getHoursAndMinsFromStr = getHoursAndMinsFromStr
module.exports.getCurrentTime = getCurrentTime
module.exports.sendKeyCode = sendKeyCode
module.exports.getHoursFromStr = getHoursFromStr
module.exports.sendCustomKey = sendCustomKey
module.exports.specialKeyCodes = specialKeyCodes
module.exports.waitTime = waitTime
module.exports.keyCodes = keyCodes
module.exports.randomNumber = randomNumber
module.exports.getChannelName = getChannelName
module.exports.getPictureLogoName = getPictureLogoName
module.exports.bigRandomNumber = bigRandomNumber
