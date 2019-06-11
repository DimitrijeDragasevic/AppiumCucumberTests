
const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I have navigated to Parental Rating in Settings$/, async function () {
    await this.client.settingsPage.navigateToSettings()
    await this.client.settingsPage.navigateToSettingsOption('Parental Rating')
  })

  When(/^I enter my PIN$/, async function () {
    await this.client.settingsPage.enterCorrectPin()
  })

  Then(/^I should see Parental Rating page$/, async function () {
    await this.client.settingsPage.parentalRatingPageIsExisting()
  })

  When(/^I enter my PIN wrong$/, async function () {
    await this.client.settingsPage.enterWrongPin()
  })

  Then(/^I should see Parental Control message$/, async function () {
    await this.client.settingsPage.parentalControlMessageExists()
  })

  When(/^I change Allowed Age Rating to 12$/, async function () {
    await this.client.settingsPage.changeAgeRating('12')
  })

  Then(/^PIN should be required on "The Amityville Horror"$/, async function () {
    await this.client.settingsPage.sortByDateAdded()
    await this.client.settingsPage.checkMoviePin('The Amityville Horror')
  })
  //
  Then(/^PIN should be required on "Legion"$/, async function () {
    await this.client.settingsPage.checkMoviePin('Legion')
  })

  Then(/^PIN should be required on "Prevenge"$/, async function () {
    await this.client.settingsPage.checkMoviePin('Prevenge')
  })

  When(/^I change Allowed Age Rating to 16$/, async function () {
    await this.client.settingsPage.changeAgeRating('16')
  })

  Then(/^PIN shouldn\'t be required on "The Amityville Horror"$/, async function () {
    await this.client.settingsPage.checkMovieNoPin('The Amityville Horror')
  })

  When(/^I change Allowed Age Rating to 18$/, async function () {
    await this.client.settingsPage.changeAgeRating('18')
  })

  Then(/^PIN shouldn\'t be required on "Legion"$/, async function () {
    await this.client.settingsPage.checkMovieNoPin('Legion')
  })

  When(/^I change Allowed Age Rating to Allow All$/, async function () {
    await this.client.settingsPage.changeAgeRating('Allow All')
  })

  Then(/^PIN shouldn\'t be required on "Prevenge"$/, async function () {
    await this.client.settingsPage.checkMovieNoPin('Prevenge')
  })
})
