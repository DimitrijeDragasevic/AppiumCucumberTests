const { defineSupportCode } = require('cucumber')
const config = require('../config/config')

defineSupportCode(function ({ And, But, Given, Then, When }) {
  Given(/^I navigate to the player$/, async function () {
    await this.client.playerPage.navigateToPlayer()
  })
  When(/^I press the UP key code on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.UP)
  })
  Then(/^I should see all the player elements$/, async function () {
    await this.client.playerPage.checkPlayerElements()
  })
  When(/^I press the DOWN key code on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN)
  })
  Then(/^I should see the Zap banner with event list and other player elements$/, async function () {
    await this.client.playerPage.checkZapAndEvent()
  })
  When(/^I press DOWN key code on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN)
  })
  When(/^I choose a card from the provided stripe$/, async function () {
    await this.client.playerPage.selectOneEventCard()
  })
  Then(/^I should see the buttons play, rewind and details on the selected card$/, async function () {
    await this.client.playerPage.checkEventStripeButtons()
  })
  When(/^I press the DOWN key code twice on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
  })
  When(/^I press the LEFT keyCode on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.LEFT)
  })
  Then(/^I should see the channels stripe and other player elements$/, async function () {
    await this.client.playerPage.checkChannelsStripe()
  })
  When(/^I press the DOWN key code two times on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
  })
  When(/^I press the RIGHT KeyCode on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.RIGHT)
  })
  Then(/^I should see the Detail screen$/, async function () {
    await this.client.playerPage.checkDetailScreen()
  })
  When(/^I press the OK key code on the WATCH button$/, async function () {
    await this.client.playerPage.detailActions({ selectedButton: 1 })
  })
  Then(/^I should see that the content is playing and the player elements are present$/, async function () {
    await this.client.playerPage.checkPlayerElements()
  })
  When(/^I press the OK key code on the START OVER button$/, async function () {
    await this.client.playerPage.detailActions({ selectedButton: 2 })
  })
  Then(/^I should see that content is playing and the player elements are present$/, async function () {
    await this.client.playerPage.checkPlayerElements()
  })
  When(/^I press the OK key code on the FAVORITES button$/, async function () {
    await this.client.playerPage.detailActions({ selectedButton: 3 })
  })
  Then(/^I should see that the option is enabled$/, async function () {
    await this.client.playerPage.checkFavoritesEnabled()
  })
  When(/^I press the OK key code on the See full button$/, async function () {
    await this.client.playerPage.detailActions({ selectedButton: 1, seeFull: true })
  })
  Then(/^I should see a detailed description of the playing event$/, async function () {
    await this.client.playerPage.detailedDescription()
  })
})
