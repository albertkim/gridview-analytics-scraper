import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail } from '../../../repositories/RecordsRepository'
import { chatGPTRezoningQuery } from '../../AIUtilities'
import { downloadPDF, generatePDF, parsePDF } from '../../PDFUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { generateID } from '../../../repositories/GenerateID'
import { getVancouverBaseGPTQuery } from './VancouverUtilities'

export function checkIfPublicHearing(news: IMeetingDetail) {
  const isVancouver = news.city === 'Vancouver'
  const hasReportURLs = news.reportUrls.length > 0
  const isPublicHearing = news.meetingType.toLowerCase() === 'public hearing'
  const titleIsRezoning = news.title.toLowerCase().includes('rezoning:')
  return isVancouver && hasReportURLs && isPublicHearing && titleIsRezoning
}

export async function parsePublicHearing(news: IMeetingDetail): Promise<IFullRezoningDetail | null> {

  try {

    // Parse the referral report PDF
    const firstPDFURL = news.reportUrls[0].url
    const pdfData = await downloadPDF(firstPDFURL)
    const pdf3pages = await generatePDF(pdfData, {
      maxPages: 3
    })
    const parsedPDF = await parsePDF(pdf3pages as Buffer)

    // Get partial rezoning details from GPT
    const partialRezoningDetails = await chatGPTRezoningQuery(
      getVancouverBaseGPTQuery(parsedPDF),
      {analyzeType: true, analyzeStats: true}
    )

    if (!partialRezoningDetails) {
      throw new Error()
    }

    // Return full rezoning details object
    const fullRezoningDetails: IFullRezoningDetail = {
      id: generateID('rez'),
      type: 'rezoning',
      ...partialRezoningDetails,
      applicationId: null,
      city: news.city,
      metroCity: news.metroCity,
      reportUrls: news.reportUrls.map((urlObject) => {
        return {
          date: news.date,
          title: urlObject.title,
          url: urlObject.url,
          status: 'public hearing'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl,
        status: 'public hearing'
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
