const { defineSupportCode } = require('cucumber')
const config = require('../config/config')

defineSupportCode(function ({ And, But, Given, Then, When }) {
  Given(/^I have navigated to the radio player$/, async function () {
    await this.client.radioPage.navigateToRadioPlayer()
  })
  When(/^I press the UP keyCode on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.UP)
  })
  Then(/^I should see the radio player elements$/, async function () {
    await this.client.radioPage.checkUpcomingEvents()
  })
  When(/^I press the channelUp button on the RCU$/, async function () {
    await this.client.radioPage.changeRadioChannel()
  })
  Then(/^I should see that the radio channel has changed$/, async function () {
    await this.client.radioPage.checkRadioChannelTitle()
  })
})
