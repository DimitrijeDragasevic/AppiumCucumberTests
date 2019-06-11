const { defineSupportCode } = require('cucumber')

defineSupportCode(function ({ And, But, Given, Then, When }) {
  When(/^I am on the radio page and go through some cards$/, async function () {
    await this.client.mainPage.checkForClientStart()
    await this.client.channelsPage.goToRadioWOk()
  })
  Then(/^I should see that the card has an image, white text and blue background$/, async function () {
    await this.client.channelsPage.checkRadioCard()
  })
})
