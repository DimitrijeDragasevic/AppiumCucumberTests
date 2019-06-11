const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ When, Then }) {
  When(/^I come to Guide$/, async function () {
    await this.client.memoryProfilingPage.openVodCatalogue()
  })

  Then(/^I should randomly play TV events and open corresponding detail screen$/, async function () {
    await this.client.memoryProfilingPage.playRandomVods()
  })
})
