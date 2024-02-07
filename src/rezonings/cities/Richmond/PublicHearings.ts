import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { parseCleanPDF } from '../../../utilities/PDFUtilitiesV2'
import { FullRecord } from '../../../repositories/FullRecord'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'
import { findApplicationIDsFromTemplate } from '../../../utilities/RegexUtilities'

export function checkIfPublicHearing(news: IMeetingDetail) {
  const isRichmond = news.city === 'Richmond'
  const hasReportURLs = news.reportUrls.length > 0
  const isPublicHearing = news.meetingType === 'Public Hearing Minutes'
  return isRichmond && hasReportURLs && isPublicHearing
}

export async function parsePublicHearing(news: IMeetingDetail): Promise<FullRecord[]> {

  try {

    // Parse the referral report PDF
    const parsedPDF = await parseCleanPDF(news.reportUrls[0].url, {
      maxPages: 3
    })

    if (!parsedPDF) {
      console.log(chalk.red(`PDF could not be parsed: ${news.reportUrls[0].url}`))
      return []
    }

    const rezoningIds = findApplicationIDsFromTemplate('RZ XX-XXXXXX', parsedPDF)
    if (rezoningIds.length === 0) {
      console.log(chalk.yellow(`No rezoning number found for Richmond public hearing - ${news.reportUrls[0].url}`))
      return []
    }
    const rezoningId = rezoningIds[0]

    const response = await AIGetPartialRecords(parsedPDF, {
      expectedWords: [rezoningId],
      applicationId: 'in the format "RZ XX-XXXXX" where the Xs are numbers',
      fieldsToAnalyze: ['building type', 'zoning', 'stats']
    })

    if (!response || response.length === 0) {
      console.log(chalk.red(`No response for Richmond public hearing - ${news.reportUrls[0].url}`))
      return []
    }

    const records = response.map((record) => {
      return new FullRecord({
        city: 'Richmond',
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
        }] : [],
      })
    })

    return records

  } catch (error) {
    console.error(chalk.bgRed('Error parsing public hearing'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return []
  }

}
