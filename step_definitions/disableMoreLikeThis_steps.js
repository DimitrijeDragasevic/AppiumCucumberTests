const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ When, Then }) {
  When(/^I navigate to episode$/, async function () {
    await this.client.disableMoreLikeThis.navigateToEpisode()
    await this.client.disableMoreLikeThis.findAndPlayEpisode()
  })

  Then(/^I should not see More like this stripe and MORE button$/, async function () {
    await this.client.disableMoreLikeThis.checkMoreLikeThis()
  })
})
