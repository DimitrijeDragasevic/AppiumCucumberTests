const { setDefaultTimeout } = require('cucumber')
setDefaultTimeout(5000 * 1000)
const config = require('../../config/config')
const Page = require('./page')

class RadioPage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.channelTitle = {}
    this.homeButton = '[class="icon"]'
    this.progressBarPlayer = '[class="player translate is-visible"]'
    this.upcomingEvents = '[class="two-events upcoming"]'
    this.titleSection = '[class="text"]'
  }

  async navigateToRadioPlayer () {
    await this.webdriver.waitForVisible(this.homeButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.checkUpcomingEvents()
  }

  async checkUpcomingEvents () {
    await this.webdriver.waitForVisible(this.progressBarPlayer, config.waitTime.medium)
    let upcomingEvents = await this.webdriver.isExisting(this.upcomingEvents)
    if (!upcomingEvents) {
      throw new Error(`One of the dom elements provided in the method navigateToPlayer is not existing!`)
    }
  }

  async changeRadioChannel () {
    this.channelTitle.currentChannelTitle = await this.webdriver.waitForVisible(this.titleSection, config.waitTime.medium).getText(this.titleSection)
    await super.pressKeyCodeTimes(config.keyCodes.SCROLLUP)
  }

  async checkRadioChannelTitle () {
    this.channelTitle.nextChannelTitle = await this.webdriver.getText(this.titleSection)
    if (this.channelTitle.currentChannelTitle === this.channelTitle.nextChannelTitle) {
      throw new Error(`Title should be different than the previous one!`)
    }
  }
}

module.exports = RadioPage
