const Page = require('./page')
const config = require('../../config/config')
const MyLibraryPageCommon = require('./myLibraryPageCommon')

const TV_ROW_INDEX = 0
const VOD_ROW_INDEX = 1
const ITEMS_PER_ROW_VOD = 6
const ITEMS_PER_ROW_TV = 5
const explicitWait = (ms) => new Promise((resolve) => setTimeout(() => {
  resolve()
}, ms))

class MyLibraryPageReminders extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.instanceMyLibraryPageCommon = new MyLibraryPageCommon(webdriver)

    this.expectedPath
    this.vodTitleValue
    this.eventTitleValue
    this.vodCardsTitles
    this.eventCardsTitles
    this.alredyInList

    this.pageTitle = '[class="page-title"]'
    this.noItemsTitle = '[class="no-items-title"]'
    this.searchButtonFocused = '[class="button is-active round icon-only"]'
    this.searchButtonNonFocused = '[class="button round icon-only"]'
    this.cardContainerItemVod = '[class="card-container item-vod"]'
    this.cardContainerItemTv = '[class="card-container item"]'
    this.seeAll = '.see-all'
    this.cardVodTitle = '[class="first-row-text"]'
    this.cardEventTitle = '[class="first-row"]'
    this.cardItem = '.card-container'
    this.cardRowContainer = '[class="card-row-container"]'
    this.title = '.page-wrapper .title'
    this.count = '.count'
    this.selectedCard = '[class="card-container is-selected"]'
    this.detailScreenMainTitle = '.main-title'
    this.vodBannerSelected = '[class="card-container is-selected vod-banner"]'
    this.favoritesButton = '[class="button is-dark icon-text"]'
    this.checkedVodFavoritesButton = '[class="button is-active is-dark icon-text check"]'
    this.checkedEventFavoritesButton = '[class="button is-active icon-text check"]'
    this.button = '.button'
  }

  async openFavorites () {
    // Check if route changed properly
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    this.expectedPath = '/nav/favorites'
    const url = await this.webdriver.getUrl()
    if (this.expectedPath !== this.instanceMyLibraryPageCommon.getPath(url)) {
      throw new Error('Route not changed properly')
    }
  }

  async findVodAsset () {
    const foundName = this.vodCardsTitles.find(title => {
      return title === this.vodTitleValue
    })
    // Empty list of VOD titles because of the next scenario
    this.vodCardsTitles = []
    if (!foundName) {
      throw new Error('Vod Title not found on Reminder page')
    }
  }

  async findTvEvent () {
    const foundName = this.eventCardsTitles.find(title => {
      return title === this.eventTitleValue
    })
    // Empty list of TV events titles because of the next scenario
    this.eventCardsTitles = []
    if (!foundName) {
      throw new Error('TV Event Title not found on Reminder page')
    }
  }

  async checkContentOfFavorites () {
    await this.webdriver.waitForVisible(this.cardRowContainer, config.waitTime.medium).catch(() => {
      console.log('No rows on Favorites screen')
    })
    const rows = await this.webdriver.$$(this.cardRowContainer)
    switch (rows.length) { // 'rows' equal 'stripes'
      case 0:
        await this.webdriver.waitForVisible(this.noItemsTitle, config.waitTime.medium)
        await this.webdriver.waitForVisible(this.pageTitle, config.waitTime.medium)
        await this.webdriver.waitForVisible(this.searchButtonFocused, config.waitTime.medium)
        break
      case 1: // There is one row/stripe that can be VOD stripe or TV stripe
        await this.webdriver.waitForVisible(this.title, config.waitTime.long)
        const title = await this.webdriver.$(this.title).getText()
        if (!title.includes('TV EVENTS') && !title.includes('ON DEMAND')) {
          throw new Error('Title is missing')
        }
        await this.webdriver.waitForVisible(this.count, config.waitTime.medium)
        await this.webdriver.waitForVisible(this.pageTitle, config.waitTime.medium)
        await this.webdriver.waitForVisible(this.searchButtonNonFocused, config.waitTime.medium)
        await this.webdriver.waitForVisible(this.selectedCard, config.waitTime.medium)
        await this.webdriver.waitForVisible(this.cardItem, config.waitTime.long)
        const cardItems = await this.webdriver.$$(this.cardItem)
        if (this.vodTitleValue) { // Scenario if there is one stripe and that stripe is VOD stripe
          if (cardItems.length < 6) {
            await this.webdriver.waitForVisible(this.cardVodTitle, config.waitTime.long)
            const cardsTitles = await this.webdriver.getText(this.cardVodTitle)
            if (typeof cardsTitles === 'string') {
              this.vodCardsTitles.push(cardsTitles)
            } else {
              this.vodCardsTitles = cardsTitles
            }
            return this.findVodAsset().catch(er => {
              throw new Error(er)
            })
          } else {
            await this.webdriver.waitForVisible(this.seeAll, config.waitTime.medium)
            await super.pressKeyCodeTimes(config.keyCodes.RIGHT, cardItems.length)
            await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
            await this.getFavoritesSeeAllDataVod()
            return this.findVodAsset().catch(er => {
              throw new Error(er)
            })
          }
        } else if (this.eventTitleValue) { // Scenario if there is one stripe and that stripe is TV events stripe
          if (cardItems.length < 6) {
            await this.webdriver.waitForVisible(this.cardEventTitle, config.waitTime.long)
            const cardsTitles = await this.webdriver.getText(this.cardEventTitle)
            if (typeof cardsTitles === 'string') {
              this.eventCardsTitles.push(cardsTitles)
            } else {
              this.eventCardsTitles = cardsTitles
            }
            return this.findTvEvent().catch(er => {
              throw new Error(er)
            })
          } else {
            const seeAllVisible = await this.webdriver.isExisting(this.seeAll)
            if (!seeAllVisible) {
              throw new Error('SeeAll button not visible')
            }
            await super.pressKeyCodeTimes(config.keyCodes.RIGHT, cardItems.length)
            await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
            await this.getFavoritesSeeAllDataTv()
            return this.findTvEvent().catch(er => {
              throw new Error(er)
            })
          }
        }
        break
      case 2: // There are two rows/stripes, upper one is TV stripe, above is VOD stripe
        await this.webdriver.waitForVisible(this.title, config.waitTime.long)
        const titles = await this.webdriver.getText(this.title)
        if (!titles[TV_ROW_INDEX].includes('TV EVENTS') || !titles[VOD_ROW_INDEX].includes('ON DEMAND')) {
          throw new Error('Title is missing')
        }
        const counts = await this.webdriver.$$(this.count)
        if (counts.length !== 2) {
          throw new Error('Count is missing')
        }
        await this.webdriver.waitForVisible(this.pageTitle, config.waitTime.medium)
        await this.webdriver.waitForVisible(this.searchButtonNonFocused, config.waitTime.medium)
        await this.webdriver.waitForVisible(this.selectedCard, config.waitTime.medium)
        if (this.vodTitleValue) { // Scenario when we are checking is VOD event properly added
          await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
          await this.webdriver.waitForVisible(this.cardVodTitle, config.waitTime.long)
          const cardsTitles = await this.webdriver.getText(this.cardVodTitle)
          // If getText return one title, it does not return array with one element but string
          if (typeof cardsTitles === 'string') {
            this.vodCardsTitles.push(cardsTitles)
          } else {
            this.vodCardsTitles = cardsTitles.filter(title => { // This is needed because in DOM lives some 'fake' cards
              return title.length !== 0
            })
          }
          if (this.vodCardsTitles.length < 6) {
            return this.findVodAsset().catch(er => {
              throw new Error(er)
            })
          } else {
            await this.webdriver.waitForVisible(this.seeAll, config.waitTime.medium)
            await super.pressKeyCodeTimes(config.keyCodes.RIGHT, this.vodCardsTitles.length)
            await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
            await this.getFavoritesSeeAllDataVod()
            return this.findVodAsset().catch(er => {
              throw new Error(er)
            })
          }
        } else if (this.eventTitleValue) { // Scenario when we are checking is TV event properly added
          await this.webdriver.waitForVisible(this.cardEventTitle, config.waitTime.long)
          const cardsTitles = await this.webdriver.getText(this.cardEventTitle)
          // If getText return one title, it does not return array with one element but string
          if (typeof cardsTitles === 'string') { // This is needed because in DOM lives some 'fake' cards
            this.eventCardsTitles.push(cardsTitles)
          } else {
            this.eventCardsTitles = cardsTitles.filter(title => {
              return title.length !== 0
            })
          }
          if (this.eventCardsTitles.length < 6) {
            return this.findTvEvent().catch(er => {
              throw new Error(er)
            })
          } else {
            await super.pressKeyCodeTimes(config.keyCodes.RIGHT, this.eventCardsTitles.length)
            await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
            await this.getFavoritesSeeAllDataTv()
            return this.findTvEvent().catch(er => {
              throw new Error(er)
            })
          }
        }
        break
      default:
        throw new Error('More than 2 rows')
    }
  }

  async getFavoritesSeeAllDataVod () {
    await this.webdriver.waitForVisible(this.cardContainerItemVod, config.waitTime.long)
    const items = await this.webdriver.$$(this.cardContainerItemVod)
    const rows = Math.floor((items.length + 1) / ITEMS_PER_ROW_VOD) // +1 for item which has is-selected class
    // Getting titles from VOD Assets on Favorites See All section row by row
    for (let i = 0; i <= rows; i++) {
      await this.webdriver.waitForVisible(this.cardVodTitle, config.waitTime.long)
      // Getting titles
      let titles = await this.webdriver.getText(this.cardVodTitle)
      // Delete from array of titles all fake card elements
      titles = titles.filter(title => {
        return title.length !== 0
      })
      if (i !== 0) {
        this.vodCardsTitles = [...this.vodCardsTitles, ...titles.slice(ITEMS_PER_ROW_VOD)]
      } else {
        this.vodCardsTitles = titles
      }
      await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    }
  }

  async getFavoritesSeeAllDataTv () {
    await this.webdriver.waitForVisible(this.cardContainerItemTv, config.waitTime.long)
    const items = await this.webdriver.$$(this.cardContainerItemTv)
    const rows = Math.floor((items.length + 1) / ITEMS_PER_ROW_TV) // +1 for item which has is-selected class
    // Getting titles from TV events on Favorites See All section row by row
    for (let i = 0; i <= rows; i++) {
      await this.webdriver.waitForVisible(this.cardEventTitle, config.waitTime.long)
      // Getting titles
      let titles = await this.webdriver.getText(this.cardEventTitle)
      // Delete from array of titles all fake card elements
      titles = titles.filter(title => {
        return title.length !== 0
      })
      if (i !== 0) {
        this.eventCardsTitles = [...this.eventCardsTitles, ...titles.slice(ITEMS_PER_ROW_TV)]
      } else {
        this.eventCardsTitles = titles
      }
      await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    }
  }

  async addVodAssetToFavorites () {
    await config.sendCustomKey(config.specialKeyCodes.ON_DEMAND)
    await this.webdriver.waitForVisible(this.vodBannerSelected, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    await this.webdriver.waitForVisible(this.favoritesButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
    await this.webdriver.waitForVisible(this.checkedVodFavoritesButton, config.waitTime.medium).then(async () => {
      await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
      await explicitWait(4000)
    }).catch(() => {
      console.log('Adding VOD asset to Favorites')
    })
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    await this.webdriver.waitForVisible(this.detailScreenMainTitle, config.waitTime.long)
    this.vodTitleValue = await this.webdriver.getText(this.detailScreenMainTitle)
    this.eventTitleValue = null
  }

  async navigateMyLibraryNavigation () {
    await config.sendCustomKey(config.specialKeyCodes.EON)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3)
  }

  async addTvEventToFavorites () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 4)
    await this.webdriver.waitForVisible(this.button, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
    await this.webdriver.waitForVisible(this.checkedEventFavoritesButton, config.waitTime.medium).then(async () => {
      await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
      await explicitWait(4000)
    }).catch(() => {
      console.log('Adding Tv Event to Favorites')
    })
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    await this.webdriver.waitForVisible(this.detailScreenMainTitle, config.waitTime.long)
    this.eventTitleValue = await this.webdriver.getText(this.detailScreenMainTitle)
    this.vodTitleValue = null
  }
}

module.exports = MyLibraryPageReminders
