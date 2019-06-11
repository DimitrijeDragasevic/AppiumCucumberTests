const { defineSupportCode } = require('cucumber')
const config = require('../config/config')

defineSupportCode(function ({ And, But, Given, Then, When }) {
  Given(/^I have navigated to the vod player$/, async function () {
    await this.client.vodPlayerPage.navigateToVodPlayer()
  })
  When(/^I press the UP or DOWN key code on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.UP)
  })
  Then(/^I should see the vod player elements$/, async function () {
    await this.client.vodPlayerPage.checkVodPlayerElements()
  })
  When(/^I press the OK key code on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })
  Then(/^I should see that the play icon has changed to play and vice versa$/, async function () {
    await this.client.vodPlayerPage.checkPlayerIconStatus()
  })
})
