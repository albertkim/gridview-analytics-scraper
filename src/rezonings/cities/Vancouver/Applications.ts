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
  // Sometime in 2019, council meetings were called regular council, then switched to council
  const isCouncil = ['council', 'regular council']
    .some((match) => news.meetingType.toLowerCase() === match)
  const titleIsRezoning = news.title.toLowerCase().includes('rezoning:')
  let isReferralReport = false
  if (hasReportURLs) {
    const firstReport = news.reportUrls[0]
    isReferralReport = ['referral report', 'staff report'].some((match) => firstReport.title.toLowerCase().includes(match))
  }
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
          status: 'applied'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl,
        status: 'applied'
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
