const defineSupportCode = require('cucumber').defineSupportCode
const config = require('../config/config')

defineSupportCode(function ({ Given, When, Then }) {
  When(/^I navigate to the search button$/, async function () {
    await this.client.homePage.navigateToSearchBar()
  })

  Then(/^I should be able to search for a specific item$/, async function () {
    await this.client.homePage.searchForSpecItem()
  })

  When(/^I press the right key code on the remote$/, async function () {
    await this.client.homePage.navigateToCarruselMenu()
  })

  Then(/^I should be on the carousel menu$/, async function () {
    await this.client.homePage.checkForCarusleMenu()
  })

  When(/^I click on one of the cards$/, async function () {
    await this.client.homePage.clickOnOneOfTheCaruselCads()
  })

  Then(/^I should be able to see all the details about it$/, async function () {
    await this.client.homePage.checkBannerType()
  })

  Then(/^I press right a couple of times, then should see that I have moved through all the cards on the stripe$/, async function () {
    await this.client.homePage.focusAllBanners()
  })

  Then(/^I press right a couple of times, then should see that I have moved through all the cards on the now on tv stripe$/, async function () {
    let nowOnTvId = '[id="now-on-tv"]'
    await this.client.homePage.getStripeNumber(nowOnTvId)
    await this.client.homePage.goThroughStripe()
  })

  Then(/^I press the right key code a couple of times then I should have go though all the On demand cards$/, async function () {
    let nowOnDemand = '[id="on-demand"]'
    await this.client.homePage.getStripeNumber(nowOnDemand)
    await this.client.homePage.goThroughStripe()
  })

  Then(/^I press ok on the see all button, then I should bee on the on demand catalogs screen$/, async function () {
    await this.client.homePage.goToSeeAllButtonVod()
  })

  Then(/^I press RIGHT a couple of times, then I should see the see all radio channels button which I enter and checkout the details$/, async function () {
    let radioCard = '[id="radio-stations"]'
    await this.client.homePage.getStripeNumber(radioCard)
    await this.client.homePage.goThroughStripe()
    await this.client.homePage.goToSeeAllButtonRadio()
  })

  When(/^I press down key code on the remote$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN)
  })

  Then(/^I should be on the now on tv menu$/, async function () {
    await this.client.homePage.navigateToNowOnTV()
  })

  Then(/^I should see the now on tv cards with an image and text$/, async function () {
    await this.client.homePage.checkNowOnTVEle()
  })

  Then(/^I click on the selected card and check if the card clicked is valid$/, async function () {
    await this.client.homePage.clickOnOnTvMenuCard()
  })

  Then(/^I press ok on the see all button and I should bee on the channels Now on tv menu$/, async function () {
    await this.client.homePage.goToSeeAllButtonNoT()
  })

  When(/^I press the down keycode twice$/, async function () {
    await this.client.homePage.navigateToOnDemand()
  })

  Then(/^I should be on the on demand menu and check the card details$/, async function () {
    await this.client.homePage.checkIfOnDemandMenuAndDetails()
  })

  When(/^I click on one of the on demand cards$/, async function () {
    await this.client.homePage.clickRandomVodCard()
  })

  Then(/^I should be able to see all the details regarding that card$/, async function () {
    await this.client.homePage.checkOnDemandClickedCard()
  })

  When(/^I press the down keycode three times$/, async function () {
    await this.client.homePage.navigateToRadioMenu()
  })

  Then(/^I should be on the radio channels menu$/, async function () {
    await this.client.homePage.checkIfOnRadioCardMenuExists()
  })

  Then(/^I click on one of the radio channel cards$/, async function () {
    await this.client.homePage.clickOnRadioCard()
  })

  Then(/^I should see all the information displayed for that radio channel$/, async function () {
    await this.client.homePage.checkIfRadioCardIsOpened()
  })

  Then(/^I should see all the elements regarding the home page$/, async function () {
    await this.client.homePage.checkForHomeEle()
  })
})
