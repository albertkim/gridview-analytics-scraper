import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { parseCleanPDF, parsePDFAsRawArray } from '../../../utilities/PDFUtilitiesV2'
import { findApplicationIDsFromTemplate } from '../../../utilities/RegexUtilities'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'
import { FullRecord } from '../../../repositories/FullRecord'

export function checkIfPublicHearing(news: IMeetingDetail) {
  const isBurnaby = news.city === 'Burnaby'
  const isCityCouncil = news.meetingType === 'Public Hearing'
  const isRezoningTitle = news.title.toLowerCase().includes('zoning bylaw')
  const hasRezInContents = news.contents.toLowerCase().includes('rez')
  const hasReportURLs = news.reportUrls.length > 0

  return isBurnaby && isCityCouncil && isRezoningTitle && hasRezInContents && hasReportURLs
}

export async function parsePublicHearing(news: IMeetingDetail): Promise<FullRecord[]> {

  try {

    // Parse the referral report PDF if exists, otherwise just use title + contents
    let parsedContents: string = `${news.title}\n${news.contents}`

    if (news.reportUrls.length > 0) {
      // Burnaby rezoning recommendations can be quite lengthy - in the example below, info about storeys and units are at the end of the 4th page
      // Example: https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=69830

      const pdfUrl = news.reportUrls[0].url

      const pdfTextArray = await parsePDFAsRawArray(pdfUrl)

      const firstTwoPageIndex = pdfTextArray.length >= 2 ? [0, 1] : [0]
      const executiveSummaryPageIndex = pdfTextArray.findIndex((text) => text.includes('EXECUTIVE SUMMARY')) || 0
      const pageAfterExecutiveSummaryIndex = pdfTextArray[executiveSummaryPageIndex + 1] ? executiveSummaryPageIndex + 1 : 0
  
      const pdfPageIndexesToParse = [...new Set([...firstTwoPageIndex, executiveSummaryPageIndex, pageAfterExecutiveSummaryIndex])].sort()

      const parsedPDF = await parseCleanPDF(pdfUrl, {
        pages: pdfPageIndexesToParse
      })
      if (parsedPDF) parsedContents = parsedPDF
    }

    // Get rezoning IDs
    const rezoningIds = findApplicationIDsFromTemplate('REZ #XX-XX', parsedContents)
    const rezoningId = rezoningIds.length > 0 ? rezoningIds[0] : null

    if (!rezoningId) {
      console.log(chalk.yellow(`Error finding rezoning ID from public hearing - ${news.title} - ${news.date} - ${news.contents}`))
      return []
    }

    const response = await AIGetPartialRecords(parsedContents,
      {
        applicationId: 'ID in the format of REZ #XX-XX where X is a number - format if necessary',
        fieldsToAnalyze: ['building type', 'zoning', 'stats'],
        expectedWords: [rezoningId]
      }
    )

    if (!response || response.length === 0) {
      console.log(chalk.bgRed(`Error parsing application - ${news.title} - ${news.date} - ${news.contents}`))
      return []
    }

    return response
      .filter((record) => record.applicationId)
      .map((record) => {
        return new FullRecord({
          city: 'Burnaby',
          metroCity: 'Metro Vancouver',
          type: 'rezoning',
          applicationId: record.applicationId,
          address: record.address,
          applicant: record.applicant,
          behalf: record.behalf,
          description: record.description,
          buildingType: record.buildingType,
          status: 'public hearing',
          dates: {
            appliedDate: null,
            publicHearingDate: news.date,
            approvalDate: null,
            denialDate: null,
            withdrawnDate: null
          },
          stats: record.stats,
          zoning: record.zoning,
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
          }] : []
        })
      })

  } catch (error) {
    console.error(chalk.bgRed('Error parsing public hearing'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return []
  }

}
