import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { downloadPDF, generatePDFTextArray } from '../../PDFUtilities'
import { chatGPTTextQuery, getGPTBaseRezoningQuery, getGPTBaseRezoningStatsQuery } from '../../AIUtilities'
import { IPartialRezoningDetail, checkGPTJSON } from '../../../repositories/RezoningsRepository'
import { generateID } from '../../../repositories/GenerateID'
import { cleanBurnabyRezoningId } from './BurnabyUtilities'

// Burnaby includes first, second, and 3rd readings in their council meeting minutes, we only want the first reading
export function checkIfApplication(news: IMeetingDetail) {
  const isBurnaby = news.city === 'Burnaby'
  const isCityCouncil = news.meetingType === 'City Council Meeting'
  const isAdministrativeReport = news.title.toLowerCase().includes('administrative reports')
  const hasRez = news.title.toLowerCase().includes('rez')
  const hasRezoningId = news.title.toLowerCase().includes('#')
  const hasDash = news.title.toLowerCase().includes('-')

  return isBurnaby && isCityCouncil && isAdministrativeReport && hasRez && hasRezoningId && hasDash
}

const baseRezoningIdQuery = 'ID in the format of "REZ #XX-XX", usually in the brackets - correct the format if necessary - null if not found'

export async function parseApplication(news: IMeetingDetail) {

  try {

    // Parse the referral report PDF
    const firstPDFURL = news.reportUrls[0].url
    const pdfData = await downloadPDF(firstPDFURL)

    // Burnaby rezoning recommendations can be quite lengthy - we need the first page (maybe first 2 to be sure) to get the basic details, and the executive summary to get the full details
    const pdfTextArray = await generatePDFTextArray(pdfData)

    const firstTwoPageIndex = pdfTextArray.length >= 2 ? [0, 1] : [0]
    const executiveSummaryPageIndex = pdfTextArray.findIndex((text) => text.includes('EXECUTIVE SUMMARY')) || 0
    const pageAfterExecutiveSummaryIndex = pdfTextArray[executiveSummaryPageIndex + 1] ? executiveSummaryPageIndex + 1 : 0

    const pdfPageIndexesToParse = [...new Set([...firstTwoPageIndex, executiveSummaryPageIndex, pageAfterExecutiveSummaryIndex])].sort()

    const parsedPDF = pdfPageIndexesToParse.map((i) => pdfTextArray[i]).join('\n')

    // Get partial rezoning details from GPT
    let partialRezoningDetailsRaw = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF, {
      rezoningId: baseRezoningIdQuery
    }))
    if (!checkGPTJSON(partialRezoningDetailsRaw)) {
      console.warn(chalk.bgYellow('Partial rezoning details GPT JSON is invalid, running again'))
      partialRezoningDetailsRaw = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF, {
        rezoningId: baseRezoningIdQuery
      }))
      if (!checkGPTJSON(partialRezoningDetailsRaw)) {
        const errorMessage = 'Partial rezoning details GPT JSON is invalid 2nd time, skipping'
        console.error(chalk.bgRed(errorMessage))
        console.error(chalk.red(JSON.stringify(partialRezoningDetailsRaw, null, 2)))
        ErrorsRepository.addError(news)
        throw new Error(errorMessage)
      }
    }
    console.log(chalk.bgGreen('Partial rezoning details GPT JSON is valid'))

    // Cast as partial rezoning details
    const partialRezoningDetails = partialRezoningDetailsRaw as IPartialRezoningDetail

    // Get stats
    const GPTStats = await chatGPTTextQuery(getGPTBaseRezoningStatsQuery(partialRezoningDetails.description), '4')
    if (!GPTStats) {
      const errorMessage = 'Partial rezoning details GPT JSON is not valid, skipping'
      console.log(chalk.bgRed(errorMessage))
      ErrorsRepository.addError(news)
      throw new Error(errorMessage)
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

  } catch (error) {
    console.error(chalk.bgRed('Error parsing application'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
