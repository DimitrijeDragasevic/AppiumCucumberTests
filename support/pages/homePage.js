const config = require('../../config/config')
const Page = require('../pages/page')
const assert = require('assert')

class HomePage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.homeButton = '[class="icon"]'
    this.nowOnTvTittle = '[class="title light"]'
    this.homeTittle = '[id="Home"]'
    this.searchLogo = '[class="icon"]'
    this.cardRowContainers = '[class="card-row-container"]'
    this.firstCardRow = '[class="card-container"]'
    this.bannerId = '[id="banners"]'

    // search elements
    this.searchButton = '[class="button"]'
    this.carruselMenu = '[class="card-container"]'
    this.searchTextField = '/html/body/main/div[2]/div[1]/div[3]/div'
    this.arrayToEnter = ['s', 'a']
    this.activatedSearchFiled = '[class="field-text"]'
    this.anotherTextFiled = '[class="field"]'

    // carousel menu card selectors
    this.bannerText = '[class="description"]'
    this.bannerImage = '[id="banner-0"]'
    this.bannerCard = '[class="card-container"]'

    // carrusel menu card click selectors
    this.buttonVise = '[class="buttons"]'
    this.mainCardTitle = '[id="event-title"]'
    this.cardText = '[class="main-text-long"]'

    this.videoOnDemandT = '[id="On Demand"]'
    this.videoOnDemandF = '[class="filter-container"]'

    this.radioChannelT = '[id="Radio Channels"]'
    this.nowOnTvCardRow = '[class="card-row"]'
    this.nowOnTvCardTitle = '[class="first-row"]'
    this.nowOnTvCardSelected = '[class="card-container is-selected"]'
    this.nowOnTVCardTime = '[class="timeline progress"]'
    this.nowOnTVSeeAll = '[class="card-container see-all is-selected"]'
    this.nowOnTvPageTitle = '[id="Now on TV"]'
    this.nowOnTvPageCardSe = '[class="card-container is-selected item"]'
    this.nowOnTvPageFilters = '[class="filter-container"]'

    this.clickedTvChannelTitle = '[class="title"]'
    this.OnDemandSelectedCard = '[class="card-container is-selected"]'
    this.OnDemandCardTitle = '[class="first-row-text"]'
    this.clickedOnDemandCard = '[class="buttons episode-buttons"]'
    this.clickedOnDemandCardBanner = '[class="top"]'
    this.clickedOnDemandCardTitle = '[class="main-title"]'
    this.clickedOnDemandCardMainContent = '[class="main"]'
    this.radioCardClickedInfo = '[class="two-events upcoming"]'
    this.radioCardMainContainer = '[class="container"]'

    this.colors = {
      blue: '#0095da',
      black: '#000000',
      orange: '#f4aa0b'
    }
    this.guide = {
      columns: '[class="guide-container"]'
    }
  }

  async navigateToSearchBar () {
    await this.webdriver
      .waitForVisible(this.homeButton, config.waitTime.medium)
      .pressKeycode(config.keyCodes.OK)
      .waitForVisible(this.carruselMenu, config.waitTime.medium)
      .pressKeycode(config.keyCodes.UP)
      .pressKeycode(config.keyCodes.OK)
      .pressKeycode(config.keyCodes.RIGHT)
  }

  async searchForSpecItem () {
    await this.webdriver
      .waitForVisible(this.searchTextField, config.waitTime.medium)
      .pressKeycode(config.keyCodes.OK)
      .waitForVisible(this.activatedSearchFiled, config.waitTime.medium)
      .isExisting(this.activatedSearchFiled)
      .keys('2', '2')
  }

  async navigateToCarruselMenu () {
    await this.webdriver
      .waitForVisible(this.homeButton, config.waitTime.long)
      .pressKeycode(config.keyCodes.RIGHT)
  }

  async checkForCarusleMenu () {
    await this.webdriver
      .waitForVisible(this.carruselMenu, config.waitTime.medium)
      .isExisting(this.carruselMenu)
    let bannerImage = await this.webdriver.isVisible(this.bannerImage)
    let bannerTxt = await this.webdriver.isVisible(this.bannerText)
    if (!bannerImage || !bannerTxt) {
      throw new Error('The banner image or banner text is not visible')
    }
    let bannerColor = await this.webdriver.$('.card-container.is-selected .description')
    let getColor = await this.webdriver.getCssProperty(bannerColor.selector, 'background-color')
    assert.strictEqual(getColor.parsed.hex, this.colors.blue, 'The color is not the one expected')
  }

  async getAllBanners () {
    await super.pressKeyCodeTimes(config.keyCodes.LEFT)
    this.bannersLength = await this.webdriver.$(this.bannerId).$$(this.firstCardRow)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
  }

  async focusAllBanners () {
    await this.getAllBanners()
    for (let i = 0; i < this.bannersLength.length; i++) {
      this.isSelected = await this.webdriver.getAttribute(`[id="banner-${i}"]`, 'class')
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1, 500)
        .then(async () => {
          await this.webdriver.waitForVisible(this.nowOnTvCardSelected, config.waitTime.medium)
        })
        .catch(e => console.error(e))
      if (this.isSelected !== 'card-container is-selected') {
        throw new Error('the card has not received is selected class')
      }
    }
  }

  async getStripeNumber (stripeId) {
    await super.pressKeyCodeTimes(config.keyCodes.LEFT, 1, 500)
    this.timesToMove = await this.webdriver.$(stripeId).$$(this.bannerCard)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1, 500)
  }

  async goThroughStripe () {
    await this.webdriver.waitForVisible(this.nowOnTvCardSelected, config.waitTime.medium)
    for (let i = 0; i < this.timesToMove.length - 1; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
        .then(async () => {
          this.isSelectedCard = await this.webdriver.isVisible(this.nowOnTvCardSelected)
        })
        .catch(e => console.error(e))
      if (!this.isSelectedCard) {
        throw new Error('The second stripe element did not receive the is-selected class')
      }
    }
  }

  async clickOnOneOfTheCaruselCads () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, config.randomNumber)
    console.log(`Going right:${config.randomNumber} times`)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkNowOnTVEle () {
    await this.webdriver.waitForVisible(this.nowOnTvCardSelected, config.waitTime.medium)
    let nowOnTvCard = await this.webdriver.isVisible(this.nowOnTVCardTime)
    let nowTvCardText = await this.webdriver.$(this.nowOnTvCardSelected).$(this.bannerText)
    if (!nowOnTvCard || !nowTvCardText) {
      throw new Error('Card elements on the now on tv cards are missing')
    }
  }

  async goToSeeAllButtonVod () {
    await this.webdriver.waitForVisible(this.nowOnTvCardSelected, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 6)
    await this.webdriver.waitForVisible(this.nowOnTVSeeAll, config.waitTime.medium)
    let seeAll = await this.webdriver.isVisible(this.nowOnTVSeeAll)
    if (!seeAll) {
      throw new Error('See all button is not visible')
    }
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.videoOnDemandT, config.waitTime.medium)
    let filters = await this.webdriver.isVisible(this.videoOnDemandF)
    if (!filters) {
      throw new Error('Filters are not visible')
    }
  }

  async goToSeeAllButtonRadio () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await this.webdriver.waitForVisible(this.nowOnTVSeeAll, config.waitTime.medium)
    await this.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.radioCardMainContainer, config.waitTime.medium)
    let title = await this.webdriver.isExisting(this.radioChannelT)
    if (!title) throw new Error('radio channel tittle is non existent')
  }

  async goToSeeAllButtonNoT () {
    await this.webdriver.waitForVisible(this.nowOnTvCardSelected, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 7)
    await this.webdriver.waitForVisible(this.nowOnTVSeeAll, config.waitTime.medium)
    let seeAll = await this.webdriver.isVisible(this.nowOnTVSeeAll)
    if (!seeAll) {
      throw new Error('See all button is not visible')
    }
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.nowOnTvPageCardSe, config.waitTime.medium)
    let cardSel = await this.webdriver.isVisible(this.nowOnTvPageCardSe)
    if (!cardSel) {
      throw new Error('The now on TV page elements are not visible')
    }
  }

  async checkBannerType () {
    let guide = await this.webdriver.isExisting(this.guide.columns)
    if (guide) {
      console.log('This was a guide banner')
    } else {
      console.log('This is a detail screen banner')
      await this.webdriver.waitForVisible(this.mainCardTitle, config.waitTime.long)
      let mainContainer = await this.webdriver.isExisting(this.mainCardTitle)
      let cardText = await this.webdriver.isExisting(this.cardText)
      if (!mainContainer || !cardText) throw new Error('main container or card text is non existent')
    }
  }

  async navigateToNowOnTV () {
    await this.webdriver.isExisting(this.nowOnTvTittle)
  }

  async clickOnOnTvMenuCard () {
    let isSelectedText = await this.webdriver.getText(this.nowOnTvCardSelected)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.clickedTvChannelTitle, config.waitTime.long)
    let clickedText = await this.webdriver.getText(this.clickedTvChannelTitle)
    isSelectedText.localeCompare(clickedText)
  }

  async navigateToOnDemand () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
  }

  async checkIfOnDemandMenuAndDetails () {
    await this.webdriver.waitForVisible(this.OnDemandSelectedCard, config.waitTime.medium)
    let onDemandSel = await this.webdriver
      .$(this.nowOnTvCardSelected)
      .$(this.nowOnTvCardTitle)
      .$(this.OnDemandCardTitle)
    let onDemandTxtCol = await this.webdriver.$(this.nowOnTvCardSelected).$(this.nowOnTvCardTitle)
    let getTxtCol = await this.webdriver.getCssProperty(onDemandTxtCol.selector, 'color')
    let bannerColor = await this.webdriver.$('.card-container.is-selected .description')
    let getColor = await this.webdriver.getCssProperty(bannerColor.selector, 'background-color')
    let onDemandTxt = await this.webdriver.isVisible(onDemandSel.selector)
    if (!onDemandTxt || getColor.parsed.hex !== this.colors.orange || getTxtCol[1].parsed.hex !== this.colors.black) {
      throw new Error('the vod stripe description is messed up')
    }
  }

  async clickRandomVodCard () {
    for (let i = 0; i < config.randomNumber; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    }
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkOnDemandClickedCard () {
    await this.webdriver
      .waitForVisible(this.clickedOnDemandCard, config.waitTime.medium)
      .isExisting(this.clickedOnDemandCardBanner)
      .isExisting(this.clickedOnDemandCardMainContent)
      .isExisting(this.clickedOnDemandCardTitle)
  }

  async navigateToRadioMenu () {
    this.webdriver.waitForVisible(this.homeButton, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3)
  }

  async clickOnRadioCard () {
    await this.webdriver
      .pause(2000)
      .waitForVisible(this.homeButton, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, config.randomNumber)
    await this.webdriver
      .pressKeycode(config.keyCodes.OK)
  }

  async checkIfOnRadioCardMenuExists () {
    let stringToCompare = 'RADIO CHANNELS'
    await this.webdriver.waitForVisible(this.nowOnTvCardTitle, config.waitTime.medium)
    let returnedTitles = await this.webdriver.getText(this.nowOnTvTittle)
    stringToCompare.localeCompare(returnedTitles[1])
    let cards = await this.webdriver.$(this.nowOnTvCardRow).$(this.bannerText).$(this.nowOnTvCardTitle)
    let description = await this.webdriver.isVisible(cards.selector)
    if (!description) throw new Error('description of the radio cards is messed up')
  }

  async checkIfRadioCardIsOpened () {
    await this.webdriver
      .isExisting(this.radioCardClickedInfo)
      .isExisting(this.radioCardMainContainer)
  }

  async checkForHomeEle () {
    await this.webdriver
      .waitForVisible(this.searchLogo, config.waitTime.long)
      .isExisting(this.searchLogo)
      .isExisting(this.homeTittle)
  }
}

module.exports = HomePage
