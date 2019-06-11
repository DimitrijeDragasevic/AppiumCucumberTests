const defineSupportCode = require('cucumber').defineSupportCode
const config = require('../config/config')

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I have navigated to Settings$/, async function () {
    await this.client.settingsPage.navigateToSettings()
  })

  When(/^I navigate to Summary option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Summary')
  })

  Then(/^I should see Summary option page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Summary')
  })

  When(/^I enter Personalization option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Personalization')
  })

  Then(/^I should see Personalization page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Personalization')
  })

  When(/^I enter My Lists option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('My Lists')
  })

  Then(/^I should see My Lists page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('My Lists')
  })

  When(/^I enter Remote option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Remote')
  })

  Then(/^I should see Remote page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Remote')
  })

  When(/^I enter Language option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Language')
  })

  Then(/^I should see Language page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Language')
  })

  When(/^I enter Parental Rating option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Parental Rating')
  })

  Then(/^I Enter PIN screen should appear$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Parental Rating')
  })

  When(/^I enter Video & Audio option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Video & Audio')
  })

  Then(/^I should see Video & Audio page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Video & Audio')
  })

  When(/^I enter Network option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Network')
  })

  Then(/^I should see Network page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Network')
  })

  Given(/^I have entered Network page$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Network')
  })
  When(/^I enter Network Status option$/, async function () {
    await this.client.settingsPage.navigateToNetworkOption('Network Status')
  })

  Then(/^I should see Network Status page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Network Status')
  })

  When(/^I enter Test Speed option$/, async function () {
    await this.client.settingsPage.navigateToNetworkOption('Speed Test')
  })

  Then(/^I should see Speed Test Results$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Testing speed…')
  })

  When(/^I enter System option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('System')
  })

  Then(/^I should see System page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('System')
  })

  When(/^I enter PIN Code option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('PIN Code')
  })

  Then(/^I should PIN Code page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('PIN Code')
  })

  When(/^I enter Conax option$/, async function () {
    await this.client.settingsPage.navigateToConaxPage()
  })

  Then(/^I enter Subscription option$/, async function () {
    await this.client.settingsPage.navigateToConaxOption('Subscription')
    await this.client.settingsPage.validateSettingsPageOption('Subscription')
  })

  Given(/^I have entered System option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('System')
  })

  When(/^I enter ECM\/EMM option$/, async function () {
    await this.client.settingsPage.navigateToConaxOption('ECM/EMM')
  })

  Then(/^I should see ECM\/EMM page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('ECM/EMM')
  })

  Given(/^I have entered Conax option$/, async function () {
    await this.client.settingsPage.navigateToConaxPage()
  })

  When(/^I enter Contact option$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Contact')
  })

  Then(/^I should see Contact page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Contact')
  })

  When(/^I enter the system information option$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  Then(/^I should see Application version, Os version, platform, Device Model and Build version$/, async function () {
    await this.client.settingsPage.checkSysInformation()
  })

  When(/^I enter the Help page$/, async function () {
    await this.client.settingsPage.navigateToSettingsOption('Help')
  })

  Then(/^I should see the Help page$/, async function () {
    await this.client.settingsPage.validateSettingsPageOption('Help')
  })

  When(/^I enter EON Video Instructions on Help$/, async function () {
    await this.client.settingsPage.navigateToHelpOption()
  })

  Then(/^I should see EON Video Instructions Vod Detail page$/, async function () {
    await this.client.settingsPage.checkDetailScreen()
  })
})
