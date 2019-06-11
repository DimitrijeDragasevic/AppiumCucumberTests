const Page = require('./page')
const config = require('../../config/config')

const explicitWait = (ms) => new Promise((resolve) => setTimeout(() => {
  resolve()
}, ms))

const SECOND = 1000

class disableMoreLikeThis extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.popup = '[class="popup"]'
    this.navigation = '[class="lane lane-main is-active user-hidden"]'
    this.playerButtons = '[class="buttons"]'
    this.vodBanner = '[class="card-container is-selected vod-banner"]'
    this.moreStripe = '[class="more"]'
    this.text = '.text'
  }

  async allowAllAgeRating () {
    // Navigate to Settings screen
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 4, 500)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    // Navigate to Parental Rating setting
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 4, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    // Enter correct PIN code
    await super.pressKeyCodeTimes(config.keyCodes.OK, 4, 500)
    // Set AgeRating to Allow All value
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async setDefaultAgeRating () {
    // Navigate to Settings screen
    await config.sendCustomKey(config.specialKeyCodes.EON)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 4, 500)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    // Navigate to Parental Rating setting
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 4, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    // Enter correct PIN code
    await super.pressKeyCodeTimes(config.keyCodes.OK, 4, 500)
    // Set AgeRating to Allow All value
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.UP, 1)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async navigateToEpisode () {
    // Initial wait for app to start up
    await this.webdriver.waitForVisible(this.navigation, config.waitTime.long)
    // Make sure serie is not pin protected and do not show pin popup
    await this.allowAllAgeRating()
    // Navigate to VOD Landing page
    await config.sendCustomKey(config.specialKeyCodes.ON_DEMAND)
    // Navigate to series category on VOD landing
    await this.webdriver.waitForVisible(this.vodBanner, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2, 500)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    // Wait to fetch assets
    await explicitWait(1500)
  }

  async findAndPlayEpisode () {
    // Enter Seassons and select episode
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    // Wait for loader to hide
    await explicitWait(2000)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 4, 1500)

    // Play and watch episode
    await this.webdriver.waitForVisible(this.popup, config.waitTime.medium).then(async () => {
      await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
      await explicitWait(5 * SECOND)
    }).catch(async () => {
      await explicitWait(65 * SECOND)
    })
  }

  async checkMoreLikeThis () {
    // Enter Vod Landing
    await config.sendCustomKey(config.specialKeyCodes.EON)
    await this.webdriver.waitForVisible(this.navigation, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2, 500)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 500)
    await this.webdriver.waitForVisible(this.vodBanner, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    // Vod detail screen info wait to fetch
    await explicitWait(2000)
    // Go down twice to get more like this section
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2, 500)
    const moreLikeThisExist = await this.webdriver.isExisting(this.moreStripe)
    if (moreLikeThisExist) {
      throw new Error('More like this stripe should not be rendered')
    }
    await explicitWait(2000)
    const buttons = await this.webdriver.getText(this.text, 'BUTTONS')
    const checkForMore = buttons.includes('MORE')
    if (checkForMore) {
      throw new Error('More button should not be rendered')
    }
    await explicitWait(1000)
    await this.setDefaultAgeRating()
  }
}

module.exports = disableMoreLikeThis
