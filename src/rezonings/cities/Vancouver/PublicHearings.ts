import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { parseCleanPDF } from '../../../utilities/PDFUtilitiesV2'
import { FullRecord } from '../../../repositories/FullRecord'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'

export function checkIfPublicHearing(news: IMeetingDetail) {
  const isVancouver = news.city === 'Vancouver'
  const hasReportURLs = news.reportUrls.length > 0
  const isPublicHearing = news.meetingType.toLowerCase() === 'public hearing'
  const titleIsRezoning = news.title.toLowerCase().includes('rezoning:')
  return isVancouver && hasReportURLs && isPublicHearing && titleIsRezoning
}

export async function parsePublicHearing(news: IMeetingDetail): Promise<FullRecord[]> {

  try {

    const parsedPDF = await parseCleanPDF(news.reportUrls[0].url, {maxPages: 3})

    if (!parsedPDF) {
      console.error(chalk.bgRed(`Error parsing PDF: ${news.reportUrls[0].url}`))
      return []
    }

    const response = await AIGetPartialRecords(parsedPDF, {
      expectedWords: [], // Vancouver does not have rezoning IDs for some reason
      fieldsToAnalyze: ['building type', 'zoning', 'stats']
    })

    if (!response || response.length === 0) {
      console.log(chalk.bgRed(`Error parsing public hearing: ${news.reportUrls[0].url}`))
      return []
    }

    return response.map((record) => {
      return new FullRecord({
        city: 'Vancouver',
        metroCity: 'Metro Vancouver',
        type: 'rezoning',
        applicationId: null,
        address: record.address,
        applicant: record.applicant,
        behalf: record.behalf,
        description: record.description,
        rawSummaries: record.rawSummaries.map((summaryObject) => {
          return {
            summary: summaryObject.summary,
            date: news.date,
            status: 'public hearing',
            reportUrl: news.reportUrls[0].url
          }
        }),
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
