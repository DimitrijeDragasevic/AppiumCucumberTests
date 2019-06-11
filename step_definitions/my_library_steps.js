const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I navigate on my library screen$/, async function () {
    await this.client.myLibraryPageCommon.navigateToMyLibrary()
  })

  When(/^I open my library$/, async function () {
    await this.client.myLibraryPageCommon.openMyLibrarySubmenu()
  })

  Then(/^I should see submenu related to my library$/, async function () {
    await this.client.myLibraryPageCommon.isMyLibrarySubmenuOpened()
  })

  /** ********* Reminders ***********/

  When(/^I open Reminders$/, async function () {
    await this.client.myLibraryPageCommon.openMyLibrarySubmenu()
    await this.client.myLibraryPageReminders.openReminders()
  })

  Then(/^I should see Reminders screen$/, async function () {
    await this.client.myLibraryPageReminders.checkContentOfReminders()
  })

  When(/^I add Reminder on a specific TV event$/, async function () {
    await this.client.myLibraryPageCommon.navigateToTvChannels()
    await this.client.myLibraryPageReminders.navigateToFutureEvent()
    await this.client.myLibraryPageReminders.addReminderToEvent()
  })

  Then(/^I should see specific TV event on Reminder screen$/, async function () {
    await this.client.myLibraryPageCommon.openMyLibrarySubmenu()
    await this.client.myLibraryPageReminders.openReminders()
    await this.client.myLibraryPageReminders.checkContentOfReminders(true)
  })

  When(/^I open Event Detail on Reminders screen$/, async function () {
    await this.client.myLibraryPageCommon.openMyLibrarySubmenu()
    await this.client.myLibraryPageReminders.openReminders()
    await this.client.myLibraryPageReminders.checkContentOfReminders()
    await this.client.myLibraryPageReminders.openEventDetail()
  })

  Then(/^I should see all related content to Event Detail screen$/, async function () {
    await this.client.myLibraryPageReminders.checkContentOfDetailScreen()
  })

  /** ********* Favorites ***********/

  When(/^I open Favorites$/, async function () {
    await this.client.myLibraryPageCommon.openMyLibrarySubmenu()
    await this.client.myLibraryPageCommon.isMyLibrarySubmenuOpened()
    await this.client.myLibraryPageFavorites.openFavorites()
  })

  Then(/^I should see Favorites screen$/, async function () {
    await this.client.myLibraryPageFavorites.checkContentOfFavorites()
  })

  When(/^I add VOD asset to Favorites on VOD Detail screen$/, async function () {
    await this.client.myLibraryPageFavorites.addVodAssetToFavorites()
  })

  Then(/^I should see specific VOD asset on Favorites screen$/, async function () {
    await this.client.myLibraryPageFavorites.navigateMyLibraryNavigation()
    await this.client.myLibraryPageCommon.openMyLibrarySubmenu()
    await this.client.myLibraryPageCommon.isMyLibrarySubmenuOpened()
    await this.client.myLibraryPageFavorites.openFavorites()
    await this.client.myLibraryPageFavorites.checkContentOfFavorites()
  })

  When(/^I add TV Event to Favorites on TV Channels screen$/, async function () {
    await this.client.myLibraryPageCommon.navigateToTvChannels()
    await this.client.myLibraryPageFavorites.addTvEventToFavorites()
  })
  Then(/^I should see specific TV Event on Favorites screen$/, async function () {
    await this.client.myLibraryPageFavorites.navigateMyLibraryNavigation()
    await this.client.myLibraryPageCommon.openMyLibrarySubmenu()
    await this.client.myLibraryPageCommon.isMyLibrarySubmenuOpened()
    await this.client.myLibraryPageFavorites.openFavorites()
    await this.client.myLibraryPageFavorites.checkContentOfFavorites()
  })
})
