const defineSupportCode = require('cucumber').defineSupportCode
const config = require('../config/config')

defineSupportCode(function ({ Given, When, Then }) {
  Given(/^I navigate to the tv channels page$/, async function () {
    await this.client.channelsPage.navigateToTvChannelsPage()
  })

  When(/^I navigate to the tv channels page and select a live event$/, async function () {
    await this.client.channelsPage.navigateToLiveEvent()
  })

  When(/^I press ok on the RCU$/, async function () {
    await this.client.channelsPage.clickOne()
  })

  Then(/^I should see a live event being played$/, async function () {
    await this.client.channelsPage.checkForLiveEvent()
  })

  When(/^I am on the tv channels page$/, async function () {
    await this.client.channelsPage.checkChannelsPage()
  })

  Then(/^I press right button on the RCU multiple times$/, async function () {
    await this.client.channelsPage.navigateToDetail()
  })

  Then(/^I should be on the channels detail screen$/, async function () {
    await this.client.channelsPage.checkChannelsDetail()
  })

  When(/^I am on some catchup event$/, async function () {
    await this.client.channelsPage.navigateToCatchupContent()
  })

  Then(/^I press the right return button on the player$/, async function () {
    await this.client.channelsPage.restartLiveEvent()
  })

  Then(/^I should bee directed to the live content on that channel$/, async function () {
    await this.client.channelsPage.checkForLiveEvent()
  })

  When(/^I am on some live event on the page$/, async function () {
    await this.client.channelsPage.navigateToRandomLive()
  })

  Then(/^I press the right return button on the playertwo$/, async function () {
    await this.client.channelsPage.restartLiveEvent()
  })

  Then(/^I should bee directed to the live content on that channeltwo$/, async function () {
    await this.client.channelsPage.checkForLiveEvent()
  })

  When(/^I select an event from the past and press ok on the RCU$/, async function () {
    await this.client.channelsPage.navigateToCatchupContent()
  })

  Then(/^I should bee watching that past event$/, async function () {
    await this.client.channelsPage.checkForLiveEvent()
  })

  When(/^I am in the forth column on the tv channels page$/, async function () {
    await this.client.channelsPage.navigateToFutureEvent()
  })

  Then(/^I press ok on any future event$/, async function () {
    await this.client.channelsPage.clickOne()
  })

  Then(/^I should see that the bell icon is present on that specific event$/, async function () {
    await this.client.channelsPage.checkReminder()
  })

  When(/^I navigate to the detail screen on any event on the guide and press ok$/, async function () {
    await this.client.channelsPage.navigateToDetail()
    await this.client.channelsPage.checkChannelsDetail()
    await this.client.channelsPage.navigateToFavoritesButton()
    await this.client.channelsPage.serFavoriteGuide()
  })

  Then(/^I should see that the event is set to favorite events$/, async function () {
    await this.client.channelsPage.serFavoriteGuideCheck()
    await this.client.channelsPage.safeReturn()
  })

  When(/^I am on the tv channels sub menu page$/, async function () {
    await this.client.channelsPage.checkChannelsPage()
  })

  Then(/^I should see the following columns categories, channels, dates and events$/, async function () {
    await this.client.channelsPage.checkAllColumns()
  })

  When(/^I am on the detail screen$/, async function () {
    await this.client.channelsPage.navigateToDetail()
    await this.client.channelsPage.checkChannelsDetail()
  })

  When(/^I press OK on the RCU on the WATCH button$/, async function () {
    await this.client.channelsPage.navigateToButton(0)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK, 1, 500)
  })

  Then(/^I should see that the event is being played$/, async function () {
    await this.client.channelsPage.checkPlayerElements()
  })

  When(/^I press OK on the RCU on the START OVER button$/, async function () {
    await this.client.channelsPage.navigateToButton(1)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  When(/^I press OK on the RCU on the FAVORITES button$/, async function () {
    await this.client.channelsPage.navigateToButton(2)
    await this.client.channelsPage.checkChannelsDetail()
    await this.client.channelsPage.serFavoriteGuide()
  })

  Then(/^I should see that the button is highlighted$/, async function () {
    await this.client.channelsPage.serFavoriteGuideCheck()
  })

  When(/^I press OK on the RCU on the SEE FULL button$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.DOWN)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  Then(/^I should see a detailed synopsis$/, async function () {
    await this.client.channelsPage.checkSynopsis()
  })

  When(/^I am on the second column$/, async function () {
    await this.client.channelsPage.navigateToSecondColumn()
  })

  Then(/^I should see that the given channel has a picture$/, async function () {
    await this.client.channelsPage.checkPictureInSecondColumn()
  })
  When(/^I am on the third column on the TV guide page$/, async function () {
    await this.client.channelsPage.navigateToThirdColumn()
  })

  Then(/^I should see that there are seven days in the past and three days in the future$/, async function () {
    await this.client.channelsPage.eventCheckPastAndFuture()
  })

  When(/^I am on the TV guide page$/, async function () {
    await this.client.channelsPage.checkAllColumns()
  })

  Then(/^I should see the arrow that navigates to the Detail screen$/, async function () {
    await this.client.channelsPage.checkArrow()
  })

  When(/^I am on the 4th column on the TV guide page$/, async function () {
    await this.client.channelsPage.navigateTOFourthColumn()
  })

  When(/^I focus a past or future event$/, async function () {
    await this.client.channelsPage.pastOrFutureSelect()
  })

  When(/^I go back to the second column and press OK on the RCU$/, async function () {
    await this.client.page.pressKeyCodeTimes(config.keyCodes.LEFT, 2)
    await this.client.page.pressKeyCodeTimes(config.keyCodes.OK)
  })

  Then(/^I should see that the currently live event is being played$/, async function () {
    await this.client.channelsPage.checkPlayerElements()
  })
})
