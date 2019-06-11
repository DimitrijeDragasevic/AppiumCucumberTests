const fs = require('fs')
// const BYTES = 1024 * 1024

const REPORT_FILE_RELATIVE_PATH = 'report/report.json'

function writeInFile (newData) {
  /* const writeStream = fs.createWriteStream('report/report.txt')
    data.forEach((item) => {
      const memory = item.value
      writeStream.write(`time: ${item.time} // jsHeapSizeLimit: ${Math.round(memory.jsHeapSizeLimit / BYTES)}MB // totalJSHeapSize: ${Math.round(memory.totalJSHeapSize / BYTES)}MB // usedJSHeapSize: ${Math.round(memory.usedJSHeapSize / BYTES)}MB\n`, 'utf8')
    }) */

  /* fs.exists(REPORT_FILE_RELATIVE_PATH, function (exists) {
        if (exists) {
            fs.readFile(REPORT_FILE_RELATIVE_PATH, function readFileCallback (error, fileData) {
                if (error) {
                    console.log(error)
                } else {
                    const dataParsed = JSON.parse(fileData)
                    const dataAppended = dataParsed.concat(newData)
                    writeFile(REPORT_FILE_RELATIVE_PATH, dataAppended)
                }
            });
        } else {
            writeFile(REPORT_FILE_RELATIVE_PATH, newData)
        }
    }); */

  writeFile(REPORT_FILE_RELATIVE_PATH, newData)
}

function writeFile (fileUrl, data) {
  const jsonData = JSON.stringify(data)
  fs.writeFileSync(fileUrl, jsonData)
}

module.exports.writeInFile = writeInFile
