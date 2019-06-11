const explicitWait = (ms) => new Promise((resolve) => setTimeout(() => {
  resolve()
}, ms))

class Page {
  constructor (webdriver) {
    this.webdriver = webdriver
  }

  // Page helpers
  async pressKeyCodeTimes (keyCode, timesToPress, wait) {
    timesToPress = timesToPress === undefined || timesToPress === '' ? 1 : timesToPress
    wait = wait === undefined || wait === '' ? 600 : wait
    if (timesToPress === 0) {
      return
    }
    if (keyCode === undefined) {
      throw new Error('The keyCode is not defined!!')
    }
    for (let i = 0; i < timesToPress; i++) {
      await this.webdriver.pressKeycode(keyCode)
      if (wait) {
        await explicitWait(wait)
      }
    }
  }
}

module.exports = Page
