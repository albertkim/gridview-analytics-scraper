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

// This dataset includes an application and a public hearing to test data merging
const scrapedNewsJSON = require('../index.json')
// const scrapedNewsJSON = [
//   {
//     "city": "Vancouver",
//     "metroCity": "Metro Vancouver",
//     "date": "2023-11-14",
//     "url": "https://council.vancouver.ca/20231114/regu20231114ag.htm",
//     "minutesUrl": "https://council.vancouver.ca/20231114/regu20231114ag.htm",
//     "meetingType": "Council meeting",
//     "resolutionId": null,
//     "title": "Rezoning: 2231-2247 East 41st Avenue",
//     "contents": null,
//     "reportUrls": [
//       {
//         "title": "Referral Report",
//         "url": "https://council.vancouver.ca/20231114/documents/rr3.pdf"
//       }
//     ]
//   },
//   {
//     "city": "Vancouver",
//     "metroCity": "Metro Vancouver",
//     "date": "2023-12-14",
//     "url": "https://council.vancouver.ca/20231214/phea20231214ag.htm",
//     "minutesUrl": "https://council.vancouver.ca/20231214/phea20231214ag.htm",
//     "meetingType": "Public Hearing",
//     "resolutionId": null,
//     "title": "Rezoning: 2231-2247 East 41st Avenue",
//     "contents": null,
//     "reportUrls": [
//       {
//         "title": "Summary and Recommendation",
//         "url": "https://council.vancouver.ca/20231214/documents/phea1sr.pdf"
//       },
//       {
//         "title": "Referral Report dated October 31, 2023",
//         "url": "https://council.vancouver.ca/20231114/documents/rr3.pdf"
//       },
//       {
//         "title": "Draft By-law - Zoning and Development",
//         "url": "https://council.vancouver.ca/20231214/documents/phea1ZD.pdf"
//       },
//       {
//         "title": "Staff Presentation",
//         "url": "https://council.vancouver.ca/20231214/documents/phea1ppt.pdf"
//       },
//       {
//         "title": "Video Clip of this Item",
//         "url": "https://csg001-harmony.sliq.net/00317/Harmony/en/PowerBrowser/PowerBrowserV2/20231218/-1/20458?mediaStartTime=20231214130000&mediaEndTime=20231214133510&viewMode=3"
//       }
//     ]
//   }
// ]

const rezoningJSON = require('./index.json')
// let rezoningJSON = []

const gptQueryBaseStructore = `
  Read this document and give me the following in a JSON format:
  {
    address: address in question, if multiple addresses, comma separate
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
    status: either applied, pending, public hearing, approved, denied, withdrawn
    dates: {
      appliedDate: if this is an application, the date of this document in YYYY-MM-DD or null if unclear
      publicHearingDate: if this is for a public hearing, the date of this public hearing in YYYY-MM-DD or null if unclear
      approvalDate: if this is an approval, the date of this approval in YYYY-MM-DD or null if unclear
      denialDate: if this is a denial, the date of this denial in YYYY-MM-DD or null if unclear
      withdrawnDate: if this is a withdrawal, the date of this withdrawal in YYYY-MM-DD or null if unclear
    }
  }
  If this document is not a rezoning related document, please reply with "not rezoning". Document here: 
`

function mergeEntries(oldEntry, newEntry) {
  const mergedData = {...oldEntry}

  function mergeField(fieldName) {
    if (Array.isArray(newEntry[fieldName]) && Array.isArray(oldEntry[fieldName])) {
      // Merge arrays of strings and dedupe
      const oldStrings = oldEntry[fieldName]
      const mergedArray = [...oldStrings]
      for (const newString of newEntry[fieldName]) {
        if (!oldStrings.includes(newString)) {
          mergedArray.push(newString);
        }
      }
      mergedData[fieldName] = mergedArray
    } else if (newEntry[fieldName] !== null && (oldEntry[fieldName] === null || oldEntry[fieldName] === undefined)) {
      // Keep the new value if old is null or undefined
      mergedData[fieldName] = newEntry[fieldName]
    } else if (newEntry[fieldName] !== null && newEntry[fieldName] !== oldEntry[fieldName]) {
      // Warn if values are different
      console.warn(`Warning: Field '${fieldName}' has different values in old and new data. Keeping the old value.`)
    }
  }

  function mergeUrlsField(fieldName) {
    if (Array.isArray(newEntry[fieldName]) && Array.isArray(oldEntry[fieldName])) {
      // Merge arrays of objects and dedupe based on the 'url' property
      const oldUrls = oldEntry[fieldName].map(obj => obj.url)
      const mergedArray = [...oldEntry[fieldName]]
      for (const newObj of newEntry[fieldName]) {
        if (!oldUrls.includes(newObj.url)) {
          mergedArray.push(newObj)
        }
      }
      mergedData[fieldName] = mergedArray
    }
  }

  function prioritizeStatus(oldStatus, newStatus) {
    const statusOrder = ['applied', 'pending', 'public hearing', 'approved', 'denied', 'withdrawn']
    return statusOrder.indexOf(newStatus) > statusOrder.indexOf(oldStatus) ? newStatus : oldStatus
  }

  mergeField('address')
  mergeField('applicant')
  mergeField('behalf')
  mergeField('description')
  mergeField('type')

  mergeUrlsField('urls')
  mergeField('minutesUrls')

  if (newEntry.stats) {
    mergeField('stats.buildings')
    mergeField('stats.strata')
    mergeField('stats.rental')
    mergeField('stats.hotel')
    mergeField('stats.fsr')
    mergeField('stats.height')
  }

  if (newEntry.status !== null) {
    mergedData.status = prioritizeStatus(oldEntry.status, newEntry.status)
  }

  if (newEntry.dates) {
    mergeField('dates.appliedDate')
    mergeField('dates.publicHearingDate')
    mergeField('dates.approvalDate')
    mergeField('dates.denialDate')
    mergeField('dates.withdrawnDate')
  }

  return mergedData
}

async function main() {

  for (const news of scrapedNewsJSON) {
  
    // BC as a province does not have rezonings
    if (news.city === 'BC') {
      break
    }
  
    if (news.city === 'Vancouver' && news.title.includes('Rezoning:')) {
      if (news.reportUrls.length > 0) {
        const firstPDFURL = news.reportUrls[0].url
        const pdfData = await downloadPDF(firstPDFURL)
        const pdf3pages = await generatePDF(pdfData, 3)
        const parsedPDF = await parsePDF(pdf3pages)
        const gptTextReply = await chatGPTTextQuery(gptQueryBaseStructore + parsedPDF.text)
        const replyData = JSON.parse(gptTextReply.choices[0].message.content)
        console.log(replyData)
        if (!replyData.error) {
          const newData = {
            city: 'Vancouver',
            urls: news.reportUrls,
            minutesUrls: news.minutesUrl ? [news.minutesUrl] : [],
            resolutionId: news.resolutionId,
            ...replyData
          }

          const matchingItem = rezoningJSON
            .find((item) => item.city === newData.city && item.address === replyData.address)

          if (matchingItem) {
            const matchingItemIndex = rezoningJSON.indexOf(matchingItem)
            rezoningJSON[matchingItemIndex] = mergeEntries(matchingItem, newData)
          } else {
            rezoningJSON.push(newData)
          }
        }
      }
    }

    if (news.city === 'Richmond' &&
      news.title.toLowerCase().includes('rezoning') &&
      news.title.toLowerCase().includes('application')) {
      if (news.reportUrls.length > 0) {
        const firstPDFURL = news.reportUrls[0].url
        const pdfData = await downloadPDF(firstPDFURL)
        const pdf3pages = await generatePDF(pdfData, 3)
        const parsedPDF = await parsePDF(pdf3pages)
        const gptTextReply = await chatGPTTextQuery(gptQueryBaseStructore + parsedPDF.text)
        const replyData = JSON.parse(gptTextReply.choices[0].message.content)
        console.log(replyData)
        if (!replyData.error) {
          const newData = {
            city: 'Richmond',
            urls: news.reportUrls,
            minutesUrls: news.minutesUrl ? [news.minutesUrl] : [],
            resolutionId: news.resolutionId,
            ...replyData
          }

          // Search if exists in the master JSON file. If exists, replace. If not, add
          const matchingItem = rezoningJSON
            .find((item) => item.city === newData.city && item.address === replyData.address)

          if (matchingItem) {
            const matchingItemIndex = rezoningJSON.indexOf(matchingItem)
            rezoningJSON[matchingItemIndex] = mergeEntries(matchingItem, newData)
          } else {
            rezoningJSON.push(newData)
          }
        }
      }
    }
  
  }

  console.log(`Writing file...`)
  fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(rezoningJSON, null, 2), 'utf8')
  console.log(`File saved`)

}

main()
