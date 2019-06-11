const { defineSupportCode } = require('cucumber')

defineSupportCode(function ({ And, But, Given, Then, When }) {
  When(/^I am on the landing page of the application$/, async function () {
    await this.client.mainPage.checkForClientStart()
  })

  Then(/^I press OK on the first sub menu option and then I should be on the now on tv page$/, async function () {
    await this.client.channelsPage.goToNowTvWOk()
    await this.client.channelsPage.safeReturn()
  })

  Then(/^I press OK on the second sub menu option and then I should be on the channels page$/, async function () {
    await this.client.channelsPage.goToChannelsWOk()
    await this.client.channelsPage.safeReturn()
  })

  Then(/^I press ok on the third sub menu option and then I should be on the radio Page$/, async function () {
    await this.client.channelsPage.goToRadioWOk()
    await this.client.channelsPage.safeReturn()
  })
})
