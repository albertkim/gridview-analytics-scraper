import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, IPartialRezoningDetail, ZoningType } from '../../../repositories/RezoningsRepository'
import { chatGPTTextQuery } from '../../AIUtilities'
import { downloadPDF, generatePDFTextArray, parsePDF } from '../../PDFUtilities'
import { generateID } from '../../../repositories/GenerateID'

interface IBylawData {
  address: string
  status: 'approved' | 'denied'
  date: string
  type: ZoningType
  zoning: {
    previousZoningCode: string | null
    previousZoningDescription: string | null
    newZoningCode: string | null
    newZoningDescription: string | null
  }
}

export function checkIfBylaw(news: IMeetingDetail) {
  const isVancouver = news.city === 'Vancouver'
  const hasReportURLs = news.reportUrls.length > 0
  const isCouncil = news.meetingType.toLowerCase() === 'council'
  const isBylaw = news.title === 'By-laws'
  return isVancouver && hasReportURLs && isCouncil && isBylaw
}

export async function parseBylaw(news: IMeetingDetail): Promise<IFullRezoningDetail[]> {

  const fullRezoningDetails: IFullRezoningDetail[] = []

  try {

    // Parse each bylaw URL pdf - each URL pdf may contain multiple rezoning approvals, one on each page
    const bylawPDFPages: {url: string, text: string}[] = []
    const bylawPDFUrls = news.reportUrls.map((urlObject) => urlObject.url)
    for (const bylawPDFURL of bylawPDFUrls) {
      const pdfData = await downloadPDF(bylawPDFURL)
      const pdfTextOnlyData = await generatePDFTextArray(pdfData, {
        minCharacterCount: 10,
        expectedWords: ['Explanation', 'rezon']
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
      if (!page.text.toLowerCase().includes('housing agreement')) {
        continue
      }

      let bylawDetailRaw = await chatGPTTextQuery(`
        Identify if the given text is a zoning bylaw amendment/housing agreement. If so, return the following in JSON format. Otherwise return a {error: message}.
        {
          address: address in question - if multiple addresses in the same section comma separate
          date: date in YYYY-MM-DD format
          type: one of single-family residential, townhouse, mixed use (only if there is residential + commercial), multi-family residential (only if there is no commercial), industrial, commercial, or other
          zoning: {
            previousZoningCode: city zoning code before rezoning or null if unclear
            previousZoningDescription: best description of previous zoning code (ex. low density residential)
            newZoningCode: city zoning code after rezoning or null if unclear
            newZoningDescription: best description of new zoning code (ex. high density residential)
          }
        }
        Here is the text: ${page.text}
      `)

      if (!bylawDetailRaw) {
        continue
      }

      const bylawDetail = bylawDetailRaw as IBylawData

      const fullRezoningDetail: IFullRezoningDetail = {
        id: generateID('rez'),
        ...bylawDetail,
        city: news.city,
        metroCity: news.metroCity,
        rezoningId: null,
        applicant: null,
        behalf: null,
        description: '',
        type: null,
        urls: [
          {
            date: news.date,
            title: 'By-laws',
            url: page.url,
            type: 'bylaw'
          }
        ],
        minutesUrls: news.minutesUrl ? [{
          date: news.date,
          url: news.minutesUrl
        }] : [],
        stats: {
          buildings: null,
          stratas: null,
          rentals: null,
          hotels: null,
          fsr: null,
          storeys: null
        },
        status: 'approved',
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
