const fs = require('fs')
const path = require('path')
const {
  downloadPDF,
  generatePDFTextArray,
  chatGPTTextQuery
} = require('../utilities')

const bylawUrl = 'https://council.vancouver.ca/20231212/documents/bylaws1to27.pdf'

async function main() {

  const pdfData = await downloadPDF(bylawUrl)
  const pdfTextOnlyData = await generatePDFTextArray(pdfData, {
    minCharacterCount: 10,
    expectedWords: ['Explanation', 'rezon']
  })

  for (const text of pdfTextOnlyData) {
    const gptTextReply = await chatGPTTextQuery(`
      Given the following raw text from a PDF, identify the sections that relate to approving a rezoning, ignore the rest, and identify the following in json format:
      {
        address: address in question - if multiple addresses in the same section comma separate
        status: one of approved or denied
        date: date in YYYY-MM-DD format
      }
      Here is the data: ${text}
    `)
    const replyData = JSON.parse(gptTextReply.choices[0].message.content)
    console.log(replyData)
  }

}

main()
