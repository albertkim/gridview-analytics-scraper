import moment from 'moment'
import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { downloadPDF, generatePDFTextArray } from '../../PDFUtilities'
import { chatGPTPartialRezoningQuery } from '../../AIUtilities'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { generateID } from '../../../repositories/GenerateID'
import { cleanBurnabyRezoningId, getBurnabyBaseGPTQuery } from './BurnabyUtilities'

export function checkIfPublicHearing(news: IMeetingDetail) {
  const isBurnaby = news.city === 'Burnaby'
  const isCityCouncil = news.meetingType === 'Public Hearing'
  const isRezoningTitle = news.title.toLowerCase().includes('zoning bylaw')
  const hasRezInContents = news.contents.toLowerCase().includes('rez')
  const hasReportURLs = news.reportUrls.length > 0

  return isBurnaby && isCityCouncil && isRezoningTitle && hasRezInContents && hasReportURLs
}

export async function parsePublicHearing(news: IMeetingDetail): Promise<IFullRezoningDetail | null> {

  try {

    // Parse the referral report PDF if exists, otherwise just use title + contents
    let applicationContent: string | null = null

    if (news.reportUrls.length > 0) {
      const firstPDFURL = news.reportUrls[0].url
      const pdfData = await downloadPDF(firstPDFURL)
  
      // Burnaby rezoning recommendations can be quite lengthy - we need the first page (maybe first 2 to be sure) to get the basic details, and the executive summary to get the full details
      const pdfTextArray = await generatePDFTextArray(pdfData)
  
      const firstTwoPageIndex = pdfTextArray.length >= 2 ? [0, 1] : [0]
      const executiveSummaryPageIndex = pdfTextArray.findIndex((text) => text.includes('EXECUTIVE SUMMARY')) || 0
      const pageAfterExecutiveSummaryIndex = pdfTextArray[executiveSummaryPageIndex + 1] ? executiveSummaryPageIndex + 1 : 0
  
      const pdfPageIndexesToParse = [...new Set([...firstTwoPageIndex, executiveSummaryPageIndex, pageAfterExecutiveSummaryIndex])].sort()
  
      applicationContent = pdfPageIndexesToParse.map((i) => pdfTextArray[i]).join('\n')
    } else {
      applicationContent = `${news.title}\n${news.contents}`
    }

    // Get partial rezoning details from GPT
    const partialRezoningDetails = await chatGPTPartialRezoningQuery(
      getBurnabyBaseGPTQuery(applicationContent),
      {analyzeType: true, analyzeStats: true}
    )

    if (!partialRezoningDetails) {
      throw new Error()
    }

    // Return full rezoning details object
    return {
      id: generateID('rez'),
      ...partialRezoningDetails,
      rezoningId: cleanBurnabyRezoningId(partialRezoningDetails.rezoningId),
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
        url: news.minutesUrl,
        type: 'public hearing'
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

  } catch (error) {
    console.error(chalk.bgRed('Error parsing public hearing'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
