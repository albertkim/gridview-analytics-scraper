// This script will go through each scraped json file and identify which ones are possibly related to rezonings or not. It will then parse through each out and produce a final output file.
const fs = require('fs')
const path = require('path')
const {
  downloadPDF,
  generateOnlyTextBasedPDF,
  generatePDF,
  parsePDF,
  chatGPTDataQuery,
  chatGPTTextQuery
} = require('./utilities')

// Change between the test data and the complete master data
const masterJSON = require('../index.json')
// const masterJSON = require('./test.json')

async function main() {

  const filteredJSON = []

  for (const item of masterJSON) {
  
    // BC as a province does not have rezonings
    if (item.city === 'BC') {
      return
    }
  
    if (item.city === 'Vancouver') {
      if (item.title.includes('Rezoning:')) {
        if (item.reportUrls.length > 0) {
          const firstPDFURL = item.reportUrls[0].url
          const pdfData = await downloadPDF(firstPDFURL)
          const pdf3pages = await generatePDF(pdfData, 3)
          const parsedPDF = await parsePDF(pdf3pages)

          const gptTextReply = await chatGPTTextQuery(`
            Read this document and give me the following in a JSON format:
            {
              address: address in question, if multiple addresses, comma separate
              applicant: who the rezoning applicant is
              description: a description of the rezoning and what the applicant wants to build - be specific
              type: one of single-family residential, townhouse, mixed use, multi-family residential, industrial, commercial, or other
              stats: {
                number of buildings: your best guess as to the number of new buildings being proposed
                strata: number of residential units that can be owned or null if unclear - default to assuming strata units if not specified
                rental: number of rental units or null if unclear - do not default to rental if not specified
                hotel: number of hotel units or null if unclear - do not default to hotel if not specified
                fsr: floor space ratio or null if unclear
                height: height in meters or null if unclear
              }
              status: either applied, pending, public hearing, approved, denied, withdrawn
              date: date of this document in YYYY-MM-DD format
            }
            If this document is not a rezoning, please reply with "not rezoning". Document here: ${parsedPDF.text}
          `)
          const replyData = JSON.parse(gptTextReply.choices[0].message.content)
          console.log(replyData)
          if (!replyData.error) {
            filteredJSON.push({
              city: 'Vancouver',
              ...replyData
            })
          }
        }
      }
    }
  
  }

  console.log(`Writing file...`)
  fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(filteredJSON, null, 2), 'utf8')
  console.log(`File saved`)

}

main()
