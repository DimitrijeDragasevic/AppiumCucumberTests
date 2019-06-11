const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I navigate to the sort filter$/, async function () {
    await this.client.channelsPage.navigateToFilterByIndex(3)
  })

  When(/^I press ok on the sort menu$/, async function () {
    await this.client.channelsPage.clickOnFilter()
  })

  Then(/^I should see all the options related$/, async function () {
    await this.client.channelsPage.checkSortFilter()
  })

  //A-Z
  When(/^I press ok on the A-Z filter$/, async function () {
    await this.client.channelsPage.clickOnFilterSortOption('A-Z')
  })

  Then(/^I should see all the content sorted from A-Z$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(2)
  })

  //Position
  When(/^I press ok on the position filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Position', 1)
  })

  Then(/^I should see all the position switched from A-Z to Z-A$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(2)
  })

  When(/^I press ok on the Recommended option$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Recommended', 2)
  })

  Then(/^I should see all the Recommended cards$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(2)
    await this.client.channelsPage.safeReturn()
  })
})
