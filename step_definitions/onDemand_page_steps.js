const defineSupportCode = require('cucumber').defineSupportCode
const config = require('../config/config')

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I navigate to the On Demand screen$/, async function () {
    await this.client.onDemandPage.navigateToOnDemand()
  })

  When(/^I am on the On Demand page$/, async function () {
    await this.client.onDemandPage.checkPageEle()
  })

  Then(/^I should see all the sub titles and stripes provided$/, async function () {
    await this.client.onDemandPage.checkAllSubTitlesAndStripes()
  })

  When(/^I am on the first stripe and press OK on the RCU$/, async function () {
    await this.client.onDemandPage.firstStripeEnter()
  })

  Then(/^I should see all the details regarding that clicked banner$/, async function () {
    await this.client.onDemandPage.firstStripeEnterCheck()
  })

  When(/^I am on the catalog section of the page and press OK on the RCU on any catalog$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSpecifiedCatalog(1)
  })

  Then(/^I should see the details of the entered catalog$/, async function () {
    await this.client.onDemandPage.checkSecondCatalogDetail()
  })

  When(/^I am on the category stripe on the page and press OK on the RCU on any category$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSpecifiedCatalog(2)
  })

  Then(/^I should see all the details regarding the entered category$/, async function () {
    await this.client.onDemandPage.checkSecondCatalogDetail()
  })
  // fist scenario

  When(/^I am on the category stripe and I press ok on the Series category$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSeriesCatalog(2)
  })

  Then(/^I press OK on the RCU on any series$/, async function () {
    await this.client.onDemandPage.enterSeriesDetail()
  })

  Then(/^I should see the series detail screen$/, async function () {
    await this.client.onDemandPage.checkDetailScreen()
  })

  // second scenario
  Given(/^I am on the series detail screen$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSeriesCatalog(2)
    await this.client.onDemandPage.enterSeriesDetail()
    await this.client.onDemandPage.checkDetailScreen()
  })

  When(/^I press ok on the season button$/, async function () {
    await this.client.onDemandPage.enterSeasonDetail()
  })

  Then(/^I should see the season detail screen$/, async function () {
    await this.client.onDemandPage.checkSeasonDetail()
  })

  // Third scenario
  Given(/^I am on the season detail screen$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSeriesCatalog(2)
    await this.client.onDemandPage.enterSeriesDetail()
    await this.client.onDemandPage.checkDetailScreen()
    await this.client.onDemandPage.enterSeasonDetail()
    await this.client.onDemandPage.checkSeasonDetail()
  })

  When(/^I press OK on any selected Episode$/, async function () {
    await this.client.onDemandPage.enterEpisodeDetail()
  })

  Then(/^I should be on the episode detail screen$/, async function () {
    await this.client.onDemandPage.checkDetailScreen()
  })

  When(/^I am on the continue watching stripe on the page and press OK twice on the RCU on any asset$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSpecifiedCatalog(3)
  })

  Then(/^I should see the continue watching menu$/, async function () {
    await this.client.onDemandPage.checkContinueWatching()
  })

  When(/^I am on prompt menu on the continue watching asset and press OK on the RCU on the first option$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSpecifiedCatalog(3)
    await this.client.onDemandPage.checkContinueWatching()
  })

  Then(/^I should see that that asset is being played$/, async function () {
    await this.client.onDemandPage.playFromContinueWatchingMenu()
  })

  When(/^I am on prompt menu on the continue watching asset and press OK on the RCU and on the second option$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSpecifiedCatalog(3)
    await this.client.onDemandPage.checkContinueWatching()
  })

  Then(/^I should see that the asset is being played from the beginning$/, async function () {
    await this.client.onDemandPage.playFromBeginning()
  })

  When(/^I am on the recently added stripe and I press OK on the RCU$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSpecifiedCatalog(4)
  })

  Then(/^I should see all the details regarding that asset$/, async function () {
    await this.client.onDemandPage.checkDetailScreen()
  })

  When(/^I am on the recently added series stripe and I press OK on the RCU$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSpecifiedCatalog(5)
  })

  When(/^I am on the recently added kids stripe and I press OK on the RCU$/, async function () {
    await this.client.onDemandPage.navigateAndEnterSpecifiedCatalog(6)
  })

  When(/^I am on the recently added movies stripe and I press the right key code a couple of times$/, async function () {
    let recentlyAddedMoviesStripe = '[id="recently-added-movies"]'
    await this.client.onDemandPage.goToStripe(4)
    await this.client.onDemandPage.checkIfOnRamStripe()
    await this.client.onDemandPage.takeAllCards(recentlyAddedMoviesStripe)
  })

  Then(/^I should see that the card are highlighted and changed color$/, async function () {
    await this.client.onDemandPage.checkHighlightedAndColorSub()
  })

  When(/^I go through the recently added movies stripe and I reach the end and press OK$/, async function () {
    let recentlyAddedMoviesStripe = '[id="recently-added-movies"]'
    await this.client.onDemandPage.goToStripe(4)
    await this.client.onDemandPage.checkIfOnRamStripe()
    await this.client.onDemandPage.takeAllCards(recentlyAddedMoviesStripe)
    await this.client.onDemandPage.goToSeeAllButton()
  })

  Then(/^I should see that I have entered the see all button screen\(video on demand\)$/, async function () {
    await this.client.onDemandPage.checkSecondCatalogDetail()
  })

  When(/^I am on the recently added series stripe and I press the right key code a couple of times$/, async function () {
    let recentlyAddedSeriesStripe = '[id="recently-added-series"]'
    await this.client.onDemandPage.goToStripe(5)
    await this.client.onDemandPage.checkIfOnRasStripe()
    await this.client.onDemandPage.takeAllCards(recentlyAddedSeriesStripe)
  })

  When(/^I go through the recently added series stripe and I reach the end and press OK$/, async function () {
    let recentlyAddedSeriesStripe = '[id="recently-added-series"]'
    await this.client.onDemandPage.goToStripe(5)
    await this.client.onDemandPage.checkIfOnRasStripe()
    await this.client.onDemandPage.takeAllCards(recentlyAddedSeriesStripe)
    await this.client.onDemandPage.goToSeeAllButton()
  })

  When(/^I am on the recently added kids stripe and I press the right key code a couple of times$/, async function () {
    let recentlyAddedKidsStripe = '[id="recently-added-kids"]'
    await this.client.onDemandPage.goToStripe(6)
    await this.client.onDemandPage.checkIfOnRakStripe()
    await this.client.onDemandPage.takeAllCards(recentlyAddedKidsStripe)
  })

  When(/^I go through the recently added kids stripe and I reach the end and press OK$/, async function () {
    let recentlyAddedKidsStripe = '[id="recently-added-kids"]'
    await this.client.onDemandPage.goToStripe(6)
    await this.client.onDemandPage.checkIfOnRakStripe()
    await this.client.onDemandPage.takeAllCards(recentlyAddedKidsStripe)
    await this.client.onDemandPage.goToSeeAllButton()
  })

  When(/^I am on the first banner and I press the right key code$/, async function () {
    await this.client.onDemandPage.firstBannerMove()
  })

  Then(/^I should see that the banner is highlighted and has a description$/, async function () {
    await this.client.onDemandPage.checkHighlightedAndDescription()
  })

  When(/^I click on the favorite button$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await this.client.channelsPage.setFavoriteVod()
  })

  Then(/^I should see that the favorite button is highlighted$/, async function () {
    await this.client.channelsPage.checkButtonActive()
  })

  When(/^I click on the search button$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.UP)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  Then(/^I should be on the search page$/, async function () {
    await this.client.channelsPage.checkSearchPage()
  })
})
