const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ When, Then }) {
  When(/^I navigate on settings->parental rating->blocked screen and block specific channel$/, async function () {
    await this.client.blockedChannelsPage.setPinCodePeriod() // Set Remember PIN Code to No timeout
    await this.client.blockedChannelsPage.setLiveChannelEventCategory() // Set category
    await this.client.blockedChannelsPage.navigateToBlockChannels()
    await this.client.blockedChannelsPage.addToBlockedChannelList()
  })

  Then(/^I should see pin popup when trying to play specific channel$/, async function () {
    await this.client.blockedChannelsPage.playBlockedChannel()
    await this.client.blockedChannelsPage.pinPopupCheck()
  })
})
