import { IMeetingDetail } from '../../../repositories/RawRepository'
import { chatGPTJSONQuery } from '../../../utilities/AIUtilities'
import { FullRecord } from '../../../repositories/FullRecord'
import { parsePDFAsRawArray } from '../../../utilities/PDFUtilitiesV2'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'

interface IBylawData {
  address: string
}

// If all of these words are included in the news title, it's likely a rezoning withdrawal
const withdrawalWords = ['rezon', 'withdraw']

// Vancouver rezoning withdrawals are not under the 'By-law' title entries
export function checkIfBylaw(news: IMeetingDetail) {
  const isVancouver = news.city === 'Vancouver'
  const isCouncil = ['council', 'regular council']
    .some((match) => news.meetingType.toLowerCase() === match)
  const isBylaw = news.title === 'By-laws'
  const isWithdrawal = withdrawalWords.every((word) => news.title.toLowerCase().includes(word))
  return isVancouver && isCouncil && (isBylaw || isWithdrawal)
}

// Bylaw: https://council.vancouver.ca/20231114/documents/bylaws1-19_000.pdf
// Withdrawal example: https://council.vancouver.ca/20231003/regu20231003ag.htm
export async function parseBylaw(news: IMeetingDetail): Promise<FullRecord[]> {

  // Check to see if the item is a withdrawal
  if (withdrawalWords.every((word) => news.title.toLowerCase().includes(word))) {
    const bylawDetail = await getAddressObject(news.title)
    if (bylawDetail && bylawDetail.address) {
      const record = new FullRecord({
        city: 'Vancouver',
        metroCity: 'Metro Vancouver',
        type: 'rezoning',
        applicationId: null,
        address: bylawDetail.address,
        status: 'withdrawn',
        dates: {
          appliedDate: null,
          publicHearingDate: null,
          approvalDate: null,
          denialDate: null,
          withdrawnDate: news.date
        },
        reportUrls: [
          {
            date: news.date,
            title: 'By-laws',
            url: news.url,
            status: 'withdrawn'
          }
        ],
        minutesUrls: news.minutesUrl ? [{
          date: news.date,
          url: news.minutesUrl,
          status: 'withdrawn'
        }] : []
      })

      return [record]
    }
  }

  // Otherwise iterate through bylaw PDF and get details
  try {

    // Parse each bylaw URL pdf - each URL pdf may contain multiple rezoning approvals, one on each page
    const bylawPDFPages: {url: string, text: string}[] = []
    const bylawPDFUrls = news.reportUrls.map((urlObject) => urlObject.url)
    for (const bylawPDFURL of bylawPDFUrls) {
      const pdfTextArray = await parsePDFAsRawArray(bylawPDFURL, {
        minCharacterCount: 10,
        expectedWords: ['explanation', 'rezon', 'housing agreement']
      })

      bylawPDFPages.push(...pdfTextArray.map((text) => {
        return {
          url: bylawPDFURL,
          text
        }
      }))
    }

    // For each page, analyze rezonings, then return thee final array
    const finalRecords: FullRecord[] = []

    for (const page of bylawPDFPages) {

      const response = await AIGetPartialRecords(page.text, {
        expectedWords: [], // Vancouver does not have rezoning IDs for some reason
        fieldsToAnalyze: ['status'],
        status: 'one of "approved", "denied", or "withdrawn"'
      })

      if (!response || response.length === 0) {
        console.log(`Error parsing bylaw page: ${page.url}`)
      }

      const records = response
        .filter((record) => !!record.status) // Make sure status exists
        .map((record) => {
          return new FullRecord({
            city: 'Vancouver',
            metroCity: 'Metro Vancouver',
            type: 'rezoning',
            applicationId: null,
            address: record.address,
            applicant: record.applicant,
            behalf: record.behalf,
            description: record.description,
            buildingType: record.buildingType,
            status: record.status!,
            dates: {
              appliedDate: null,
              publicHearingDate: null,
              approvalDate: record.status == 'approved' ? news.date : null,
              denialDate: record.status === 'denied' ? news.date : null,
              withdrawnDate: record.status === 'withdrawn' ? news.date : null
            },
            reportUrls: news.reportUrls.map((urlObject) => {
              return {
                date: news.date,
                title: urlObject.title,
                url: urlObject.url,
                status: record.status!
              }
            }),
            minutesUrls: news.minutesUrl ? [{
              date: news.date,
              url: news.minutesUrl,
              status: record.status!
            }] : []
          })
        })
      
      finalRecords.push(...records)

    }

    return finalRecords

  } catch (error) {
    console.error(error)
    return []
  }

}

async function getAddressObject(text: string): Promise<IBylawData | null> {
  let bylawDetailRaw = await chatGPTJSONQuery(`
    Read the provided text and find the street address in question with the following JSON format. Do not include city or postal code. If no address is found, return a {error: message, reason: string}.
    {
      address: address in question, if multiple addresses comma separate
    }
    Here is the text: ${text}
  `)
  if (!bylawDetailRaw || !bylawDetailRaw.address || bylawDetailRaw.error) {
    return null
  }

  const bylawDetail = bylawDetailRaw as IBylawData
  return bylawDetail
}
