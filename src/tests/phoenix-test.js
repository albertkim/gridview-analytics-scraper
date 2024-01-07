const fs = require('fs')
const path = require('path')
const {
  downloadPDF,
  generatePDF,
  generatePDFTextArray,
  chatGPTTextQuery
} = require('../utilities')

const bylawUrl = 'https://www.phoenix.gov/cityclerksite/City%20Council%20Meeting%20Files/1-3-24%20Formal%20Agenda%20-%20FINAL.pdf'

const minutesUrl = 'https://www.phoenix.gov/cityclerksite/City%20Council%20Meeting%20Files/1-3-24%20Formal%20Results.pdf'

// First, read the minutes (results) of the formal meeting and catalog the approvals and denials
async function parseMinutes() {
  const minutesPDFData = await downloadPDF(minutesUrl)
  const minuteTextArray = await generatePDFTextArray(minutesPDFData)

  const gptTextReply = await chatGPTTextQuery(`
    Read this document and give me the following in a JSON format, but only for items that are rezoning applications:
    {
      items: [
        {
          item: full item description
          status: one of approved, denied, or pending (for everything else)
        }
      ]
    }
    
    Here is the document: ${minuteTextArray.join(` `)}
  `)

  const replyData = JSON.parse(gptTextReply.choices[0].message.content).items
  console.log(replyData)

  return replyData
}

// Then read the agenda for retails
async function parseAgenda(minutesArray) {

  const pdfData = await downloadPDF(bylawUrl)
  const pdf = await generatePDF(pdfData, {
    minCharacterCount: 10,
    expectedWords: ['Report', 'Request', 'Rezone', 'formal']
  })

  fs.writeFileSync(path.join(__dirname, 'phoenix-test.pdf'), pdf)

  const pdfTextOnlyData = await generatePDFTextArray(pdf)

  const rezoningJSON = []

  for (const text of pdfTextOnlyData) {
    const gptTextReply = await chatGPTTextQuery(`
      Given the document date of 2024-01-03 and given the following meeting minutes of what was approved and denied:

      ${JSON.stringify(minutesArray)}

      Read the following meeting agenda document and give me the following in a JSON format:
      {
        address: address in question - if multiple addresses, comma separate
        applicant: who the rezoning applicant is - if behalf exists, do not mention behalf
        behalf: if the applicant is applying on behalf of someone else, who is it
        description: a description of the rezoning and what the applicant wants to build - be specific
        type: one of single-family residential, townhouse, mixed use, multi-family residential, industrial, commercial, or other
        stats: {
          buildings: your best guess as to the number of new buildings being proposed
          strata: total number of residential units that can be owned or null if unclear - default to assuming strata units if not specified
          rental: total number of rental units or null if unclear - do not default to rental if not specified
          hotel: total number of hotel units or null if unclear - do not default to hotel if not specified
          fsr: total floor space ratio or null if unclear
          height: height in meters or null if unclear
        }
        zoning: {
          previousZoningCode: city zoning code before rezoning or null if unclear
          previousZoningDescription: best description of previous zoning code (ex. low density residential)
          newZoningCode: city zoning code after rezoning or null if unclear
          newZoningDescription: best description of new zoning code (ex. high density residential)
        }
        status: either applied, pending, public hearing, approved, denied, withdrawn
        dates: {
          appliedDate: if this is an application, the date of this document in YYYY-MM-DD or null if unclear
          publicHearingDate: if this is for a public hearing, the date of this document in YYYY-MM-DD or null if unclear
          approvalDate: if this is an approval, the date of this document in YYYY-MM-DD or null if unclear
          denialDate: if this is a denial, the date of this document in YYYY-MM-DD or null if unclear
          withdrawnDate: if this is a withdrawal, the date of this document in YYYY-MM-DD or null if unclear
        }
      }
      If this document is not a rezoning related document, please reply with "not rezoning". Document here: ${text}
    `)
    const replyData = JSON.parse(gptTextReply.choices[0].message.content)
    console.log(replyData)
    if (!replyData.error) {
      rezoningJSON.push(replyData)
    }
  }

  fs.writeFileSync(path.join(__dirname, 'phoenix-parsed.json'), JSON.stringify(rezoningJSON, null, 2))

}

async function main() {
  const minutesArray = await parseMinutes()
  // Shorten unnecessary text from minutes array
  minutesArray.forEach((m) => {
    m.item = m.item.replace('Amend City Code - Ordinance Adoption - ', '')
  })
  await parseAgenda(minutesArray)
}

main()
