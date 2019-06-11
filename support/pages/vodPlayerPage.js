const { setDefaultTimeout } = require('cucumber')
setDefaultTimeout(5000 * 1000)
const config = require('../../config/config')
const Page = require('./page')

class VodPlayerPage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.homeButton = '[class="icon"]'
    this.vodPlayer = '[class="player translate is-visible"]'
    this.vodLandingPage = '[class="container container-dark"]'
    this.vodDetailBgImage = '[class="background-image"]'
    this.playerIconPause = '[id="pause"]'
    this.playerIconPlay = '[id="play"]'
  }

  async navigateToVodPlayer () {
    await this.webdriver.waitForVisible(this.homeButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.vodLandingPage, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.vodDetailBgImage, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.UP, 2)
  }

  async checkVodPlayerElements () {
    await this.webdriver.waitForVisible(this.vodPlayer, config.waitTime.medium)
      .isExisting(this.vodPlayer)
  }

  async checkPlayerIconStatus () {
    let playerIconPause = await this.webdriver.isExisting(this.playerIconPause)
    let playerIconPlay = await this.webdriver.isExisting(this.playerIconPlay)
    if (playerIconPause) {
      await super.pressKeyCodeTimes(config.keyCodes.OK)
      await playerIconPlay
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.OK)
      await playerIconPause
    }
  }
}

module.exports = VodPlayerPage
