const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ When, Then }) {
  When(/^I navigate to locked event, unlock it and start it over again$/, async function () {
    await this.client.pinProtectedEvent.playBlockedChannel()
    await this.client.pinProtectedEvent.checkPlayerElements()
    await this.client.pinProtectedEvent.startOverEvent()
  })

  Then(/^I should see pin popup when trying to play blocked channel$/, async function () {
    await this.client.blockedChannelsPage.playBlockedChannel()
    await this.client.blockedChannelsPage.pinPopupCheck()
  })

  When(/^I go back to live from past event$/, async function () {
    await this.client.pinProtectedEvent.backToLive()
  })

  Then(/^I should see pin popup and enter valid pin$/, async function () {
    await this.client.pinProtectedEvent.pinEnter()
    await this.client.pinProtectedEvent.checkPlayerElements()
  })

  When(/^I go back to live on live unlocked event$/, async function () {
    await this.client.pinProtectedEvent.backToLive()
  })
})
