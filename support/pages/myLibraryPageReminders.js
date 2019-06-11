const Page = require('./page')
const MyLibraryPageCommon = require('./myLibraryPageCommon')

const config = require('../../config/config')
const ITEMS_PER_ROW = 5
const explicitWait = (ms) => new Promise((resolve) => setTimeout(() => {
  resolve()
}, ms))

class MyLibraryPageReminders extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.cards
    this.futureEvent = {}
    this.eventTime
    this.nextEventTime
    this.remindersRows
    this.remindersRowsLength
    this.expectedPath
    this.formattedCardsTime = []
    this.formattedCardsTitle = []
    this.alredyInList

    this.instanceMyLibraryPageCommon = new MyLibraryPageCommon(webdriver)

    this.pageTitle = '[class="page-title"]'
    this.noItemsTitle = '[class="no-items-title"]'
    this.rowTitle = '[class="page-title"]'
    this.searchButtonFocused = '[class="button is-active round icon-only"]'
    this.searchButtonNonFocused = '[class="button round icon-only"]'
    this.cardItems = 'div.card-container'
    this.seeAll = '[class="card-nowtv"]'
    this.selectedEvent = '[class="item label-event item-row is-selected"]'
    this.selectedEventTitle = '[class="name-text"]'
    this.channelsSection = '[class="channels-section transition"]'
    this.cardTitle = '[class="first-row"]'
    this.selectedDate = '[class="item-row item date-label is-selected"]'
    this.hour = '[class="hour"]'
    this.description = '[class="description"]'
    this.cardContainerItem = '[class="card-container item"]'
    this.navigationActive = {
      leftSide: '[class="nav-background is-active"]',
      rightSide: '[class="right-side navigation-active"]'
    }
    this.navigationHidden = {
      leftSide: '[class="nav-background"]',
      rightSide: '[class="right-side"]'
    }
    this.detailScreen = {
      progress: '[class="progress"]',
      buttons: '[class="buttons"]',
      reminderButton: '.button.is-active.icon-text',
      reminderButtonText: '[class="text"]'
    }
    this.iconPlay = '.icon-play'
  }

  async calcRows () {
    await this.webdriver.waitForVisible(this.channelsSection, config.waitTime.long)
    const rows = await this.webdriver.$$(this.channelsSection)
    return rows.length
  }

  async checkNavigationHide () {
    await this.webdriver.waitForVisible(this.navigationActive.leftSide, config.waitTime.medium)
    await this.webdriver.waitForVisible(this.navigationActive.rightSide, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    await this.webdriver.waitForVisible(this.navigationHidden.leftSide, config.waitTime.medium)
    await this.webdriver.waitForVisible(this.navigationHidden.rightSide, config.waitTime.medium)
  }

  async openReminders () {
    // Check if route changed properly
    await this.checkNavigationHide()
    this.expectedPath = '/nav/reminders'
    const url = await this.webdriver.getUrl()
    if (this.expectedPath !== this.instanceMyLibraryPageCommon.getPath(url)) {
      throw new Error('Route not changed properly')
    }
    await this.webdriver.waitForVisible(this.cardItems, config.waitTime.long)
      .then(async () => {
        this.cards = await this.webdriver.$$(this.cardItems)
        // Calculating number of rows of events on Reminder screen
        this.remindersRowsLength = await this.calcRows()
      })
      .catch(() => {
        this.cards = []
        this.remindersRowsLength = 0
      })
  }

  async checkForReminderHTMLElements () {
    await this.webdriver.waitForVisible(this.pageTitle, config.waitTime.short)
    await this.webdriver.waitForVisible(this.rowTitle, config.waitTime.short)
    await this.webdriver.waitForVisible(this.searchButtonNonFocused, config.waitTime.short)
  }

  async findReminderEvent () {
    const foundName = this.formattedCardsTitle.find(title => {
      return title === this.futureEvent.title
    })
    if (!foundName) {
      throw new Error('Title not found on Reminder page')
    }
    const foundTime = this.formattedCardsTime.find(time => {
      return time === this.futureEvent.time
    })
    if (!foundTime) {
      throw new Error('Time not found on Reminder page')
    }
  }

  async getReminderData () {
    // Getting title and time from events on Reminder section
    await this.webdriver.waitForVisible(this.cardTitle, config.waitTime.long)
      .then(async () => {
        const cardsTitle = await this.webdriver.getText(this.cardTitle)
        this.formattedCardsTitle = typeof (cardsTitle) === 'string' ? [cardsTitle] : [...cardsTitle]
      })
    await this.webdriver.waitForVisible(this.description, config.waitTime.long)
      .then(async () => {
        const cardsTime = await this.webdriver.getText(this.description)
        this.formattedCardsTime = typeof cardsTime === 'string' ? [this.instanceMyLibraryPageCommon.formTime(cardsTime)] : [...cardsTime.map(time => this.instanceMyLibraryPageCommon.formTime(time))]
      })
  }

  async getReminderSeeAllData () {
    // Getting title and time from events on Reminder See All section row by row
    await this.webdriver.waitForVisible(this.cardContainerItem, config.waitTime.long)
    const items = await this.webdriver.$$(this.cardContainerItem)
    const rows = Math.floor(items.length / ITEMS_PER_ROW)
    for (let i = 0; i <= rows; i++) {
      await this.webdriver.waitForVisible(this.cardTitle, config.waitTime.long)
      // Getting titles
      let titles = await this.webdriver.getText(this.cardTitle)
      // Delete from array of titles all fake card elements
      titles = titles.filter(title => {
        return title.length !== 0
      })
      if (i !== 0) {
        this.formattedCardsTitle = [...this.formattedCardsTitle, ...titles.slice(5)]
      } else {
        this.formattedCardsTitle = titles
      }
      // Getting time
      await this.webdriver.waitForVisible(this.description, config.waitTime.long)
      let times = await this.webdriver.getText(this.description)
      if (typeof this.cardsTime === 'string') {
        this.formattedCardsTime.push(this.instanceMyLibraryPageCommon.formTime(this.cardsTime))
      } else {
        times.forEach(time => {
          this.formattedCardsTime.push(this.instanceMyLibraryPageCommon.formTime(time))
        })
      }
      await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    }
  }

  async checkContentOfReminders (checkForEvent) {
    if (this.cards.length === 0) {
      await this.webdriver.waitForVisible(this.noItemsTitle, config.waitTime.short)
      await this.webdriver.waitForVisible(this.pageTitle, config.waitTime.short)
      await this.webdriver.waitForVisible(this.searchButtonFocused, config.waitTime.short)
    } else {
      if (this.remindersRowsLength === 1) {
        if (this.cards.length < 6) {
          await this.checkForReminderHTMLElements()
          if (checkForEvent) {
            await this.getReminderData()
            return this.findReminderEvent().catch(er => {
              throw new Error(er)
            })
          }
        } else {
          await this.checkForReminderHTMLElements()
          await this.webdriver.waitForVisible(this.seeAll, config.waitTime.short)
          if (checkForEvent) {
            // Navigate to and press SEE ALL button
            await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 6)
            await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
            // Route check
            this.expectedPath = '/nav/reminder-see-all'
            const url = await this.webdriver.getUrl()
            if (this.expectedPath !== this.instanceMyLibraryPageCommon.getPath(url)) {
              throw new Error('Route not changed properly')
            }
            await this.getReminderSeeAllData()
            return this.findReminderEvent().catch(er => {
              throw new Error(er)
            })
          }
          await this.getReminderSeeAllData()
          return this.findReminderEvent().catch(er => {
            throw new Error(er)
          })
        }
      } else {
        await this.checkForReminderHTMLElements()
      }
    }
  }

  async navigateToFutureEvent () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
    await this.webdriver.waitForVisible(this.selectedEvent, config.waitTime.long)
    await this.webdriver.waitForVisible(this.iconPlay, config.waitTime.long).then(async () => {
      this.alredyInList = await this.webdriver.$(this.selectedEvent).$(this.iconPlay).isExisting()
    }).catch(() => {
      this.alredyInList = false
    })
  }

  async getFutureEventTime () {
    this.eventTime = await this.webdriver.$(this.selectedEvent).$(this.hour).getText()
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    await this.webdriver.waitForVisible(this.selectedEvent, config.waitTime.long)
    await this.webdriver.waitForVisible(this.hour, config.waitTime.long)
    this.nextEventTime = await this.webdriver.$(this.selectedEvent).$(this.hour).getText()
    return `${this.eventTime} - ${this.nextEventTime}`
  }

  async addReminderToEvent () {
    await this.webdriver.waitForVisible(this.selectedEvent, config.waitTime.long)
    await this.webdriver.waitForVisible(this.selectedEventTitle, config.waitTime.long)
    await this.webdriver.waitForVisible(this.selectedDate, config.waitTime.long)
    await this.webdriver.waitForVisible(this.hour, config.waitTime.long)
    // Getting infromation about future event added in Reminders
    this.futureEvent = {
      title: await this.webdriver.$(this.selectedEvent).$(this.selectedEventTitle).getText(),
      date: await this.webdriver.$(this.selectedDate).getText(),
      time: await this.getFutureEventTime()
    }
    // Adds reminder to event
    await super.pressKeyCodeTimes(config.keyCodes.UP, 1)
    if (this.alredyInList) {
      await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
      await explicitWait(2000)
    }
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    // Navigate back to Navigation/My Library
    await super.pressKeyCodeTimes(config.keyCodes.BACK, 2)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
  }

  async openEventDetail () {
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    this.expectedPath = '/no-nav/event-detail'
    await explicitWait(1000)
    const url = await this.webdriver.getUrl()
    if (this.expectedPath !== this.instanceMyLibraryPageCommon.getPath(url)) {
      throw new Error('Route not changed properly')
    }
  }

  async checkContentOfDetailScreen () {
    await this.webdriver.waitForVisible(this.detailScreen.progress, config.waitTime.long)
    await this.webdriver.waitForVisible(this.detailScreen.buttons, config.waitTime.long)
    await this.webdriver.waitForVisible(this.detailScreen.reminderButton, config.waitTime.long)
    await this.webdriver.waitForVisible(this.detailScreen.reminderButtonText, config.waitTime.long)
    const reminderButtonText = await this.webdriver
      .$(this.detailScreen.reminderButton)
      .$(this.detailScreen.reminderButtonText)
      .getText()
    if (reminderButtonText !== 'REMINDER') {
      throw new Error('Reminder button is missing')
    }
  }
}

module.exports = MyLibraryPageReminders
