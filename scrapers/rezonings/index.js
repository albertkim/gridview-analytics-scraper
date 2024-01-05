// This script will go through each scraped json file and identify which ones are possibly related to rezonings or not. It will then parse through each out and produce a final output file.
const fs = require('fs')
const path = require('path')
const { downloadPDF, generatePDF, chatGPTDataQuery } = require('./utilities')

// Change between the test data and the complete master data
// const masterJSON = require('../index.json')
const masterJSON = require('./test.json')

async function main() {

  const filteredJSON = []

  for (const item of masterJSON) {
  
    // BC as a province does not have rezonings
    if (item.city === 'BC') {
      return
    }
  
    if (item.city === 'Vancouver') {
      if (item.title.includes('Rezoning:')) {
        let firstPDFSummary = null
        if (item.reportUrls.length > 0) {
          const firstPDFURL = item.reportUrls[0].url
          const pdfData = await downloadPDF(firstPDFURL)
          const pdf3pages = await generatePDF(pdfData, 3)
          const gptReply = await chatGPTDataQuery(`
            Read this document and give me the following in a JSON format:
            {
              address: address in question, if multiple addresses, comma separate
              applicant: who the rezoning applicant is
              description: a description of the rezoning and what the applicant wants to build
              status: either applied, pending, public hearing, approved, denied, withdrawn
              date: date of this document
            }
          `, pdf3pages)
          console.log(gptReply)
        }
        filteredJSON.push(item)
      }
    }
  
  }

  console.log(`Writing file...`)
  fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(filteredJSON, null, 2), 'utf8')
  console.log(`File saved`)

}

main()
