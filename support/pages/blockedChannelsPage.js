const Page = require('./page')
const config = require('../../config/config')

const PIN_CODE_PERIOD_ITEMS_LENGTH = 6
const explicitWait = (ms) => new Promise((resolve) => setTimeout(() => {
  resolve()
}, ms))

class BlockedChannelsPage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver

    this.category
    this.navigation = '[class="lane lane-main is-active user-hidden"]'
    this.numberPicker = '.number-picker'
    this.rowTitle = '.row-title'
    this.aboveTitle = '.above-title'
    this.cardRow = '.card-row'
    this.listItem = '.list .item'
    this.channelCategoryItem = '[class="item-row item icon-category label category-label is-selected"]'
    this.twoSidedItems = '.list-container .text'
    this.twoSidedItemActive = '[class="item is-active"]'
    this.navSublane = '[class="lane lane-sub is-active user-hidden"]'
    this.selectedGuideEvent = '[class="item label-event item-row is-selected"]'
    this.pin = '.pin'
    this.lockPad = 'div.card.is-selected.cell > div > svg'
  }

  async setPinCodePeriod () {
    await this.webdriver.waitForVisible(this.navigation, config.waitTime.long)
    // Navigating to Settings
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 4, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.cardRow, config.waitTime.medium)
    // Navigating to PIN Code Setting
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 3, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.aboveTitle, config.waitTime.medium)
    // Navigating to Remeber PIN Code Setting
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    // Set Remember PIN Code to No timeout
    await this.webdriver.waitForVisible(this.aboveTitle, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.UP, PIN_CODE_PERIOD_ITEMS_LENGTH)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async setLiveChannelEventCategory () {
    // Get current live events category
    await config.sendCustomKey(config.specialKeyCodes.EON)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2, 500)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.LEFT)
    await explicitWait(1000)
    this.webdriver.waitForVisible(this.channelCategoryItem, config.waitTime.medium)
    this.category = await this.webdriver.getText(this.channelCategoryItem)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 4, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await explicitWait(1500)
  }

  async navigateToBlockChannels () {
    await config.sendCustomKey(config.specialKeyCodes.EON)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 4, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 4, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    // Enter valid pin
    await this.webdriver.waitForVisible(this.numberPicker, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 4, 500)
    await explicitWait(1000)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async changeTVCategory (category, categoriesLength) {
    for (let i = 0; i < categoriesLength; i++) {
      await explicitWait(800)
      await this.webdriver.waitForVisible(this.twoSidedItemActive, config.waitTime.medium)
      const text = await this.webdriver.getText(this.twoSidedItemActive)
      if (text === category) {
        super.pressKeyCodeTimes(config.keyCodes.OK)
        return
      }
      super.pressKeyCodeTimes(config.keyCodes.DOWN)
    }
  }

  async playBlockedChannel () {
    await super.pressKeyCodeTimes(config.keyCodes.BACK)
    await this.webdriver.waitForVisible(this.aboveTitle, config.waitTime.medium)
    await config.sendCustomKey(config.specialKeyCodes.EON)
    await this.webdriver.waitForVisible(this.navigation, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await this.webdriver.waitForVisible(this.navSublane, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 3, 500)
    await super.pressKeyCodeTimes(config.keyCodes.UP)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await this.webdriver.waitForVisible(this.selectedGuideEvent, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await explicitWait(3000)
  }

  async addToBlockedChannelList () {
    await this.webdriver.waitForVisible(this.rowTitle, config.waitTime.medium)
    // Changing TV Category
    await super.pressKeyCodeTimes(config.keyCodes.UP)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.aboveTitle, config.waitTime.medium)
    await this.webdriver.waitForVisible(this.twoSidedItems, config.waitTime.medium)
    const categories = await this.webdriver.$$(this.twoSidedItems)
    await this.changeTVCategory(this.category, categories.length)
    // Adding TV Channel to Blocked Channel list
    await this.webdriver.waitForVisible(this.rowTitle, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    // await this.webdriver.waitForVisible(this.lockPad, config.waitTime.medium)
    const alreadyLocked = await this.webdriver.isExisting(this.lockPad)
    if (alreadyLocked) {
      await super.pressKeyCodeTimes(config.keyCodes.OK) // Unlock
      await explicitWait(1000)
      await super.pressKeyCodeTimes(config.keyCodes.OK) // Lock again
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.OK) // Lock if is unlocked
    }
  }

  async pinPopupCheck () {
    await this.webdriver.waitForVisible(this.numberPicker, config.waitTime.long)
    await this.webdriver.waitForVisible(this.pin, config.waitTime.medium)
  }
}

module.exports = BlockedChannelsPage
