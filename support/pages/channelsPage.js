const config = require('../../config/config')
const assert = require('assert')
const Page = require('../pages/page')
const _ = require('lodash')
const util = require('../../config/util')

class ChannelsPage extends Page {
  constructor (webdriver) {
    super()
    this.webdriver = webdriver
    this.homeButton = '[class="icon"]'
    this.noOnTvTittle = '[class="page-title"]'

    // columns
    this.firstColumn = '[class="column categories is-focused"]'
    this.secondColumn = '[class="column channels"]'
    this.thirdColumn = '[class="column dates"]'
    this.fourthColumn = '[class="column events"]'
    this.nowOnTvTitle = '[id="Now on TV"]'
    this.nowFilterScreenTitle = '[class="title"]'
    this.nowFilterNextButton = '[id="Next"]'
    this.nowFilterPreviousButton = '[id="Previous"]'
    this.nowFilterCard = '[class="card-container item"]'
    this.nowFilterCardSelected = '[class="card-container is-selected item"]'
    this.selectedFilterCard = '[class="selectCardText"]'
    this.kidsFilter = '[id="Kids"]'
    this.sportsFilter = '[id="Sports"]'
    this.hdFilter = '[id="HD"]'
    this.musicFilter = '[id="Music"]'
    this.movieFilter = '[id="Movies"]'
    this.informativeFilter = '[id="Informative"]'
    this.entertainmentFilter = '[id="Entertainment"]'
    this.documentaryFilter = '[id="Documentary"]'
    this.localTvFilter = '[id="Local TV"]'
    this.regionalFilter = '[id="Regional TV"]'
    this.internationalFilter = '[id="International TV"]'
    this.adultFilter = '[id="Adult"]'
    this.nowTvCardDes = '[class="description"]'
    this.sortFilter = '[class="selectCardText"]'
    this.sortFilterOption = '[id="A-Z"]'
    this.player = '[id="player"]'
    this.channelsPage = '[class="guide-wrapper"]'
    this.detailBackgroundImg = '[class="background-image"]'
    this.detailProgress = '[class="done"]'
    this.detailButton = '[class="icon"]'
    this.detailEventTitle = '[id="event-title"]'
    this.remainderIcon = '[class="icon-reminder"]'
    this.favoritesButtonActive = '[class="button is-active is-dark icon-text"]'
    this.favoritesButtonInactive = '[class="button is-dark icon-text"]'
    this.selectedButton = '[class="button is-active icon-text"]'
    this.subTvChannels = '[id="tvChannels"]'
    this.subRadioChannels = '[id="radioStations"]'
    this.subMenuItem = '[class="item  "]'
    this.seeFullSynopsis = '[class="message"]'
    this.selectedChannelSecColumn = '[id="firstChannel"]'
    this.selectedSecondColumn = '[class="column channels is-focused"]'
    this.selectedThirdColumn = '[class="column dates is-focused"]'
    this.selectedFourthColumn = '[class="item label-event item-row is-selected"]'
    this.slectedDate = '[class="item-row item date-label is-selected"]'
    this.arrow = '[class="arrow-right"]'
    this.backgroundImage = '[class="background-image"]'

    this.allTVFilter = {
      classMain: '[class="main"]',
      selectedItem: '[class="item is-active"]',
      listItem: '[class="list"]'
    }
    this.guideSelected = '[class="item-row channel-logo-list is-selected"]'

    this.cardRadio = '[class="card-container is-selected item-radio"]'
    this.cardRadioDescription = '[class="description"]'
    this.cardRadioText = '[class="first-row"]'

    // tv guide
    this.guideFirstChannel = '[class="item-row channel-logo-list is-selected"]'
    // Search Page
    this.searchField = '[class="field"]'

    // RADIO CHANNELS

    // first filter
    this.radioTitle = '[id="Radio Channels"]'
    this.filterList = '[class="list"]'
    this.filterTitle = '[class="above-title"]'
    this.filterImage = '[class="image circle"]'
    this.filterOptionStingray = '[id="Stingray"]'
    this.filterOptionPop = '[id="POP"]'
    this.filterOptionLocalPop = '[id="Local POP"]'

    // second filter
    this.secondFilterOptionAz = '[id="A-Z"]'
    this.secondFilterOptionPos = '[id="Position"]'
    this.secondFilterOptionRec = '[id="Recommended"]'

    // player
    this.player = '[class="player translate is-visible"]'
    this.progressBarPlayer = '[class="progress-bar"]'
    this.playerButtons = '[class="buttons"]'
    this.playerClock = '[class="clock is-visible"]'
    this.selectedChannelBanner = '[class="channel is-selected focused"]'

    this.detailScreen = {
      favoriteButtonInactive: '[class="button is-active icon-text"]',
      favoriteButtonActive: '[class="button is-active icon-text check"]'
    }

    this.colors = {
      blue: '#0095da',
      white: '#ffffff'

    }
  }

  async checkSearchPage () {
    await this.webdriver.waitForVisible(this.searchField, config.waitTime.medium)
    let voiceIcon = await this.webdriver.isExisting(this.homeButton)
    if (!voiceIcon) throw new Error('the voice icon is not existing')
  }

  async navigateToFilterByIndex (index) {
    await this.webdriver
      .waitForVisible(this.homeButton, config.waitTime.long)
      .pressKeycode(config.keyCodes.DOWN)
      .pressKeycode(config.keyCodes.RIGHT)
    await super.pressKeyCodeTimes(config.keyCodes.UP, 2)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, index)
  }

  async navigateToTvChannelsPage () {
    await this.webdriver.waitForVisible(this.homeButton, config.waitTime.long)
    await this.webdriver
      .pressKeycode(config.keyCodes.DOWN)
      .pressKeycode(config.keyCodes.RIGHT)
      .pressKeycode(config.keyCodes.RIGHT)
  }

  async navigateToRadioChannels () {
    await this.webdriver.waitForVisible(this.homeButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
  }

  async navigateToRadioChannelsFilter () {
    await this.webdriver.pause(config.waitTime.shorter)
    await this.webdriver.waitForVisible(this.homeButton, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
  }

  async navigateToLiveEvent () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 0)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
  }

  async navigateToCatchupContent () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1, 700)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, config.randomNumber, 700)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2, 700)
    await super.pressKeyCodeTimes(config.keyCodes.UP, config.randomNumber, 700)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1, 700)
    await this.webdriver.pause(config.waitTime.shorter)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1, 700)
  }

  async navigateToDetail () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 4)
    await this.webdriver.waitForVisible(this.backgroundImage, config.waitTime.medium)
  }

  async navigateToRandomLive () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, config.randomNumber)
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 3)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    await this.webdriver.pause(config.waitTime.shorter)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
  }

  async navigateToFutureEvent () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 3)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, config.randomNumber)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
  }

  async goToNowTvWOk () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.UP)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.noOnTvTittle, config.waitTime.medium)
  }

  async goToChannelsWOk () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 2)
    await this.checkAllColumns()
  }

  async goToRadioWOk () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.radioTitle, config.waitTime.long)
  }

  async checkNowOnTVPage () {
    await this.webdriver.waitForVisible(this.nowFilterCard, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    let title = await this.webdriver.isExisting(this.nowOnTvTitle)
    if (!title) throw new Error('the title is missing')
  }

  async moveThroughCards () {
    for (let i = 0; i < 10; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN)
        .then(async () => {
          await this.webdriver.waitForVisible(this.nowFilterCardSelected, config.waitTime.medium)
        })
        .then(async () => {
          let getTxt = await this.webdriver.$(this.nowFilterCardSelected).$('[class="description"]').isExisting()
          let txtColor = await this.webdriver.$(this.nowFilterCardSelected).$('[class="description"]').$('[class="first-row"]').getCssProperty('color')
          let backgroundColor = await this.webdriver.$(this.nowFilterCardSelected).$('[class="description"]').getCssProperty('background-color')
          if (backgroundColor.parsed.hex !== this.colors.blue || txtColor.parsed.hex !== this.colors.white || !getTxt) {
            throw new Error('The background or text color does not match')
          }
        })
        .catch(e => console.error(e))
    }
  }

  async checkPictureOnCard () {
    let cardPicture = await this.webdriver.$(this.nowFilterCardSelected).getCssProperty('background-image')
    let pictureSplit = cardPicture.value.indexOf(',')
    let channelLogo = cardPicture.value.slice(0, pictureSplit)
    let cardChannel = config.getPictureLogoName(channelLogo)
    let found = false
    util.allChannels.forEach(string => {
      if (cardChannel === string) {
        found = true
      }
    })
    if (!found) throw new Error('the channel was not found')
  }

  async checkPictureInSecondColumn () {
    let selChannelPic = await this.webdriver.$(this.selectedChannelSecColumn).getCssProperty('background-image')
    let logoName = config.getPictureLogoName(selChannelPic.value)
    let found = false
    util.allChannels.forEach(string => {
      if (logoName === string) {
        found = true
      }
    })
    if (!found) throw new Error('The channel was not found')
  }

  async navigateToSecondColumn () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
    await this.webdriver.waitForVisible(this.selectedSecondColumn, config.waitTime.medium)
  }

  async navigateToThirdColumn () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
    await this.webdriver.waitForVisible(this.selectedThirdColumn)
  }

  async navigateTOFourthColumn () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 3)
    await this.webdriver.waitForVisible(this.selectedFourthColumn, config.waitTime.medium)
  }

  async eventCheckPastAndFuture () {
    await this.webdriver.waitForVisible(this.slectedDate, config.waitTime.medium)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 3)
    for (let i = 0; i < 12; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.UP)
        .then(
          await this.webdriver.waitForVisible(this.slectedDate, config.waitTime.medium))
        .catch(e => console.log(e))
    }
  }

  /*
    async checkFirstChannelImage () {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
      await this.webdriver.waitForVisible(this.guideFirstChannel, config.waitTime.medium)
      let firstChannelImage = await this.webdriver.$(this.guideFirstChannel).getCssProperty('background-image')
      if (firstChannelImage !== channelImage) {
        throw new Error('the pictures on the channel does not match')
      }
    }
  */
  async navigateToButton (times) {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, times)
  }

  async checkPlayerElements () {
    await this.webdriver.waitForVisible(this.player, config.waitTime.medium)
    let playerButton = await this.webdriver.isVisible(this.playerButtons)
    let playerClock = await this.webdriver.isVisible(this.playerClock)
    let selectedChannelBanner = await this.webdriver.isVisible(this.selectedChannelBanner)
    if (!playerButton || !playerClock || !selectedChannelBanner) {
      throw new Error(`One of the dom elements provided in the method checkPlayerElements is not visible!`)
    }
  }

  async checkSynopsis () {
    await this.webdriver.waitForVisible(this.seeFullSynopsis, config.waitTime.medium)
  }

  async clickOnAnyCard () {
    await this.webdriver.waitForVisible(this.nowFilterCard, config.waitTime.long)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await this.webdriver.waitForVisible(this.nowFilterCardSelected, config.waitTime.long)
      .then(async () => {
        await this.webdriver.waitForVisible(this.nowFilterCardSelected)
        this.cardTxt = await this.webdriver.$(this.nowFilterCardSelected).$('[class="description"]').$('[class="first-row"]').getText()
        await super.pressKeyCodeTimes(config.keyCodes.OK)
      })
      .then(async () => {
        await this.webdriver.waitForVisible('[class="title"]', config.waitTime.medium)
        let playerTxt = await this.webdriver.getText('[class="title"]')
        // this is a stream check if the getText method returns an array, if the stream works it will return a single value
        if (_.isArray(playerTxt)) {
          if (playerTxt[0] === 'Information' && this.cardTxt !== playerTxt[1]) {
            throw new Error('The stream did not play and the card title does not match the player title')
          }
        } else {
          if (this.cardTxt !== playerTxt) {
            throw new Error('the card title does not match the player title')
          }
        }
      })
      .catch(e => console.error(e))
  }

  /*
  this method returns to the sub menu of the app to its starting state
  */
  async safeReturn () {
    await this.webdriver.pause(config.waitTime.short)
    await super.pressKeyCodeTimes(config.keyCodes.BACK, 1)
    await this.webdriver.waitForVisible(this.subMenuItem, config.waitTime.long)
    let classNameTvChannels = await this.webdriver.$(this.subTvChannels).getAttribute('class')
    let classNameRadioStations = await this.webdriver.$(this.subRadioChannels).getAttribute('class')
    if (classNameTvChannels === 'item  is-selected') {
    } else if (classNameRadioStations === 'item  is-selected') {
      await super.pressKeyCodeTimes(config.keyCodes.UP, 1)
      await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN, 1)
      await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
    }
  }

  async checkForFilterType (type) {
    switch (type) {
      case 'Previous': {
        let deviceTimeAndDate = await this.webdriver.getDeviceTime()
        let deviceFormattedTime = deviceTimeAndDate.value.slice(11, 16)
        let cardTimeGr = await this.webdriver.getText(this.nowTvCardDes)
        let cardTimeFormatted = config.getHoursAndMinsFromStr(cardTimeGr[10])
        if (cardTimeFormatted < deviceFormattedTime) {
          break
        } else {
          throw new Error(`The time => ${cardTimeFormatted} is not less then the => ${deviceFormattedTime}`)
        }
      }
      case 'Now': {
        let cardTimeGr = await this.webdriver.getText(this.nowTvCardDes)
        let cardTimeFormatted = config.getHoursAndMinsFromStr(cardTimeGr[10])
        let deviceTimeAndDate = await this.webdriver.getDeviceTime()
        let deviceFormattedTime = deviceTimeAndDate.value.slice(11, 16)
        if (cardTimeFormatted <= deviceFormattedTime) {
          break
        } else {
          throw new Error(`The device time  => ${deviceFormattedTime} does not match the rage of the card time => ${cardTimeFormatted}`)
        }
      }
      case 'Next': {
        let deviceTimeAndDate = await this.webdriver.getDeviceTime()
        let deviceFormattedTime = deviceTimeAndDate.value.slice(11, 16)
        let cardTimeGr = await this.webdriver.getText(this.nowTvCardDes)
        let cardTimeFormatted = config.getHoursAndMinsFromStr(cardTimeGr[10])
        if (cardTimeFormatted >= deviceFormattedTime) {
          break
        } else {
          throw new Error(`The time => ${cardTimeFormatted} is not greater then => ${deviceFormattedTime}`)
        }
      }
    }
  }

  async returnToNow () {
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.UP)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async checkSecondFilter () {
    await this.webdriver.waitForVisible(this.allTVFilter.classMain, config.waitTime.medium)
    await this.webdriver.waitForVisible(this.allTVFilter.selectedItem, config.waitTime.medium)
    let listVisibility = await this.webdriver.isExisting(this.allTVFilter.listItem)
    if (!listVisibility) {
      throw new Error('The side menu did not load')
    }
  }

  async checkSortFilter () {
    await this.webdriver.waitForVisible(this.sortFilterOption, config.waitTime.long)
    let sort = await this.webdriver.isExisting(this.sortFilterOption)
    if (!sort) {
      throw new Error('The sort filter option did not render')
    }
  }

  async checkForLiveEvent () {
    await this.webdriver.waitForVisible(this.player, config.waitTime.long)
    let player = await this.webdriver.isExisting(this.player)
    let playerButtons = await this.webdriver.isExisting(this.playerButtons)
    if (!player || !playerButtons) {
      throw new Error('The player or player buttons did not load')
    }
  }

  async checkChannelsPage () {
    await this.webdriver.waitForVisible(this.channelsPage, config.waitTime.medium)
    let channelsPage = await this.webdriver.isExisting(this.channelsPage)
    if (!channelsPage) {
      throw new Error('the channels page did not load')
    }
  }

  async checkChannelsDetail () {
    await this.webdriver.waitForVisible(this.detailBackgroundImg, config.waitTime.long)
    await this.webdriver.waitForVisible(this.detailEventTitle, config.waitTime.long)
    let detailImg = await this.webdriver.isExisting(this.detailBackgroundImg)
    let detailTitle = await this.webdriver.isExisting(this.detailEventTitle)
    if (!detailImg || !detailTitle) {
      throw new Error('The detail screen image or detail screen title did not load')
    }
  }

  async checkReminder () {
    await this.webdriver.waitForVisible(this.remainderIcon, config.waitTime.medium)
  }

  async enterFirstFilterCheck () {
    await this.webdriver
      .waitForVisible(this.nowFilterScreenTitle, config.waitTime.medium)
      .isExisting(this.nowFilterScreenTitle)
      .isExisting(this.nowFilterNextButton)
      .isExisting(this.nowFilterPreviousButton)
  }

  async filterCheck (type) {
    await this.checkForFilterType(type)
  }

  async selectedFilterCheck (index) {
    await this.webdriver.waitForVisible(this.selectedFilterCard, config.waitTime.long)
    let clickedFilterButton = await this.webdriver.getText(this.selectedFilterCard)
    assert.strictEqual(this.getOptionText, clickedFilterButton[index], `the selected filter => ${this.getOptionText} does not match the clicked button string => ${clickedFilterButton[index]}`)
  }

  async checkRadioFirstFilter () {
    await this.webdriver
      .waitForVisible(this.filterList, config.waitTime.long)
      .isExisting(this.filterTitle)
      .isExisting(this.filterImage)
      .isExisting(this.filterOptionStingray)
      .isExisting(this.filterOptionPop)
      .isExisting(this.filterOptionLocalPop)
  }

  async checkRadioSecondFilter () {
    await this.webdriver
      .waitForVisible(this.filterList, config.waitTime.long)
      .isExisting(this.filterTitle)
      .isExisting(this.filterImage)
      .isExisting(this.secondFilterOptionAz)
      .isExisting(this.secondFilterOptionPos)
      .isExisting(this.secondFilterOptionRec)
  }

  async clickNowFilterTw () {
    await super.pressKeyCodeTimes(config.keyCodes.OK, 2)
    await this.webdriver.waitForVisible(this.nowFilterCard, config.waitTime.medium)
  }

  async clickOnPreviousFilter () {
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.UP)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await this.webdriver.waitForVisible(this.nowFilterCard, config.waitTime.medium)
  }

  async clickOnNextFilter () {
    await this.webdriver.pressKeycode(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, 2)
    await this.webdriver
      .pressKeycode(config.keyCodes.OK)
      .waitForVisible(this.nowFilterCard, config.waitTime.medium)
  }

  async clickOnFilter () {
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
  }

  async clickSpecialFilterOption (Id, times) {
    await this.webdriver.pressKeycode(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.UP, times)
    this.getOptionText = await this.webdriver.getText(`[id="${Id}"]`)
    await this.webdriver.pressKeycode(config.keyCodes.OK)
  }

  async clickOnFilterOption (Id, times) {
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.DOWN, times).then(async () => {
      this.getOptionText = await this.webdriver.getText(`[id="${Id}"]`)
    }).then(async () => {
      await super.pressKeyCodeTimes(config.keyCodes.OK)
    })
      .catch(e => console.error(e))
  }

  /*
  This is the same function as the clickOnFilterOption but this one does one extra step
  because the sort filter is different then the other two
  */
  async clickOnFilterSortOption (Id) {
    await super.pressKeyCodeTimes(config.keyCodes.OK)
    await super.pressKeyCodeTimes(config.keyCodes.UP, 1)
    this.getOptionText = await this.webdriver.getText(`[id="${Id}"]`)
    await super.pressKeyCodeTimes(config.keyCodes.OK)
  }

  async clickOne () {
    await super.pressKeyCodeTimes(config.keyCodes.OK, 2)
  }

  async restartLiveEvent () {
    await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
    await super.pressKeyCodeTimes(config.keyCodes.OK, 1)
  }

  async navigateToFavoritesButton () {
    let stringToMatch = 'START OVER'
    await this.webdriver.waitForVisible(this.playerButtons, config.waitTime.long)
    let watchButton = await this.webdriver.getText('[class="button icon-text"]')
    if (watchButton[0] === stringToMatch || watchButton[0] === 'S') {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 2)
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT, 1)
    }
  }

  async setFavoriteVod () {
    let buttonActive = await this.webdriver.isExisting(this.favoritesButtonActive)
    if (buttonActive) {
      await super.pressKeyCodeTimes(config.keyCodes.OK)
      let buttonInactive = await this.webdriver.isVisible(this.favoritesButtonInactive)
      if (!buttonInactive) {
        throw new Error('The favorite button did not receive click after the button was active and now it should be inactive')
      }
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.OK)
      let buttonActiveAfterClick = await this.webdriver.isExisting(this.favoritesButtonActive)
      if (!buttonActiveAfterClick) {
        throw new Error('The favorite button did not receive click after the button was inactive and now it should be active')
      }
    }
  }

  async serFavoriteGuide () {
    let buttonActive = await this.webdriver.isExisting(this.detailScreen.favoriteButtonActive)
    if (buttonActive) {
      await super.pressKeyCodeTimes(config.keyCodes.OK)
      let buttonInactive = await this.webdriver.isExisting(this.detailScreen.favoriteButtonInactive)
      if (!buttonInactive) {
        throw new Error('the favorite button did not change to inactive form active')
      }
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.OK)
      let buttonActiveClicked = await this.webdriver.isExisting(this.detailScreen.favoriteButtonActive)
      if (!buttonActiveClicked) {
        throw new Error('the favorite button did not change to active form inactive')
      }
    }
  }

  async serFavoriteGuideCheck () {
    let active = await this.webdriver.isExisting(this.detailScreen.favoriteButtonActive)
    let inactive = await this.webdriver.isExisting(this.detailScreen.favoriteButtonInactive)
    if (!active && !inactive) {
      throw new Error('the favorite button did not change state')
    }
  }

  async checkButtonActive () {
    await this.webdriver.isExisting(this.favoritesButtonActive)
  }

  async checkAllColumns () {
    let first = await this.webdriver.isVisible(this.firstColumn)
    let second = await this.webdriver.isVisible(this.secondColumn)
    let third = await this.webdriver.isVisible(this.thirdColumn)
    let forth = await this.webdriver.isVisible(this.fourthColumn)
    if (!first || !second || !third || !forth) throw new Error('One of the columns is not visible')
  }

  async guideCheck () {
    let guideSelected = await this.webdriver.isVisible(this.guideSelected)
    if (!guideSelected) throw new Error('the guide did not load')
  }

  async checkArrow () {
    await this.webdriver.waitForVisible(this.arrow, config.waitTime.medium)
  }

  async pastOrFutureSelect () {
    let random = Math.floor(Math.random() * 2)
    if (random === 1) {
      await super.pressKeyCodeTimes(config.keyCodes.UP, config.randomNumber)
    } else {
      await super.pressKeyCodeTimes(config.keyCodes.DOWN, config.randomNumber)
    }
  }
  // menjace se boje po aplikaciji
  async checkRadioCard () {
    await super.pressKeyCodeTimes(config.keyCodes.DOWN)
    await this.webdriver.waitForVisible(this.cardRadio, config.waitTime.medium)
    for (let i = 0; i < config.bigRandomNumber; i++) {
      await super.pressKeyCodeTimes(config.keyCodes.RIGHT)
        .then(await this.webdriver.waitForVisible(this.cardRadio, config.waitTime.medium))
        .then(async () => {
          let backgroundColor = await this.webdriver.$(this.cardRadio).$(this.cardRadioDescription).getCssProperty('background-color')
          let txtColor = await this.webdriver.$(this.cardRadio).getCssProperty('background-color')
          if (backgroundColor.parsed.hex !== this.colors.blue || txtColor.parsed.hex !== this.colors.white) {
            throw new Error('The background color or txt color does not match')
          }
        }).catch(e => console.log(e))
    }
  }
}

module.exports = ChannelsPage
