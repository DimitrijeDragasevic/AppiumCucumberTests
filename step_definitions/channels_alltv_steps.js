const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I have navigated to the all tv filter$/, async function () {
    await this.client.channelsPage.navigateToFilterByIndex(2)
  })

  When(/^I press ok to the all tv filter$/, async function () {
    await this.client.channelsPage.clickOnFilter()
  })

  Then(/^I should see all the options for this filter$/, async function () {
    await this.client.channelsPage.checkSecondFilter()
  })

  When(/^I press ok on the kids filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Kids', 1)
  })

  Then(/^I should see all the channels that are playing live kids content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the sport filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Sports', 2)
  })

  Then(/^I should see all the channels that are playing live sports content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the HD filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('HD', 3)
  })

  Then(/^I should see all the channels that are playing live HD content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the music filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Music', 4)
  })

  Then(/^I should see all the channels that are playing live music content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the informative filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Informative', 5)
  })

  Then(/^I should see all the channels that are playing live informative content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the Movies filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Movies', 6)
  })

  Then(/^I should see all the channels that are playing Movie content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the entertainment filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Entertainment', 7)
  })

  Then(/^I should see all the channels playing the entertainment content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the documentary filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Documentary', 8)
  })

  Then(/^I should see all the channels playing the documentary content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the Local tv filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Local TV', 9)
  })
  Then(/^I should see all the channels playing the local tv content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the Regional filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Regional TV', 10)
  })

  Then(/^I should see all the channels playing the Regional content$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the International filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('International TV', 11)
  })

  Then(/^I should see all the channels playing the International content live$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
  })

  When(/^I press ok on the adult filter$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Adult', 12)
  })

  Then(/^I should see all the channels that a playing adult content live$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
    await this.client.channelsPage.safeReturn()
  })
})
