import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, IPartialRezoningDetail, checkGPTJSON } from '../../../repositories/RezoningsRepository'
import { getGPTBaseRezoningQuery, chatGPTTextQuery, getGPTBaseRezoningStatsQuery } from '../../AIUtilities'
import { downloadPDF, generatePDF, parsePDF } from '../../PDFUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'

export function checkIfApplication(news: IMeetingDetail) {
  const hasReportURLs = news.reportUrls.length > 0
  const isCouncil = news.meetingType.toLowerCase() === 'council'
  const titleIsRezoning = news.title.toLowerCase().includes('rezoning:')
  const isReferralReport = hasReportURLs ? news.reportUrls[0].title.toLowerCase().includes('referral report') : false
  return hasReportURLs && isCouncil && titleIsRezoning && isReferralReport
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
    let partialRezoningDetails = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF, {
      rezoningId: 'null'
    }))
    if (!checkGPTJSON(partialRezoningDetails)) {
      console.warn(chalk.bgYellow('Partial rezoning details GPT JSON is invalid, running again'))
      partialRezoningDetails = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF, {
        rezoningId: 'null'
      }))
      if (!checkGPTJSON(partialRezoningDetails)) {
        const errorMessage = 'Partial rezoning details GPT JSON is invalid 2nd time, skipping'
        console.error(chalk.bgRed(errorMessage))
        console.error(chalk.red(JSON.stringify(partialRezoningDetails, null, 2)))
        ErrorsRepository.addError(news)
        throw new Error(errorMessage)
      }
    }
    console.log(chalk.bgGreen('Partial rezoning details GPT JSON is valid'))

    // Cast as partial rezoning details
    partialRezoningDetails = partialRezoningDetails as IPartialRezoningDetail

    // Get stats
    const GPTStats = await chatGPTTextQuery(getGPTBaseRezoningStatsQuery(partialRezoningDetails.description), '4')
    if (GPTStats.error) {
      const errorMessage = 'Partial rezoning details GPT JSON is not valid, skipping'
      console.log(chalk.bgRed(errorMessage))
      ErrorsRepository.addError(news)
      throw new Error(errorMessage)
    }

    // Return full rezoning details object
    const fullRezoningDetails: IFullRezoningDetail = {
      ...partialRezoningDetails,
      city: news.city,
      metroCity: news.metroCity,
      urls: news.reportUrls.map((urlObject) => {
        return {
          date: news.date,
          title: urlObject.title,
          url: urlObject.url,
          type: 'application'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl
      }] : [],
      stats: GPTStats,
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
    console.error(error)
    return null
  }

}
