// const  CucumberJSAllureFormatter = require('cucumberjs-allure2-reporter').CucumberJSAllureFormatter
// const AllureRuntime = require('cucumberjs-allure2-reporter').AllureRuntime
// const RunConfig = require('cucumberjs-allure2-reporter').CucumberJSAllureFormatterConfig
// import {CucumberJSAllureFormatter, AllureRuntime} from 'cucumberjs-allure2-reporter'
//
// class Reporter extends CucumberJSAllureFormatter {
//   constructor(options) {
//     super(
//       options,
//       AllureRuntime({ resultsDir: "./out/allure-results" }),
//       RunConfig({labels:{
//         feature: [/@all_env/]
//         }})
//     )
//   }
// }
//
// module.exports = Reporter

// const CucumberJSAllureFormatter = require('cucumberjs-allure2-reporter').CucumberJSAllureFormatter
// const AllureRuntime = require('cucumberjs-allure2-reporter').AllureRuntime
//
// class Reporter extends CucumberJSAllureFormatter {
//   constructor (options) {
//     super(
//       options,
//       AllureRuntime({ resultsDir: './allure-results' }),
//       {
//         labels: {
//           feature: [/@all_env/]
//         }
//       })
//   }
// }
//
// module.exports = Reporter