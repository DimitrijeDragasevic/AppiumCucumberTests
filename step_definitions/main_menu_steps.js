const defineSupportCode = require('cucumber').defineSupportCode
const config = require('../config/config')

defineSupportCode(function ({ Given, When, Then }) {
  When(/^I open the application$/, async function () {
    await this.client.mainPage.checkForClientStart()
    await this.client.mainPage.clickOnSideMenuButtons()
  })

  Then(/^I should see the side menu and the main content$/, async function () {
    await this.client.mainPage.checkForSideMenu()
  })

  When(/^I click on the side menu home button$/, async function () {
    await this.client.mainPage.clickOnSideButtonHome()
  })

  Then(/^I should see all the content related to the home button$/, async function () {
    await this.client.mainPage.checkHomeButtonScreen()
  })

  When(/^I press the right key code on the side menu home button$/, async function () {
    await this.client.mainPage.enterScreenRightKey()
  })

  When(/^I press the right key code on the side menu channels button$/, async function () {
    await this.client.mainPage.goToMenuByCommand(1)
  })

  When(/^I click on the side menu channels button$/, async function () {
    await this.client.mainPage.clickOnSideButtonChannels()
  })

  Then(/^I should see all the content related to the Channels button$/, async function () {
    await this.client.mainPage.checkContentOnChannelsPage()
  })

  When(/^I click on the side menu button On Demand$/, async function () {
    await this.client.mainPage.clickOnSideMenuButtonOnDemand()
  })

  When(/^I press the right key code on the side menu button On Demand$/, async function () {
    await this.client.mainPage.goToMenuByCommand(2)
  })

  Then(/^I should see all the related content to the On Demand button$/, async function () {
    await this.client.mainPage.checkForContentOnDemandPage()
  })

  When(/^I click on the side menu button My Library$/, async function () {
    await this.client.mainPage.clickOnMyLibrarySideButton()
  })

  When(/^I press the right key code on the side menu button My Library$/, async function () {
    await this.client.mainPage.goToMenuByCommand(3)
  })

  Then(/^I should see all the related content to the My Library$/, async function () {
    await this.client.mainPage.checkMyLibraryPage()
  })

  When(/^I click on the side menu button Settings$/, async function () {
    await this.client.mainPage.clickOnSideButtonSettings()
  })

  When(/^I press the right key code on the side menu button Settings$/, async function () {
    await this.client.mainPage.goToMenuByCommand(4)
  })

  Then(/^I should see all the content related to the Settings button$/, async function () {
    await this.client.mainPage.checkContentOSettingsPage()
  })

  When(/^I click on the side menu Watch button$/, async function () {
    await this.client.mainPage.clickOnWatchButton()
  })

  Then(/^I should see all the content related to the Watch button$/, async function () {
    await this.client.mainPage.checkForPlayer()
  })

  When(/^I am on the main menu$/, async function () {
    await this.client.mainPage.checkForSideMenu()
  })

  Then(/^I press the left key code on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.LEFT)
  })

  Then(/^I should be directed to the player$/, async function () {
    await this.client.mainPage.checkForPlayer()
  })

  Then(/^I should see a clock which tells the current time$/, async function () {
    await this.client.mainPage.checkForClock()
  })

  When(/^I press the back key code on the main menu$/, async function () {
    await this.client.mainPage.checkForClientStart()
    await this.client.page.pressKeyCodeTimes(config.keyCodes.BACK)
  })

  Then(/^I should see the player and live content$/, async function () {
    await this.client.mainPage.checkForPlayer()
  })
})
