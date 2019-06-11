
const Page = require('./page')
const config = require('../../config/config')

const explicitWait = (ms) => new Promise((resolve) => setTimeout(() => {
  resolve()
}, ms))

class PinProtectedEvent extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.navigation = '[class="lane lane-main is-active user-hidden"]'
    this.numberPicker = '.number-picker'
    this.progressBarPlayer = '[class="progress-bar"]'
    this.playerButtons = '[class="buttons"]'
    this.playerClock = '[class="clock is-visible"]'
    this.selectedChannelBanner = '[class="channel is-selected focused"]'
  }

  // go to playing event in background and play it
  async playBlockedChannel () {
    await this.webdriver.waitForVisible(this.navigation, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.LEFT, 1, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1, 500)
    await this.webdriver.waitForVisible(this.numberPicker, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 4, 500)
    await explicitWait(2000)
  }

  async startOverEvent () {
    await super.pressKeyCodeTimes(config.keyCodes.LEFT, 1, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await explicitWait(2000)
  }

  async checkPlayerElements () {
    await this.webdriver.waitForVisible(this.progressBarPlayer, config.waitTime.medium)
    let playerButton = await this.webdriver.isVisible(this.playerButtons)
    let playerClock = await this.webdriver.isVisible(this.playerClock)
    let selectedChannelBanner = await this.webdriver.isVisible(this.selectedChannelBanner)
    if (!playerButton || !playerClock || !selectedChannelBanner) {
      throw new Error(`One of the dom elements provided in the method checkPlayerElements is not visible!`)
    }
  }

  // go to playing event in background
  async backToLive () {
    await this.webdriver.waitForVisible(this.navigation, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.LEFT, 1, 500)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async pinEnter () {
    await this.webdriver.waitForVisible(this.numberPicker, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 4, 500)
  }
}

module.exports = PinProtectedEvent
