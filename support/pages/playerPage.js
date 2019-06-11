const { setDefaultTimeout } = require('cucumber')
setDefaultTimeout(5000 * 1000)
const config = require('../../config/config')
const Page = require('./page')

class PlayerPage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.homeButton = '[class="icon"]'

    // player
    this.progressBarPlayer = '[class="progress-bar"]'
    this.playerButtons = '[class="buttons"]'
    this.playerClock = '[class="clock is-visible"]'
    this.selectedChannelBanner = '[class="channel is-selected focused"]'
    this.playerEventStripe = '[class="timeline"]'
    this.playerZapBanner = '[class="channel is-selected focused"]'
    this.playerEventStripeButtons = '[class="items"]'
    this.playerEventStripeButton = '[class="item"]'
    this.playerChannelsStripe = '[class="channels"]'
    this.detailScreen = '[class="description"]'
    this.detailCtaButtons = '[class="buttons"]'
    this.detailFavoritesEnabled = '[class="button is-active icon-text check"]'
    this.detailFavoritesDisabled = '[class="button is-active icon-text"]'
    this.seeFullOpened = '[class="full-screen light title-text"]'
    this.popupPin = '[class="container-pr light"]'
    this.player = '[class="player translate is-visible"]' // this could change
  }

  async navigateToPlayer () {
    await this.webdriver.waitForVisible(this.homeButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.player, config.waitTime.long)
    let popup = await this.webdriver.isExisting(this.popupPin)
    if (popup) {
      await super.pressKeyCodeTimes(config.keyCodes.OK, 4)
    }
    await this.webdriver.waitForVisible(this.progressBarPlayer, config.waitTime.medium)
    let playerButtons = await this.webdriver.isExisting(this.playerButtons)
    if (!playerButtons) {
      throw new Error(`One of the dom elements provided in the method navigateToPlayer is not existing!`)
    }
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

  async checkZapAndEvent () {
    await this.webdriver.waitForVisible(this.playerEventStripe, config.waitTime.medium)
    let zapBanner = await this.webdriver.isVisible(this.playerZapBanner)
    if (!zapBanner) {
      throw new Error('The dom element provided in the method checkZapAndEvent is not visible!')
    }
  }

  async selectOneEventCard () {
    await super.pressKeyCodeTimes(config.keyCodes.LEFT, config.randomNumber)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkEventStripeButtons () {
    await this.webdriver.waitForVisible(this.playerEventStripeButtons, config.waitTime.medium)
    let buttons = await this.webdriver.isVisible(this.playerEventStripeButton)
    if (!buttons) {
      throw new Error('the provided dom element in checkEventStripeButtons method is not visible!')
    }
  }

  async goToDetailScreen () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
  }

  async checkChannelsStripe () {
    await this.webdriver.waitForVisible(this.playerChannelsStripe, config.waitTime.medium)
      .isExisting(this.playerChannelsStripe)
    await this.webdriver.waitForVisible(this.detailCtaButtons, config.waitTime.medium)
      .isExisting(this.detailCtaButtons)
  }

  async checkDetailScreen () {
    await this.webdriver.waitForVisible(this.detailScreen, config.waitTime.medium)
      .isExisting(this.detailScreen)
  }

  async detailActions ({ selectedButton = 1, seeFull = false }) {
    await this.goToDetailScreen()
    await this.checkDetailScreen()
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, selectedButton - 1)
    if (seeFull) await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkFavoritesEnabled () {
    let detailFavoritesDisabled = await this.webdriver.isExisting(this.detailFavoritesDisabled)
    let detailFavoritesEnabled = await this.webdriver.isExisting(this.detailFavoritesEnabled)
    if (detailFavoritesEnabled) {
      await super.pressKeyCodeTimes(config.keyCodes.OK, 2)
      await detailFavoritesEnabled
    } else {
      await detailFavoritesDisabled
      await super.pressKeyCodeTimes(config.keyCodes.OK, 2)
      await detailFavoritesEnabled
    }
  }

  async detailedDescription () {
    await this.webdriver.waitForVisible(this.seeFullOpened, config.waitTime.medium)
      .isExisting(this.seeFullOpened)
  }
}

module.exports = PlayerPage
