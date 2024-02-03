import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, ZoningStatus } from '../../../repositories/RecordsRepository'
import { chatGPTJSONQuery } from '../../AIUtilities'
import { downloadPDF, generatePDFTextArray } from '../../PDFUtilities'
import { generateID } from '../../../repositories/GenerateID'

interface IBylawData {
  address: string
}

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

export async function parseBylaw(news: IMeetingDetail): Promise<IFullRezoningDetail[]> {

  const fullRezoningDetails: IFullRezoningDetail[] = []

  // Check for withdrawals
  if (withdrawalWords.every((word) => news.title.toLowerCase().includes(word))) {
    const bylawDetailRaw = await getAddressObject(news.title)
    if (bylawDetailRaw && bylawDetailRaw.address) {
      const bylawDetail = bylawDetailRaw as IBylawData
      const fullRezoningDetail: IFullRezoningDetail = {
        id: generateID('rez'),
        type: 'rezoning',
        address: bylawDetail.address,
        city: news.city,
        metroCity: news.metroCity,
        applicationId: null,
        applicant: null,
        behalf: null,
        description: '',
        buildingType: null,
        reportUrls: [
          {
            date: news.date,
            title: 'By-laws',
            url: news.url,
            status: 'withdrawn'
          }
        ],
        zoning: {
          previousZoningCode: null,
          previousZoningDescription: null,
          newZoningCode: null,
          newZoningDescription: null
        },
        minutesUrls: news.minutesUrl ? [{
          date: news.date,
          url: news.minutesUrl,
          status: 'withdrawn'
        }] : [],
        stats: {
          buildings: null,
          stratas: null,
          rentals: null,
          hotels: null,
          fsr: null,
          storeys: null
        },
        status: 'withdrawn',
        dates: {
          appliedDate: null,
          publicHearingDate: null,
          approvalDate: null,
          denialDate: null,
          withdrawnDate: news.date
        },
        location: {
          latitude: null,
          longitude: null
        },
        createDate: moment().format('YYYY-MM-DD'),
        updateDate: moment().format('YYYY-MM-DD')
      }
      fullRezoningDetails.push(fullRezoningDetail)
      return fullRezoningDetails
    }
  }

  try {

    // Parse each bylaw URL pdf - each URL pdf may contain multiple rezoning approvals, one on each page
    const bylawPDFPages: {url: string, text: string}[] = []
    const bylawPDFUrls = news.reportUrls.map((urlObject) => urlObject.url)
    for (const bylawPDFURL of bylawPDFUrls) {
      const pdfData = await downloadPDF(bylawPDFURL)
      const pdfTextOnlyData = await generatePDFTextArray(pdfData, {
        minCharacterCount: 10,
        expectedWords: ['explanation', 'rezon', 'housing agreement']
      })
      bylawPDFPages.push(...pdfTextOnlyData.map((text) => {
        return {
          url: bylawPDFURL,
          text
        }
      }))
    }

    // For each page, analyze rezonings
    for (const page of bylawPDFPages) {

      const bylawDetailRaw = await getAddressObject(page.text)

      if (!bylawDetailRaw) {
        continue
      }

      const bylawDetail = bylawDetailRaw as IBylawData

      // Figure out if approved, denied, or withdrawn
      let status: ZoningStatus = 'approved'
      const approvedWords = ['enact', 'amend', 'approved', 'passed', 'adopted']
      const deniedWords = ['abandonment', 'defeated', 'denied', 'rejected', 'refused']
      const withdrawnWords = ['withdraw']
      // if (approvedWords.some((word) => page.text.toLowerCase().includes(word))) status = 'approved'
      if (deniedWords.some((word) => page.text.toLowerCase().includes(word))) status = 'denied'
      if (withdrawnWords.some((word) => page.text.toLowerCase().includes(word))) status = 'withdrawn'

      const fullRezoningDetail: IFullRezoningDetail = {
        id: generateID('rez'),
        type: 'rezoning',
        address: bylawDetail.address,
        city: news.city,
        metroCity: news.metroCity,
        applicationId: null,
        applicant: null,
        behalf: null,
        description: '',
        buildingType: null,
        reportUrls: [
          {
            date: news.date,
            title: 'By-laws',
            url: page.url,
            status: status
          }
        ],
        zoning: {
          previousZoningCode: null,
          previousZoningDescription: null,
          newZoningCode: null,
          newZoningDescription: null
        },
        minutesUrls: news.minutesUrl ? [{
          date: news.date,
          url: news.minutesUrl,
          status: status
        }] : [],
        stats: {
          buildings: null,
          stratas: null,
          rentals: null,
          hotels: null,
          fsr: null,
          storeys: null
        },
        status: status,
        dates: {
          appliedDate: null,
          publicHearingDate: null,
          approvalDate: news.date,
          denialDate: null,
          withdrawnDate: null
        },
        location: {
          latitude: null,
          longitude: null
        },
        createDate: moment().format('YYYY-MM-DD'),
        updateDate: moment().format('YYYY-MM-DD')
      }
      fullRezoningDetails.push(fullRezoningDetail)
    }

    return fullRezoningDetails

  } catch (error) {
    console.error(error)
    return fullRezoningDetails
  }

}

async function getAddressObject(text: string): Promise<IBylawData | null> {
  let bylawDetailRaw = await chatGPTJSONQuery(`
    Read the provided text and find the street address in question with the following JSON - otherwise return a {error: message, reason: string}.
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
