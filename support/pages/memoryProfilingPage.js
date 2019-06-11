const { setDefaultTimeout } = require('cucumber')
setDefaultTimeout(5000 * 1000)
const Page = require('./page')
const config = require('../../config/config')
const { writeInFile } = require('../../report/report')
const ADB = require('appium-adb').ADB

const KEYPRESS_DELAY = 1200
const locators = {
  home: {
    TITLE: '[id="Home"]',
    MAIN_SCREEN: '[class="right-side navigation-active"]',
    STRIPE: '[class="card-row-container"]'
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(() => {
  resolve()
}, ms))

async function getDeviceMemory () {
  const adb = await ADB.createADB()
  return await adb.shell(
    'top -bn1 -p `pidof com.google.android.webview:s`'
  )
}

const createReport = async (result) => {
  const memoryReport = await getDeviceMemory()
  result.push({
    report: memoryReport,
    time: Date.now()
  })
  writeInFile(result)
}

class MemoryProfilingPage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
  }

  async pressDelayedKeyCodeTimes (keyCode, timesToPress = 1, delay = KEYPRESS_DELAY) {
    if (keyCode === undefined) {
      throw new Error('Keycode is undefined')
    }
    for (let i = 0; i < timesToPress; i++) {
      await wait(delay)
      // await webdriver.keys(keyCode)
      await super.pressKeyCodeTimes(keyCode)
    }
  }

  async openVodCatalogue () {
    await createReport(result)
    // Initial wait for Home screen to be rendered
    await wait(15000)
  }

  async playRandomVods () {
    let result = []
    await createReport(result)
    await this.pressDelayedKeyCodeTimes(config.keyCodes.LEFT)
    for (let i = 0; i < 12; i++) {
      await createReport(result)
      for (let k = 0; k < 100; k++) {
        await createReport(result)
        await wait(20000)
        await createReport(result)
        await this.pressDelayedKeyCodeTimes(config.keyCodes.BACK)
        await createReport(result)
        await wait(2000)
        await createReport(result)
        await this.pressDelayedKeyCodeTimes(config.keyCodes.OK)
      }
      await createReport(result)
    }
    await createReport(result)
  }
}
module.exports = MemoryProfilingPage
