import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { downloadPDF, generatePDFTextArray } from '../../PDFUtilities'
import { chatGPTPartialRezoningQuery } from '../../AIUtilities'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'
import { generateID } from '../../../repositories/GenerateID'
import { cleanBurnabyRezoningId, getBurnabyBaseGPTQuery } from './BurnabyUtilities'

// Burnaby includes first, second, and 3rd readings in their council meeting minutes, we only want the first reading
export function checkIfApplication(news: IMeetingDetail) {
  const isBurnaby = news.city === 'Burnaby'
  const isCityCouncil = ['City Council Meeting', 'City Council'].some((string) => news.meetingType.includes(string))
  const isAdministrativeReport = [`administrative reports`, `manager's reports`, `chief administrative officer's reports`, `manager's reports`, `rezoning applications`]
    .some((string) => news.title.toLowerCase().includes(string))
  const isRezoning = ['rezoning reference', 'rez #', 'rez.'].some((string) => news.title.toLowerCase().includes(string))

  return isBurnaby && isCityCouncil && isAdministrativeReport && isRezoning
}

export async function parseApplication(news: IMeetingDetail): Promise<IFullRezoningDetail | null> {

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
      type: 'rezoning',
      ...partialRezoningDetails,
      applicationId: cleanBurnabyRezoningId(partialRezoningDetails.applicationId),
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

  } catch (error) {
    console.error(chalk.bgRed('Error parsing application'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
