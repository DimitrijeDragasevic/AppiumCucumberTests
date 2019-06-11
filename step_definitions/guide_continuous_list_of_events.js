const defineSupportCode = require('cucumber').defineSupportCode

defineSupportCode(function ({ When, Then }) {
  When(/^I open Guide and select events column$/, async function () {
    await this.client.guideContinuousListOfEvents.openGuide()
  })

  Then(/^I should see prev and next day events are loaded and right day is selected$/, async function () {
    await this.client.guideContinuousListOfEvents.areEventShownAndRightDayIsSelected()
  })
})
