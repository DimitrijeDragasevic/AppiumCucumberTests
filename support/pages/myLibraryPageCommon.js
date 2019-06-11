const Page = require('./page')
const config = require('../../config/config')

class MyLibraryPageCommon extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver

    this.sideButton = '[class="icon"]'
    this.subMenu = '[class="lane lane-sub is-active user-hidden"]'
    this.subMenuList = '[class="menu"]'
    this.subMenuListItemReminders = '[id="Reminders"]'
    this.subMenuListItemFavorites = '[id="Favorites"]'
  }

  getPath (fullURL) {
    return fullURL.substring(fullURL.lastIndexOf('#') + 1, fullURL.length)
  }

  formTime (str) {
    let index = str.lastIndexOf('//')
    return str.slice(index + 3)
  }

  async navigateToTvChannels () {
    await super.pressKeyCodeTimes(config.keyCodes.UP, 2)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
  }

  async navigateToMyLibrary () {
    await this.webdriver
      .waitForVisible(this.sideButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3)
    await this.webdriver
      .hasFocus(this.sideButton)
  }

  async openMyLibrarySubmenu () {
    await this.webdriver
      .pressKeycode(config.keyCodes.OK)
  }

  async isMyLibrarySubmenuOpened () {
    await this.webdriver
      .waitForVisible(this.subMenu, config.waitTime.medium)
      .waitForVisible(this.subMenuList, config.waitTime.medium)
      .waitForVisible(this.subMenuListItemReminders, config.waitTime.medium)
      .waitForVisible(this.subMenuListItemFavorites, config.waitTime.medium)
  }
}

module.exports = MyLibraryPageCommon
