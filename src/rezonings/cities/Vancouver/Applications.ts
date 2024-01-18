import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'
import { chatGPTPartialRezoningQuery } from '../../AIUtilities'
import { downloadPDF, generatePDF, parsePDF } from '../../PDFUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { generateID } from '../../../repositories/GenerateID'
import { getVancouverBaseGPTQuery } from './VancouverUtilities'

export function checkIfApplication(news: IMeetingDetail) {
  const isVancouver = news.city === 'Vancouver'
  const hasReportURLs = news.reportUrls.length > 0
  const isCouncil = news.meetingType.toLowerCase() === 'council'
  const titleIsRezoning = news.title.toLowerCase().includes('rezoning:')
  const isReferralReport = hasReportURLs ? news.reportUrls[0].title.toLowerCase().includes('referral report') : false
  return isVancouver && hasReportURLs && isCouncil && titleIsRezoning && isReferralReport
}

export async function parseApplication(news: IMeetingDetail): Promise<IFullRezoningDetail | null> {

  try {

    // Parse the referral report PDF
    const firstPDFURL = news.reportUrls[0].url
    const pdfData = await downloadPDF(firstPDFURL)
    const pdf3pages = await generatePDF(pdfData, {
      maxPages: 4
    })
    const parsedPDF = await parsePDF(pdf3pages as Buffer)

    // Get partial rezoning details from GPT
    const partialRezoningDetails = await chatGPTPartialRezoningQuery(
      getVancouverBaseGPTQuery(parsedPDF),
      {analyzeType: true, analyzeStats: true}
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
          type: 'applied'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl,
        type: 'applied'
      }] : [],
      status: 'applied',
      dates: {
        appliedDate: news.date,
        publicHearingDate: null,
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
    console.error(chalk.bgRed('Error parsing application'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
