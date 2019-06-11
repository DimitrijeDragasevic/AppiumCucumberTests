const Page = require('./page')
const config = require('../../config/config')
const assert = require('assert')

const explicitWait = (ms) => new Promise((resolve) => setTimeout(() => {
  resolve()
}, ms))

class GuideContinuousListOfEvents extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver

    this.event = '.label-event'
    this.eventsUl = '[class="grouped-items is-focused"]'
    this.date = '[class="item-row item date-label is-selected"]'
  }

  async calcEvents () {
    const events = await this.webdriver.$$(this.event).catch(e => { console.error(e) })
    const guideItemsClasses = await Promise.all(events.map(async event => {
      await explicitWait(10)
      await this.webdriver.elementIdAttribute(event.value.ELEMENT, 'class')
        .then(classes => classes.value)
        .catch(e => { console.error(e) })
    }))
    return guideItemsClasses
  }

  async openGuide () {
    await explicitWait(8000)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 5)
  }

  async areEventShownAndRightDayIsSelected () {
    await this.webdriver.waitForVisible(this.event, config.waitTime.long)
      .then(async () => {
        const selectedEventElement = 'item label-event item-row is-selected'
        const hiddenEventElement = 'item label-event item-row hide'
        let guideItems = await this.calcEvents()
        let selectedEventIndex = guideItems.indexOf(selectedEventElement)
        let closestEmptyItem = guideItems.lastIndexOf(hiddenEventElement)
        let todayDate = await this.webdriver.$(this.date).getText() // Get today date value
        let todayDay = Number(todayDate.replace(/^\D+/g, '').substring(0, 2)) // Convert new selected day value to number
        while (selectedEventIndex - closestEmptyItem > 1) { // Scroll to the beginning of the list
          await super.pressKeyCodeTimes(config.keyCodes.UP, 1)
          guideItems = await this.calcEvents()
          selectedEventIndex = guideItems.indexOf(selectedEventElement)
          closestEmptyItem = guideItems.lastIndexOf(hiddenEventElement)
        }

        // moment before fetching events for prev day
        await super.pressKeyCodeTimes(config.keyCodes.UP, 1) // This click should trigger fetching events for prev day
        await explicitWait(1000)
        // new events, for prev day, are now fetched
        guideItems = await this.calcEvents()
        selectedEventIndex = guideItems.indexOf(selectedEventElement)
        closestEmptyItem = guideItems.indexOf(hiddenEventElement)
        let newSelectedDate = await this.webdriver.$(this.date).getText() // Get selected date value
        let newSelectedDateDay = Number(newSelectedDate.replace(/^\D+/g, '').substring(0, 2)) // Convert new selected day value to number

        assert.strictEqual(selectedEventIndex + 1, closestEmptyItem, 'New events for prev day are not fetched')
        assert.strictEqual(todayDay - 1, newSelectedDateDay, 'New date, "day before", is not selected' + todayDay + ' ' + newSelectedDateDay)

        // Last item is selected, one click "down" should trigger fetching events for next day
        await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1) // This click should trigger fetching events for next day
        await explicitWait(1000)
        guideItems = await this.calcEvents()
        selectedEventIndex = guideItems.indexOf(selectedEventElement)
        closestEmptyItem = guideItems.lastIndexOf(hiddenEventElement)
        newSelectedDate = await this.webdriver.$(this.date).getText() // Get selected date value
        newSelectedDateDay = Number(newSelectedDate.replace(/^\D+/g, '').substring(0, 2)) // Convert new selected day value to number

        assert.strictEqual(selectedEventIndex - 1, closestEmptyItem, 'New events for next day are not fetched')
        assert.strictEqual(todayDay, newSelectedDateDay, 'New date, "today" date is not selected' + todayDay + ' ' + newSelectedDateDay)
      })
      .catch((e) => {
        throw new Error(e)
      })
  }
}

module.exports = GuideContinuousListOfEvents
