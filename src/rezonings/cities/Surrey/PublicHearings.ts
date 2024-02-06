import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { findApplicationIDsFromTemplate } from '../../../utilities/RegexUtilities'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'
import { FullRecord } from '../../../repositories/FullRecord'

export function checkIfPublicHearing(news: IMeetingDetail) {

  const includesDevelopmentId = findApplicationIDsFromTemplate('XXXX-XXXX-XX', news.contents).length > 0
  const isPublicHearingMeetingType = news.meetingType.toLowerCase().includes('public hearing')
  const isPublicHearingItem = ['public hearing', 'delegations'].every((word) => news.title.toLowerCase().includes(word))
  const includesRezoning = news.contents.toLowerCase().includes('rezon')
  const hasPlanningReport = news.reportUrls.length > 0 && !!news.reportUrls.find((r) => r.title.toLowerCase().includes('planning report'))

  return includesDevelopmentId && isPublicHearingMeetingType && isPublicHearingItem && includesRezoning && hasPlanningReport

}

export async function parsePublicHearing(news: IMeetingDetail): Promise<FullRecord[]> {

  try {

    const rezoningIds = findApplicationIDsFromTemplate('XXXX-XXXX-XX', news.contents)

    if (rezoningIds.length === 0) {
      console.log(chalk.red(`No rezoning IDs found in ${news.title}`))
      return []
    }

    // Expect one rezoning item per application
    const rezoningId = rezoningIds[0]

    const response = await AIGetPartialRecords(news.contents, {
      expectedWords: [rezoningId],
      applicationId: 'in the format of XXXX-XXXX-XX where Xs are numbers',
      fieldsToAnalyze: ['building type', 'zoning', 'stats']
    })

    if (!response || response.length === 0) {
      console.log(chalk.red(`No response for Surrey public hearing - ${news.title}`))
      return []
    }

    return response.map((record) => {
      return new FullRecord({
        city: 'Surrey',
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
