const defineSupportCode = require('cucumber').defineSupportCode
const config = require('../config/config')

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I have navigated to Language option in Settings$/, async function () {
    await this.client.settingsPage.navigateToSettings()
    await this.client.settingsPage.navigateToSettingsOption('Language')
  })

  When(/^I have navigated to "Interface Language"$/, async function () {
    await this.client.settingsPage.clickOnLanguageOpt(0)
  })

  When(/^I change language to "Srpski"$/, async function () {
    await this.client.settingsPage.changeLanguage('English', 'Srpski')
  })

  Then(/^I should see "Srpski" below "Jezik interfejsa"$/, async function () {
    await this.client.settingsPage.checkForLangOptChange('Srpski')
    await this.client.settingsPage.changeLanguageReverse('Srpski', 'English')
    await this.client.page.pressKeyCodeTimes(config.keyCodes.BACK, 1, 700) // this is a potential bug, where the language screen persists
  })

  When(/^I have navigated to "Keyboard Language"$/, async function () {
    await this.client.settingsPage.clickOnLanguageOpt(1)
  })

  When(/^I change keyboard language to "Srpski"$/, async function () {
    await this.client.settingsPage.changeLanguage('English', 'Srpski')
  })

  Then(/^I should see "Srpski" below "Keyboard Language"$/, async function () {
    await this.client.settingsPage.checkForLangOptChange('Srpski')
    await this.client.settingsPage.changeLanguageReverse('Srpski', 'English')
  })

  Given(/^I have navigated to "Voice Search Language"$/, async function () {
    await this.client.settingsPage.clickOnLanguageOpt(2)
  })

  When(/^I change voice search language to "Srpski"$/, async function () {
    await this.client.settingsPage.changeLanguage('English', 'Srpski')
  })

  Then(/^I should see "Srpski" below "Voice Search Language"$/, async function () {
    await this.client.settingsPage.checkForLangOptChange('Srpski')
    await this.client.settingsPage.changeLanguageReverse('Srpski', 'English')
  })

  Given(/^I have navigated to "First Audio Language"$/, async function () {
    await this.client.settingsPage.clickOnLanguageOpt(3)
  })

  When(/^I change first audio language to "Srpski"$/, async function () {
    await this.client.settingsPage.changeLanguage('English', 'Srpski')
  })

  Then(/^I should see "Srpski" below "First Audio Language"$/, async function () {
    await this.client.settingsPage.checkForLangOptChange('Srpski')
    await this.client.settingsPage.changeLanguageReverse('Srpski', 'English')
  })

  Given(/^I have navigated to "Second Audio Language"$/, async function () {
    await this.client.settingsPage.clickOnLanguageOpt(4)
  })

  When(/^I change second audio language to "Srpski"$/, async function () {
    await this.client.settingsPage.changeLanguage('English', 'Srpski')
  })

  Then(/^I should see "Srpski" below "Second Audio Language"$/, async function () {
    await this.client.settingsPage.checkForLangOptChange('Srpski')
    await this.client.settingsPage.changeLanguageReverse('Srpski', 'English')
  })

  Given(/^I have navigated to "First Subtitle Language"$/, async function () {
    await this.client.settingsPage.clickOnLanguageOpt(5)
  })

  When(/^I change first subtitle language to "Srpski"$/, async function () {
    await this.client.settingsPage.changeLanguage('English', 'Srpski')
  })

  Then(/^I should see "Srpski" below "First Subtitle Language"$/, async function () {
    await this.client.settingsPage.checkForLangOptChange('Srpski')
    await this.client.settingsPage.changeLanguageReverse('Srpski', 'English')
  })

  Given(/^I have navigated to "Second Subtitle Language"$/, async function () {
    await this.client.settingsPage.clickOnLanguageOpt(6)
  })

  When(/^I change second subtitle language to "Srpski"$/, async function () {
    await this.client.settingsPage.changeLanguage('English', 'Srpski')
  })

  Then(/^I should see "Srpski" below "Second Subtitle Language"$/, async function () {
    await this.client.settingsPage.checkForLangOptChange('Srpski')
    await this.client.settingsPage.changeLanguageReverse('Srpski', 'English')
  })
})
