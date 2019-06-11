const config = require('../../config/config')
const util = require('../../config/util')
const Page = require('./page')
const assert = require('assert')

class SettingsPage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.settingsLabel = '[id="main-settings-title"]'
    this.navigationContainer = '[class="lane lane-main translate user-hidden""]'
    this.navigation = '.nav-background'
    this.text = '.text'
    this.settingsOptionTitle = '[class="title"]'
    this.testingResults = '[id="Speed Test Results"]'
    this.settingsSelectedOption = '.card.is-selected.enable-hover'
    this.settingsOptions = '.card.enable-hover'
    this.selectedLanguageOption = '.item.has-sublabel.is-active'
    this.systemPreferencesLabel = '[id="System Preferences"]'
    this.languageLabel = '[id="Language"]'
    this.subText = '.text-sub'
    this.PIN = '.pin'
    // PIN CODE
    this.pinCode = [0, 0, 0, 0]
    this.parentalRatingLabel = '[id="Parental Rating"]'
    this.allowedAgeLabel = '[id="Allowed Age Rating"]'
    this.message = '.message'
    this.selectedAgeRestriction = '[clas="item is-active"]'
    this.popUp = '.popup-heading'
    this.pinMessage = '.sub-title'
    this.container = '.container'
    this.onDemandLabel = '[id="On Demand"]'
    this.watchButton = '.button.is-active.is-dark.icon-text'
    this.vodTitle = '[id="vod-title"]'
    this.vodSort = '[id="Sort"]'
    this.vodGenre = '[id="Genres"]'
    this.vodLabel = '[id="On Demand"]'
    this.networkStatus = '[id="Network Status"]'
    this.speedTestResults = '[id="Speed Test Results"]'
    this.expectedPath = '/nav/settings'

    this.langOpt = [
      '[id="Interface Language"]',
      '[id="Keyboard Language"]',
      '[id="Voice Search Language"]',
      '[id="First Audio Language"]',
      '[id="Second Audio Language"]',
      '[id="First Subtitle Language"]',
      '[id="Second Subtitle Language"]'
    ]

    this.ageRestrictionOpt = [
      '12',
      '16',
      '18',
      'Allow All'
    ]

    this.insideLangOpt = [
      '[id="Bosanski"]',
      '[id="Crnogorski"]',
      '[id="English"]',
      '[id="Hrvatski"]',
      '[id="Македонски"]',
      '[id="Slovenščina"]',
      '[id="Srpski"]',
      '[id="French"]',
      '[id="Hungarian"]',
      '[id="Romanian"]',
      '[id="German"]',
      '[id="Italian"]',
      '[id="Spain"]',
      '[id="Portuguese"]',
      '[id="Dutch"]',
      '[id="No Subtitle"]'
    ]

    this.personal = {
      'Summary': 0,
      'Personalization': 1,
      'My Lists': 2,
      'Language': 3,
      'Parental Rating': 4,
      'Remote': 5
    }

    this.systemPreferences = {
      'Video & Audio': 0,
      'Network': 1,
      'System': 2,
      'PIN Code': 3,
      'Contact': 4,
      'Help': 5
    }

    this.myListsSubOptions = [
      '[class="item is-active"]',
      '[class="item"]',
      '[class="text"]'
    ]

    this.tvAndRadioCells = [
      '[class="card is-selected cell"]',
      '[class="card cell"]'
    ]

    this.cellDescription = [
      '[class = "description active"]',
      '[class="first-row"]'
    ]

    this.colors = {
      blue: '#0095da',
      white: '#fbfbfb'
    }

    this.cellColors = {
      white: '#ffffff'
    }

    this.optionListText = 'Lists order'
    this.staticOptions = '[class="item has-sublabel"]'

    this.help = [
      '[id = "settings_help_eon_video_instructions"]'
    ]

    this.vodDetailTitle = '[id="vod-title"]'
    this.synopsis = '[class="synopsis"]'
    this.seeFullButton = '[class="text"]'
    this.metaData = '[class="metadata"]'
  }

  getPath (fullURL) {
    return fullURL.substring(fullURL.lastIndexOf('#') + 1, fullURL.length)
  }

  async navigateToSettings () {
    await this.webdriver.waitForVisible(this.navigation, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 4)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async verifySettingsIsVisible () {
    const url = await this.webdriver.getUrl()
    let test = this.getPath(url)
    if (this.expectedPath !== test) {
      throw new Error('You are not on nav/settings route')
    }
  }

  async enterLanguageOpt (index) {
    await this.webdriver.waitForVisible(this.selectedLanguageOption, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, index, 500)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async clickOnLanguageOpt (index) {
    await this.enterLanguageOpt(index)
  }

  async changeLanguage (langFrom, langTo) {
    await this.webdriver.waitForVisible(this.insideLangOpt.find(elem => elem.includes(langFrom)), config.waitTime.medium)
    await this.webdriver.waitForVisible(this.insideLangOpt.find(elem => elem.includes(langTo)), config.waitTime.medium)
    let distance = await this.insideLangOpt.findIndex(elem => elem.includes(langFrom)) - await this.insideLangOpt.findIndex(elem => elem.includes(langTo))
    await this.distanceDefinedMove(distance)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async changeLanguageReverse (langFrom, langTo) {
    await this.webdriver.waitForVisible(this.selectedLanguageOption, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.changeLanguage(langFrom, langTo)
  }

  async checkSubLangOptLabel (currentLanguage) {
    await this.webdriver.waitForVisible(this.selectedLanguageOption, config.waitTime.medium)
    let subTitle = await this.webdriver.$(this.selectedLanguageOption).$(this.subText).getText()
    await assert.strictEqual(subTitle, currentLanguage)
  }

  async checkForLangOptChange (currentLanguage) {
    await this.checkSubLangOptLabel(currentLanguage)
  }

  // Parental Rating
  async enterPin (pin) {
    await this.webdriver.$(this.PIN).isExisting()
    for (let i = 0; i < 4; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN, pin[i])
      await super.pressKeyCodeTimes(config.keyCodes.OK)
    }
  }

  async enterCorrectPin () {
    await this.enterPin(this.pinCode)
  }

  async parentalRatingPageIsExisting () {
    await this.webdriver.waitForVisible(this.parentalRatingLabel, config.waitTime.medium)
  }

  async enterWrongPin () {
    let wrongPin = this.pinCode
    if (wrongPin[0] !== 5) {
      wrongPin[0] = await 5
    } else {
      wrongPin[0] = await 0
    }
    await this.enterPin(wrongPin)
  }

  async parentalControlMessageExists () {
    await this.webdriver.waitForVisible(this.message, config.waitTime.medium)
  }

  async changeAgeRating (newRestriction) {
    await this.enterPin(this.pinCode)
    await this.parentalRatingPageIsExisting()
    let oldRestriction = await this.webdriver.$(this.subText).getText()
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.allowedAgeLabel, config.waitTime.medium)
    let distance = await (this.ageRestrictionOpt.findIndex(elem => elem.includes(oldRestriction)) - this.ageRestrictionOpt.findIndex(elem => elem.includes(newRestriction)))
    await this.distanceDefinedMove(distance)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.parentalRatingLabel, config.waitTime.medium)
  }

  async distanceDefinedMove (distance) {
    if (distance < 0) {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN, Math.abs(distance), 500)
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.UP, distance, 500)
    }
  }

  async goToMovies () {
    await config.sendCustomKey(config.specialKeyCodes.EON)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.onDemandLabel, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async sortByDateAdded () {
    await this.goToMovies()
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 3)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.vodSort, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async filterHorrors () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.vodGenre, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 8)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.vodLabel, config.waitTime.medium)
    await this.webdriver.pause(2000)
  }

  async playMovie (movieName) {
    await this.goToMovies()
    await this.filterHorrors()
    switch (movieName) {
      case 'The Amityville Horror': {
        await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
        await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 3)
        await super.pressKeyCodeTimes(config.keyCodes.OK)
        break
      }
      case 'Prevenge': {
        await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3)
        await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
        await super.pressKeyCodeTimes(config.keyCodes.OK)
        break
      }
      case 'Legion': {
        await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
        await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
        await super.pressKeyCodeTimes(config.keyCodes.OK)
        break
      }
    }
  }

  async checkForPin (pinExists) {
    await this.webdriver.waitForVisible(this.watchButton, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 2, 400)
    if (pinExists === 1) {
      await this.webdriver.waitForVisible(this.pinMessage, config.waitTime.medium)
    } else {
      await this.webdriver.waitForVisible(this.container, config.waitTime.medium)
    }
  }

  async checkMoviePin (movieName) {
    await this.playMovie(movieName)
    await this.checkForPin(1)
  }

  async checkMovieNoPin (movieName) {
    await this.playMovie(movieName)
    await this.checkForPin(0)
  }
  // this works on any other user except BUILD_TEST
  async validateSettingsPageOption (optionName) {
    await this.webdriver.waitForVisible(this.settingsOptionTitle, config.waitTime.medium)
    let titleLabel = await this.webdriver.$(this.settingsOptionTitle).getText()
    await assert.strictEqual(titleLabel, optionName)
  }

  async navigateToSettingsOption (optionName) {
    await this.verifySettingsIsVisible()
    if (this.personal.hasOwnProperty(optionName)) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT, this.personal[optionName])
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN)
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT, this.systemPreferences[optionName])
    }
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async navigateToNetworkOption (optionName) {
    await this.validateSettingsPageOption('Network')
    if (optionName === 'Speed Test') {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    }
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async navigateToConaxPage () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async validateConaxPage () {
    await this.validateSettingsPageOption('Conax')
  }

  async navigateToConaxOption (optionName) {
    await this.validateSettingsPageOption('Conax')
    if (optionName === 'ECM/EMM') {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    }
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async navigateToHelpOption () {
    await this.webdriver.waitForVisible(this.help[0], config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkDetailScreen () {
    await this.webdriver.waitForVisible(this.vodDetailTitle, config.waitTime.medium)
    let vodTitle = await this.webdriver.isExisting(this.vodDetailTitle)
    let syn = await this.webdriver.isExisting(this.synopsis)
    let seeFull = await this.webdriver.isExisting(this.seeFullButton)
    let meta = await this.webdriver.isExisting(this.metaData)
    if (!vodTitle || !syn || !seeFull || !meta) {
      throw new Error('The detail screen did not load properly')
    }
  }

  async checkForMyListOptions () {
    await this.webdriver.waitForVisible(this.myListsSubOptions[0], config.waitTime.medium)
    let radioOption = await this.webdriver.isExisting(this.myListsSubOptions[1])
    if (!radioOption) {
      throw new Error('Radio option does not exist')
    }
  }

  async moveAndVerifyAllOptions () {
    let options = await this.webdriver.$$(this.myListsSubOptions[1])
    for (let i = 0; i < options.length; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN)
        .then(async () => {
          await this.webdriver.waitForVisible(this.myListsSubOptions[0], config.waitTime.medium)
          let backgroundColor = await this.webdriver.$(this.myListsSubOptions[0]).getCssProperty('background-color')
          let txtColor = await this.webdriver.$(this.myListsSubOptions[0]).$(this.myListsSubOptions[2]).getCssProperty('color')
          if (backgroundColor.parsed.hex !== this.colors.blue || txtColor.parsed.hex !== this.colors.white) {
            throw new Error('background or text color do not match the required colors')
          }
        })
    }
  }

  async goThroughAllCells () {
    let otherCells = await this.webdriver.$$(this.tvAndRadioCells[1])
    for (let i = 0; i < otherCells.length; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
        .then(async () => {
          let backgroundColor = await this.webdriver.$(this.tvAndRadioCells[0]).$(this.cellDescription[0]).getCssProperty('background-color')
          let txtColor = await this.webdriver.$(this.tvAndRadioCells[0]).$(this.cellDescription[0]).$(this.cellDescription[1]).getCssProperty('color')
          if (backgroundColor.parsed.hex !== this.colors.blue || txtColor.parsed.hex !== this.cellColors.white) {
            throw new Error('The color for the selected cells to not match the required color')
          }
        })
    }
  }

  async checkSysInformation () {
    await this.webdriver.waitForVisible(this.staticOptions, config.waitTime.medium)
    let txt = await this.webdriver.$(this.staticOptions)
    let sel = await this.webdriver.getText(txt.selector)
    let slicedOpNames = sel.map(sel => util.sliceOptionName(sel))
    slicedOpNames.forEach(option => {
      let found = util.options.includes(option)
      if (!found) {
        throw new Error('The option name is not existing in the provided ones')
      }
    })
  }

  // used to return to the my lists menu starting state
  async menuReturn () {
    await super.pressKeyCodeTimes(config.keyCodes.BACK)
    await this.webdriver.waitForVisible(this.myListsSubOptions[0], config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.UP, 4)
    await super.pressKeyCodeTimes(config.keyCodes.BACK)
    await super.pressKeyCodeTimes(config.keyCodes.UP)
  }
}

module.exports = SettingsPage
