import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'
import { chatGPTPartialRezoningQuery } from '../../AIUtilities'
import { downloadPDF, parsePDF } from '../../PDFUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { generateID } from '../../../repositories/GenerateID'
import { getRichmondBaseGPTQuery } from './RichmondUtilities'

export function checkIfPublicHearing(news: IMeetingDetail) {
  const isRichmond = news.city === 'Richmond'
  const hasReportURLs = news.reportUrls.length > 0
  const isPublicHearing = news.meetingType === 'Public Hearing Minutes'
  return isRichmond && hasReportURLs && isPublicHearing
}

export async function parsePublicHearing(news: IMeetingDetail): Promise<IFullRezoningDetail | null> {

  try {

    // Parse the referral report PDF
    const firstPDFURL = news.reportUrls[0].url
    const pdfData = await downloadPDF(firstPDFURL)
    const parsedPDF = await parsePDF(pdfData as Buffer, 2)

    // The PDF text should include the words "RZ"
    if (!parsedPDF.includes('RZ')) {
      console.log('Not a rezoning public hearing PDF document, skipping')
      return null
    }

    // Get partial rezoning details from GPT
    const partialRezoningDetails = await chatGPTPartialRezoningQuery(
      getRichmondBaseGPTQuery(parsedPDF),
      {analyzeType: true, analyzeStats: false}
    )

    if (!partialRezoningDetails) {
      throw new Error()
    }

    // Return full rezoning details object
    const fullRezoningDetails: IFullRezoningDetail = {
      id: generateID('rez'),
      ...partialRezoningDetails,
      city: news.city,
      metroCity: news.metroCity,
      urls: news.reportUrls.map((urlObject) => {
        return {
          date: news.date,
          title: urlObject.title,
          url: urlObject.url,
          type: 'public hearing'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl
      }] : [],
      status: 'public hearing',
      dates: {
        appliedDate: null,
        publicHearingDate: news.date,
        approvalDate: null,
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

    return fullRezoningDetails

  } catch (error) {
    console.error(chalk.bgRed('Error parsing public hearing'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
