import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { parseCleanPDF } from '../../../utilities/PDFUtilitiesV2'
import { FullRecord } from '../../../repositories/FullRecord'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'

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

export async function parseApplication(news: IMeetingDetail): Promise<FullRecord[]> {

  try {

    const parsedPDF = await parseCleanPDF(news.reportUrls[0].url, {maxPages: 4})

    if (!parsedPDF) {
      console.log(chalk.bgRed(`Error parsing PDF: ${news.reportUrls[0].url}`))
      return []
    }

    const response = await AIGetPartialRecords(parsedPDF, {
      expectedWords: [], // Vancouver does not have rezoning IDs for some reason
      fieldsToAnalyze: ['building type', 'zoning', 'stats']
    })

    if (!response || response.length === 0) {
      console.log(chalk.bgRed(`Error parsing application: ${news.reportUrls[0].url}`))
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
        buildingType: record.buildingType,
        status: 'applied',
        dates: {
          appliedDate: news.date,
          publicHearingDate: null,
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
            status: 'applied'
          }
        }),
        minutesUrls: news.minutesUrl ? [{
          date: news.date,
          url: news.minutesUrl,
          status: 'applied'
        }] : []
      })
    })

  } catch (error) {
    console.error(chalk.bgRed('Error parsing application'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return []
  }

}
