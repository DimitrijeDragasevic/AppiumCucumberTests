const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I navigate to the radio channels second filter$/, async function () {
    await this.client.channelsPage.navigateToRadioChannelsFilter()
  })

  When(/^I open the second filter$/, async function () {
    await this.client.channelsPage.clickOnFilter()
  })

  Then(/^I should see all the options availabe for this filter$/, async function () {
    await this.client.channelsPage.checkRadioSecondFilter()
  })

  When(/^I press OK on the RCU on the option Recomended$/, async function () {
    await this.client.channelsPage.clickSpecialFilterOption('Recommended', 0)
  })

  When(/^I press OK on the RCU on the option Position$/, async function () {
    await this.client.channelsPage.clickSpecialFilterOption('Position', 1)
  })

  When(/^I press OK on the RCU on the option A-Z$/, async function () {
    await this.client.channelsPage.clickSpecialFilterOption('A-Z', 2)
  })

  Then(/^I should see that the second filter filtered$/, async function () {
    await this.client.channelsPage.selectedFilterCheck(1)
    await this.client.channelsPage.safeReturn()
  })
})
