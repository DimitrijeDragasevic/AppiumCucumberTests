const defineSupportCode = require('cucumber').defineSupportCode
const config = require('../config/config')

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I navigate to the now on tv sub menu$/, async function () {
    await this.client.channelsPage.navigateToFilterByIndex(1)
  })

  When(/^I open the now filter$/, async function () {
    await this.client.channelsPage.clickOnFilter()
  })

  Then(/^I should see all the option that are linked to that filter$/, async function () {
    await this.client.channelsPage.enterFirstFilterCheck()
  })

  When(/^I press ok on the now filter$/, async function () {
    await this.client.channelsPage.clickNowFilterTw()
  })

  Then(/^I should see all the card with live content$/, async function () {
    await this.client.channelsPage.filterCheck('Now')
  })

  When(/^I press ok on the previous filter$/, async function () {
    await this.client.channelsPage.clickOnPreviousFilter()
  })

  Then(/^I should see all the channels and some catch up content$/, async function () {
    await this.client.channelsPage.filterCheck('Previous')
  })

  When(/^I press ok on the next filter$/, async function () {
    await this.client.channelsPage.clickOnNextFilter()
  })

  Then(/^I should see all the channels and all the upcoming shows$/, async function () {
    await this.client.channelsPage.filterCheck('Next')
    await this.client.channelsPage.returnToNow()
    await this.client.channelsPage.safeReturn()
  })

  When(/^I am on the now on tv page$/, async function () {
    await this.client.channelsPage.checkNowOnTVPage()
  })

  Then(/^I scroll through the cards and then I should see that they are highlighted also that the text is white and background is blue$/, async function () {
    await this.client.channelsPage.moveThroughCards()
  })

  Then(/^I press ok on any card , then is should see that I am directed to the playing of that event$/, async function () {
    await this.client.channelsPage.clickOnAnyCard()
  })

  When(/^I click on the search icon$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.UP)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  Then(/^I should be navigated to the search page$/, async function () {
    await this.client.channelsPage.checkSearchPage()
  })

  When(/^I navigate to the first card$/, async function () {
    await this.client.channelsPage.checkNowOnTVPage()
  })

  Then(/^I should see that the card has a image$/, async function () {
    await this.client.channelsPage.checkPictureOnCard()
    await this.client.channelsPage.safeReturn()
  })
})
