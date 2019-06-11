const { setDefaultTimeout } = require('cucumber')
setDefaultTimeout(5000 * 1000)
const config = require('../../config/config')
const Page = require('../pages/page')
const assert = require('assert')

class MainPage extends Page {
  constructor (webdriver) {
    super()
    // Home screen
    this.webdriver = webdriver
    this.sideMenuButton = '[class="item  is-selected"]'
    this.nowOnTvTittle = '[class="title light"]'
    this.onDemandMostPopularCard = '[class="img-shadow"]'
    this.radioCard = '[class="card-container"]'
    this.caruselMenu = '[class="card-container"]'
    this.sideButton = '[class="icon"]'
    this.warapper = '[class="page-wrapper"]'
    this.logo = '[class="provider-logo"]'
    this.mainContainer = '[class="nav-background translate is-active"]'

    // Channels sub menu
    this.inSideChannelManu = '[class="text"]'
    this.nowOnTvContainer = '[class="filter-container"]'
    this.nowOnTvContainerCard = '[class="card-container item"]'
    this.nowOnTVCatagories = '[class="column categories"]'
    this.radioCardContainer = '[class="card-container item-radio"]'

    // On Demand Page title
    this.demandPageTitle = '[class="page-title"]'
    this.cardContainerOnDemand = '[class="card-container vod-banner"]'
    this.onDemandDiscription = '[class="first-row"]'
    this.vodTitleScreen = '[id="vod-title"]'
    this.topPicture = '[class="top"]'

    // My Library page
    this.myLibrarySideMenu = '[class="lane lane-main translate user-hidden"]'
    this.MyLibraryHomeContainer = '[class="home-container"]'
    this.favoritesCard = '[class="img-shadow"]'
    this.myLibraryCard = {
      cardRow: '[class="card-row"]',
      cardContainer: '[class="card-container"]'
    }

    // Settings page
    this.settingsHeader = '[class="settings-container"]'
    this.settingsCardRow = '[class="card-row"]'
    this.settingsContainer = '[class="settings-container"]'

    // Watch page
    this.progressBar = '[class="progress-bar"]'
    this.videoContainer = '[class="container"]'
    this.selectedChannel = '[class="channel is-selected focused"]'

    // Player
    this.progressBarPlayer = '[class="progress-bar"]'
    this.player = '[id="player"]'
    this.playerButtons = '[class="buttons"]'

    // radio player
    this.radioPlayer = '[class="player translate is-visible"]'

    // Clock
    this.timeContainer = '[class="time"]'
    this.timeHours = '[class="time"]'

    this.tutorial = {
      tutorialContainer: '[class="tutorial-container"]',
      centralImage: '[class="central-image"]'

    }
  }

  async checkForClientStart () {
    await this.webdriver.waitForVisible(this.warapper, config.waitTime.long)
    await this.webdriver.waitForVisible(this.logo, config.waitTime.long)
    let wrapper = await this.webdriver.isExisting(this.warapper)
    let mainContainer = await this.webdriver.isExisting(this.mainContainer)
    if (!wrapper || !mainContainer) {
      throw new Error(`The wrapper or the Main Container did not load \n Load Information: \n Wrapper: ${wrapper} \n Main Container: ${mainContainer}`)
    }
  }

  async checkForSideMenu () {
    await this.webdriver.waitForVisible(this.mainContainer, config.waitTime.long)
    let mainContainer = this.webdriver.isExisting(this.mainContainer)
    if (!mainContainer) {
      throw new Error('the side menu did not load')
    }
  }

  // make better
  async clickOnSideMenuButtons () {
    for (let i = 0; i < 4; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN)
        .then(this.hasFocusButton = await this.webdriver.isVisible(this.sideMenuButton))
        .catch(e => {
          console.error(e)
        })
    }
    if (!this.hasFocusButton) {
      throw new Error('the main navigation menu buttons do not get focused')
    }
  }

  async goToMenuByCommand (times) {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, times)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
  }

  async enterScreenRightKey () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await this.webdriver.waitForVisible(this.warapper, config.waitTime.long)
  }

  async clickOnSideButtonHome () {
    await this.webdriver.waitForVisible(this.sideButton, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.hasFocus(this.sideButton)
  }

  async checkHomeButtonScreen () {
    await this.webdriver.waitForVisible(this.caruselMenu, config.waitTime.medium)
      .isExisting(this.caruselMenu)
      .isExisting(this.nowOnTvTittle)
      .isExisting(this.onDemandMostPopularCard)
      .isExisting(this.radioCard)
  }

  async clickOnSideButtonChannels () {
    await this.webdriver.waitForVisible(this.sideButton, config.waitTime.medium)
    let sideMenuButtons = await this.webdriver.elements(this.sideButton)
    let channelsButton = sideMenuButtons.value[1].ELEMENT
    await this.webdriver.elementIdDisplayed(channelsButton)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkContentOnChannelsPage () {
    let returnedSmallMenu = await this.webdriver.elements(this.inSideChannelManu)
    for (let i = 0; i < 3; i++) {
      await this.webdriver.elementIdDisplayed(returnedSmallMenu.value[i].ELEMENT)
    }

    await this.webdriver
      .pressKeycode(config.keyCodes.UP)
      .pressKeycode(config.keyCodes.OK)
      .isExisting(this.nowOnTvContainer)
      .isExisting(this.nowOnTvContainerCard)
      .pressKeycode(config.keyCodes.BACK)
      .pressKeycode(config.keyCodes.DOWN)
      .pressKeycode(config.keyCodes.OK)
      .isExisting(this.nowOnTVCatagories)
      .pressKeycode(config.keyCodes.BACK)
      .pressKeycode(config.keyCodes.DOWN)
      .pressKeycode(config.keyCodes.OK)
      .isExisting(this.radioCardContainer)
  }

  async clickOnSideMenuButtonOnDemand () {
    await this.webdriver.waitForVisible(this.sideButton, config.waitTime.medium)
    let sideMenuButtons = await this.webdriver.elements(this.sideButton)
    let onDemandButton = sideMenuButtons.value[2].ELEMENT
    await this.webdriver.elementIdDisplayed(onDemandButton)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.hasFocus(this.sideButton)
  }

  async checkForContentOnDemandPage () {
    await this.webdriver
      .waitForVisible(this.cardContainerOnDemand, config.waitTime.medium)
      .isExisting(this.cardContainerOnDemand)
      .isExisting(this.demandPageTitle)

    for (let i = 0; i < config.randomNumber; i++) {
      await this.webdriver
        .pause(config.waitTime.mini)
        .pressKeycode(config.keyCodes.RIGHT)
    }

    await this.webdriver
      .pause(config.waitTime.mini)
      .pressKeycode(config.keyCodes.DOWN)

    for (let i = 0; i < config.randomNumber; i++) {
      await this.webdriver
        .pause(config.waitTime.mini)
        .pressKeycode(config.keyCodes.RIGHT)
    }

    await this.webdriver
      .pause(config.waitTime.mini)
      .pressKeycode(config.keyCodes.DOWN)

    for (let i = 0; i < config.randomNumber; i++) {
      await this.webdriver
        .pause(config.waitTime.mini)
        .pressKeycode(config.keyCodes.RIGHT)
    }
  }

  async clickOnMyLibrarySideButton () {
    await this.webdriver
      .waitForVisible(this.sideButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
      .then(async () => {
        await this.webdriver.hasFocus(this.sideButton)
      }).catch(e => console.error(e))
  }

  async checkMyLibraryPage () {
    await this.webdriver.waitForVisible(this.myLibrarySideMenu, config.waitTime.medium)
    let myHomeContainer = await this.webdriver.isExisting(this.MyLibraryHomeContainer)
    if (!myHomeContainer) {
      throw new Error('my library home container did not load')
    }
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    let favoritesCard = await this.webdriver.isExisting(this.myLibraryCard.cardRow)
    if (!favoritesCard) {
      throw new Error('favorite cards are not displayed')
    }
    let cardRow = await this.webdriver.$(this.myLibraryCard.cardRow).$$(this.myLibraryCard.cardContainer)
    for (let i = 0; i < cardRow.length; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1, 400)
    }
  }

  async clickOnSideButtonSettings () {
    await this.webdriver.waitForVisible(this.sideButton, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 4)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkContentOSettingsPage () {
    await this.webdriver
      .waitForVisible(this.settingsHeader, config.waitTime.medium)
      .isExisting(this.settingsCardRow)
      .isExisting(this.settingsContainer)
  }

  async clickOnWatchButton () {
    await this.webdriver.waitForVisible(this.sideButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 5)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkForPlayer () {
    let player = await this.webdriver.isVisible(this.progressBarPlayer)
    let radioPlayer = await this.webdriver.isVisible(this.radioPlayer)
    console.log(player, radioPlayer)
    if (!player && !radioPlayer) throw new Error('the player did not load')
  }

  async checkForClock () {
    let deviceTimeAndDate = await this.webdriver.getDeviceTime()
    let deviceFormattedTime = deviceTimeAndDate.value.slice(11, 16)
    await this.webdriver.waitForVisible(this.timeContainer, config.waitTime.medium)
    let mTime = await this.webdriver.getText(this.timeHours)
    let string = mTime.indexOf('-') + 5
    let slicedString = mTime.slice(string, string + 6)
    let trimString = slicedString.trim()
    assert.strictEqual(trimString, deviceFormattedTime, `the app time => ${trimString} does not mach the current time => ${deviceFormattedTime}`)
  }

  async checkForTutorial () {
    await this.webdriver.waitForVisible(this.tutorial.tutorialContainer)
    let centralImage = await this.webdriver.isVisible(this.tutorial.centralImage)
    if (!centralImage) {
      throw new Error('The central image did not load or render')
    }
  }

  async checkForTutorialEnd () {
    let centralImage = await this.webdriver.isVisible(this.tutorial.centralImage)
    if (centralImage) {
      throw new Error('The tutorial has not disappeared')
    }
  }
}

module.exports = MainPage
