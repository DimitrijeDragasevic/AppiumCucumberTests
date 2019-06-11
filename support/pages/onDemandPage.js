const { setDefaultTimeout } = require('cucumber')
setDefaultTimeout(5000 * 1000)
const config = require('../../config/config')
const Page = require('./page')
const assert = require('assert')

class OnDemandPage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.homeButton = '[class="icon"]'
    this.onDemandTitle = '[id="On Demand"]'
    this.searchIcon = '[class="icon"]'
    this.continueTitle = '[class="title dark"]'
    this.enterDetailTitle = '[class="page-title"]'

    this.orangeColorHex = '#f4aa0b'
    this.blackColorHex = '#000000'

    // first stripe cards
    this.firstBannerNotSelected = '[class="card-container vod-banner"]'
    this.firstBannerSelected = '[class="card-container is-selected vod-banner"]'
    this.firstBannerDescription = '[class="description"]'
    this.firstBannerTxt = '[class="first-row"]'
    this.subTitles = '[class="title dark"]'
    this.stripeContainer = '[class="card-row-container"]'
    this.vodTitle = '[class="first-row"]'
    this.topPicture = '[class="top"]'
    this.vodPoster = '[class="vod-poster-container"]'
    this.allButtons = '[class="buttons episode-buttons"]'
    this.vodDetailTitle = '[id="vod-title"]'
    this.synopsis = '[class="synopsis"]'
    this.seeFullButton = '[class="text"]'
    this.metaData = '[class="metadata"]'
    this.regularCard = '[class="card-container"]'

    // all stripes
    this.firstStripeId = '[id="banner"]'
    this.virtualCatalogsStripe = '[id="virtual-catalogues"]'
    this.continueWatchingStripe = '[id="continue-watching"]'
    this.recentlyAddedMoviesStripe = '[id="recently-added-movies"]'
    this.recentlyAddedSeriesStripe = '[id="recently-added-series"]'
    this.recentlyAddedKidsStripe = '[id="recently-added-kids"]'

    // second stripe card
    this.selectedCard = '[class="card-container is-selected"]'
    this.categoryButtons = '[class="filter-container"]'
    this.rowTitles = '[class="row-title"]'
    this.cardVod = '[class="card-container item-vod"]'

    // popup menu
    this.popUpMenu = '[class="popup-heading"]'

    // player
    this.progressBarPlayer = '[class="progress-bar"]'
    this.playerButtons = '[class="buttons"]'
    this.player = '[class="player translate is-visible"]'
    this.parentalRaiting = '[class="title"]'

    // pin
    this.pinBox = '[class="pin"]'
    this.pinTitle = '[class="sub-title"]'

    // season detail
    this.filterButtons = '[class="filter-container"]'
    this.seasonNumber = '[id="season-detail-title"]'
    this.seasonEpisodeCards = '[class="card-container is-selected"]'
    this.seasonDetail = '[class="details"]'
  }

  async navigateToOnDemand () {
    await this.webdriver.waitForVisible(this.homeButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
    await this.webdriver
      .waitForVisible(this.onDemandTitle, config.waitTime.medium)
      .isExisting(this.onDemandTitle)
  }

  async checkPageEle () {
    let onDemandTxt = await this.webdriver.getText(this.onDemandTitle)
    assert.strictEqual(onDemandTxt, 'On Demand', `the string => ${onDemandTxt} does not match the On Demand title`)
    await this.webdriver
      .isExisting(this.searchIcon)
      .isExisting(this.continueTitle)
  }

  async checkSearch () {
    await this.webdriver.waitForVisible(this.searchIcon, config.waitTime.medium)
  }

  async firstStripeEnter () {
    await this.webdriver.waitForVisible(this.vodTitle)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async firstStripeEnterCheck () {
    await this.webdriver.waitForVisible(this.vodDetailTitle, config.waitTime.medium)
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

  async checkAllSubTitlesAndStripes () {
    let search = '\n'
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2, 700)
    let subTitles = await this.webdriver.getText(this.continueTitle)
    let indexOfSearch = subTitles[0].indexOf(search)
    let continueWatchingS = subTitles[0].slice(0, indexOfSearch)
    assert.strictEqual(continueWatchingS, 'Continue Watching', `the value => ${continueWatchingS} does not match`)
    let allStripes = await this.webdriver.$$(this.stripeContainer)
    for (let i = 0; i < allStripes.length; i++) {
      await this.webdriver.$(allStripes[i].selector).isExisting()
    }
  }

  async navigateAndEnterSpecifiedCatalog (times) {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, times)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, config.randomNumber)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async navigateAndEnterSeriesCatalog (times) {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, times)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.filterButtons, config.waitTime.medium)
  }

  async checkSecondCatalogDetail () {
    let detailTitle = await this.webdriver.$(this.enterDetailTitle).getText()
    let rowTitle = await this.webdriver.$(this.rowTitles).getText()
    let slicedRowTitle = rowTitle.slice(0, 6)
    assert.strictEqual(detailTitle, 'On Demand', `The screen name ${detailTitle} does not match`)
    assert.strictEqual(slicedRowTitle, 'Titles', `THE TITLE ${rowTitle} does not match`)
    await this.webdriver
      .isExisting(this.categoryButtons)
      .isExisting(this.cardVod)
  }

  async checkContinueWatching () {
    await this.webdriver.waitForVisible(this.vodDetailTitle, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async playFromContinueWatchingMenu () {
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.parentalRaiting, config.waitTime.medium)
    let pinProtect = await this.webdriver.isVisible(this.pinTitle)
    if (pinProtect) {
      await super.pressKeyCodeTimes(config.keyCodes.OK, 4)
      await this.webdriver
        .waitForVisible(this.progressBarPlayer, config.waitTime.long)
        .isExisting(this.progressBarPlayer)
        .isExisting(this.playerButtons)
    } else {
      await this.webdriver
        .waitForVisible(this.progressBarPlayer, config.waitTime.long)
        .isExisting(this.progressBarPlayer)
        .isExisting(this.playerButtons)
    }
  }

  async playFromBeginning () {
    await this.webdriver.waitForVisible(this.popUpMenu, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.pause(config.waitTime.short)
    await this.webdriver.waitForVisible(this.progressBarPlayer, config.waitTime.long)
    let pinProtect = await this.webdriver.isExisting(this.pinTitle)
    if (pinProtect) {
      await super.pressKeyCodeTimes(config.keyCodes.OK, 4)
      await this.webdriver
        .waitForVisible(this.progressBarPlayer, config.waitTime.long)
        .isExisting(this.progressBarPlayer)
        .isExisting(this.playerButtons)
    } else {
      await this.webdriver
        .waitForVisible(this.progressBarPlayer, config.waitTime.long)
        .isExisting(this.progressBarPlayer)
        .isExisting(this.playerButtons)
    }
  }

  async enterSeriesDetail () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 4)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.allButtons, config.waitTime.medium)
  }

  async enterSeasonDetail () {
    await this.pressKeyCodeTimes(config.keyCodes.OK)
    await this.pressKeyCodeTimes(config.keyCodes.RIGHT, config.randomNumber)
    await this.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkSeasonDetail () {
    await this.webdriver
      .waitForVisible(this.seasonEpisodeCards, config.waitTime.medium)
      .isExisting(this.seasonNumber)
      .isExisting(this.seasonDetail)
  }

  async enterEpisodeDetail () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, config.randomNumber)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async firstBannerMove () {
    await super.pressKeyCodeTimes(config.keyCodes.LEFT)
    this.notSelectedCards = await this.webdriver.$$(this.firstBannerNotSelected)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
  }

  async checkHighlightedAndDescription () {
    await this.webdriver.waitForVisible(this.firstBannerSelected, config.waitTime.medium)
    for (let i = 0; i < this.notSelectedCards.length; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
        .then(await this.webdriver.waitForVisible(this.firstBannerSelected, config.waitTime.medium))
        .then(async () => {
          let backGroundColor = await this.webdriver.$(this.firstBannerSelected).$(this.firstBannerDescription).getCssProperty('background-color')
          let txtColor = await this.webdriver.$(this.firstBannerSelected).$(this.firstBannerDescription).$(this.firstBannerTxt).getCssProperty('background-color')
          if (backGroundColor.parsed.hex !== this.orangeColorHex || txtColor.parsed.hex !== this.blackColorHex) {
            throw new Error('The colors for first banner do not match')
          }
        })
    }
  }

  async takeAllCards (subMenuSelector) {
    await super.pressKeyCodeTimes(config.keyCodes.LEFT)
    this.subMenuCards = await this.webdriver.$(subMenuSelector).$$(this.regularCard)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
  }

  async goToSeeAllButton () {
    for (let i = 0; i < this.subMenuCards.length + 1; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    }
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkHighlightedAndColorSub () {
    let timesToMove = this.subMenuCards.length - 1 // we always know that the see all button is the last one
    for (let i = 0; i < timesToMove; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
        .then(async () => {
          await this.webdriver.waitForVisible(this.selectedCard, config.waitTime.medium)
        })
        .then(async () => {
          let backGroundColor = await this.webdriver.$(this.selectedCard).$(this.firstBannerDescription).getCssProperty('background-color')
          let txtColor = await this.webdriver.$(this.selectedCard).$(this.firstBannerDescription).$(this.firstBannerTxt).getCssProperty('background-color')
          if (backGroundColor.parsed.hex !== this.orangeColorHex || txtColor.parsed.hex !== this.blackColorHex) {
            throw new Error('The colors for first banner do not match')
          }
        })
    }
  }

  async goToStripe (times) {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, times)
  }

  async checkIfOnCwStripe () {
    let cwCard = await this.webdriver.$(this.continueWatchingStripe).$(this.selectedCard)
    await this.webdriver.waitForVisible(cwCard.selector, config.waitTime.medium)
  }

  async checkIfOnRamStripe () {
    let ramCard = await this.webdriver.$(this.recentlyAddedMoviesStripe).$(this.selectedCard)
    await this.webdriver.waitForVisible(ramCard.selector, config.waitTime.medium)
  }

  async checkIfOnRasStripe () {
    let rasCard = await this.webdriver.$(this.recentlyAddedSeriesStripe).$(this.selectedCard)
    await this.webdriver.waitForVisible(rasCard.selector, config.waitTime.medium)
  }

  async checkIfOnRakStripe () {
    let rakCard = await this.webdriver.$(this.recentlyAddedKidsStripe).$(this.selectedCard)
    await this.webdriver.waitForVisible(rakCard.selector, config.waitTime.medium)
  }
}

module.exports = OnDemandPage
