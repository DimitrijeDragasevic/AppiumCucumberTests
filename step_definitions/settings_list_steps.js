const { defineSupportCode } = require('cucumber')
const config = require('../config/config')

defineSupportCode(function ({ And, But, Given, Then, When }) {
  Given(/^I have navigated to my list option in the settings menu$/, async function () {
    await this.client.settingsPage.navigateToSettings()
    await this.client.settingsPage.verifySettingsIsVisible()
    await this.client.settingsPage.navigateToSettingsOption('My Lists')
  })

  When(/^I am on the on my list menu$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('My Lists')
  })

  Then(/^I should see the following two options TV lists and Radio Channels Lists$/, async function () {
    await this.client.settingsPage.checkForMyListOptions()
  })

  When(/^I open the the Tv list menu$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  Then(/^I should see multiple options available$/, async function () {
    await this.client.settingsPage.moveAndVerifyAllOptions()
  })

  When(/^I open the TV lists list order option$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
    await this.client.settingsPage.moveAndVerifyAllOptions()
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  Then(/^I should see all the channel category's$/, async function () {
    await this.client.settingsPage.goThroughAllCells()
    await this.client.settingsPage.menuReturn()
  })

  When(/^I open the Radio channels lists option$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  When(/^I open the radio channels lists option$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
    await this.client.settingsPage.moveAndVerifyAllOptions()
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  Then(/^I should see all the radio category's$/, async function () {
    await this.client.settingsPage.goThroughAllCells()
  })
})
