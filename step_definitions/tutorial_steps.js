const { defineSupportCode } = require('cucumber')
const config = require('../config/config')

defineSupportCode(function ({ Then, When }) {
  When(/^I open the application for the first time$/, async function () {
    await this.client.mainPage.checkForClientStart()
  })
  Then(/^I should be presented with the start of the tutorial$/, async function () {
    await this.client.mainPage.checkForTutorial()
  })
  Then(/^I should see live TV$/, async function () {
    await this.client.playerPage.checkPlayerElements()
  })
  Then(/^I should see all the events$/, async function () {
    await this.client.playerPage.checkZapAndEvent()
  })
  When(/^I press OK on the events$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })
  Then(/^I should see all the options for the selected event$/, async function () {
    await this.client.playerPage.checkEventStripeButtons()
  })
  When(/^I press OK on the first option of the event$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })
  Then(/^I should that the event played from the beginning$/, async function () {
    await this.client.playerPage.checkPlayerElements()
  })
  Then(/^I should be presented with a message to continue$/, async function () {
    await this.client.mainPage.checkForTutorial()
  })
  When(/^I press LEFT or BACK to return to live TV$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.LEFT)
  })
  Then(/^I should see that I have returned to live TV$/, async function () {
    await this.client.playerPage.checkPlayerElements()
  })
  When(/^I press UP to access the progress bar$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.UP)
  })
  Then(/^I should see that the focus is on the progress bar$/, async function () {

  })
  Then(/^I should be on the channel list$/, async function () {
    await this.client.playerPage.checkChannelsStripe()
  })
  Then(/^I should see the Guide menu$/, async function () {
    await this.client.channelsPage.guideCheck()
  })
  Then(/^I should see the Main menu$/, async function () {
    await this.client.mainPage.checkForSideMenu()
    await this.client.mainPage.checkForClock()
  })
  When(/^I press the RIGHT or OK on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.RIGHT)
  })
  Then(/^I should see the ON Demand menu$/, async function () {
    await this.client.onDemandPage.checkPageEle()
  })
  When(/^I press the EON button on the RCU$/, async function () {
    await config.sendCustomKey(config.specialKeyCodes.EON)
  })
  Then(/^I should see that the tutorial has ended$/, async function () {
    await this.client.mainPage.checkForTutorialEnd()
  })
  When(/^I select the tutorial from the options in the Settings menu$/, async function () {
    await this.client.mainPage.checkForClientStart()
    await this.client.settingsPage.navigateToSettings()
    await this.client.settingsPage.navigateToSettingsOption('Help')
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })
  Then(/^I should see a detail screen of the current event$/, async function () {
    await this.client.channelsPage.checkChannelsDetail()
  })
})
