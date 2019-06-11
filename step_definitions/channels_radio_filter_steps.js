const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I navigate to the radio channels tab$/, async function () {
    await this.client.channelsPage.navigateToRadioChannels()
  })

  When(/^I press OK on the RCU on the first filter$/, async function () {
    await this.client.channelsPage.clickOnFilter()
  })

  Then(/^I should see all the options available$/, async function () {
    await this.client.channelsPage.checkRadioFirstFilter()
  })

  When(/^I press OK on the RCU on the Stingray option$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Stingray', 0)
  })

  Then(/^I should see that the filter selected filtered$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(0)
    await this.client.channelsPage.safeReturn()
  })

  When(/^I press OK on the RCU on the POP option$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Local POP', 1)
  })

  When(/^I press OK on the RCU on the Local POP option$/, async function () {
    await this.client.channelsPage.clickOnFilterOption('Local folk', 2)
  })
})
