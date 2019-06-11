const { BeforeAll, Before, After, AfterAll } = require('cucumber')
const config = require('../config/config')
const driver = require('webdriverio')
const ChannelsPage = require('./pages/channelsPage')
const HomePage = require('./pages/homePage')
const MainPage = require('../support/pages/mainPage')
const OnDemandPage = require('./pages/onDemandPage')
const MyLibraryPageReminders = require('./pages/myLibraryPageReminders')
const MyLibraryPageFavorites = require('./pages/myLibraryPageFavorites')
const MyLibraryPageCommon = require('./pages/myLibraryPageCommon')
const PlayerPage = require('./pages/playerPage')
const Page = require('../support/pages/page')
const SettingsPage = require('../support/pages/settingsPage')
const RadioPage = require('../support/pages/radioPage')
const VodPlayerPage = require('../support/pages/vodPlayerPage')
const BlockedChannelsPage = require('./pages/blockedChannelsPage')
const GuideContinuousListOfEvents = require('./pages/guideContinuousListOfEvents')
const PinProtectedEvent = require('../support/pages/pinProtectedEventPage')
const DisableMoreLikeThis = require('../support/pages/disableMoreLikeThisPage')
const MemoryProfilingPage = require('./pages/memoryProfilingPage')
const Logger = require('logplease')
const _ = require('lodash')
const TestData = require('../support/testData')

let applicationPath = process.argv[4] // node process
let terminalResponse = JSON.parse(applicationPath).applicationLocation

const opts = {
  port: 4723,
  desiredCapabilities: {
    'platformName': 'Android',
    'platformVersion': '8.0.0',
    'deviceName': 'KSTB6020',
    'app': TestData.load(terminalResponse),
    'newCommandTimeout': 3600,
    'unicodeKeyboard': true,
    'resetKeyboard': true,
    'noReset': true,
    'adbExecTimeout': 50000
  }
}

const webdriver = driver.remote(opts)

client = {}
const logger = Logger.create(
  'test',
  { filename: 'eonBoxTestLog.log', appendFile: true }
)

BeforeAll(async function () {
  logger.info('initialize test run...')
  await webdriver.init()
})

Before(async function (scenario) {
  // logger.debug(`Before scenario ${scenario.pickle.name}`)
  async function returnContext () {
    await setTimeout(function () {
      webdriver.contexts()
    }, 20000)
    return webdriver.contexts()
  }

  const allContexts = await returnContext()
  await webdriver.context(allContexts.value[1])
  client.onDemandPage = new OnDemandPage(webdriver)
  client.mainPage = new MainPage(webdriver)
  client.homePage = new HomePage(webdriver)
  client.channelsPage = new ChannelsPage(webdriver)
  client.playerPage = new PlayerPage(webdriver)
  client.page = new Page(webdriver)
  client.settingsPage = new SettingsPage(webdriver)
  client.radioPage = new RadioPage(webdriver)
  client.vodPlayerPage = new VodPlayerPage(webdriver)
  client.myLibraryPageReminders = new MyLibraryPageReminders(webdriver)
  client.myLibraryPageFavorites = new MyLibraryPageFavorites(webdriver)
  client.myLibraryPageCommon = new MyLibraryPageCommon(webdriver)
  client.blockedChannelsPage = new BlockedChannelsPage(webdriver)
  client.guideContinuousListOfEvents = new GuideContinuousListOfEvents(webdriver)
  client.pinProtectedEvent = new PinProtectedEvent(webdriver)
  client.disableMoreLikeThis = new DisableMoreLikeThis(webdriver)
  client.memoryProfilingPage = new MemoryProfilingPage(webdriver)
  this.client = client
  this.logger = logger
  this.logger.info(`Start test: ${scenario.pickle.name}`)
})

After('@tutorial', async function () {
  console.log('This is a tutorial scenario, no special key will be pressed at the end')
})

After('@sanity', async function () {
  await config.sendCustomKey(config.specialKeyCodes.EON)
})

After(async function (scenario) {
  this.logger.info(`Scenario '${scenario.pickle.name}' ${scenario.result.status}!`)
})

AfterAll(async function () {
  await webdriver.end()
})
