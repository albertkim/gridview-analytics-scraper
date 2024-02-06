import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { FullRecord } from '../../../repositories/FullRecord'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'
import { findApplicationIDsFromTemplate } from '../../../utilities/RegexUtilities'

// Note that rezoning applications may show up in council, special, and land use meetings
export function checkIfApplication(news: IMeetingDetail): boolean {

  const isApplication = news.title.toLowerCase().includes('land use applications')

  // In Surrey applications, the key details come before the "it was" line

  const beforeItWasContents = news.contents.toLowerCase().split('it was')[0]

  if (beforeItWasContents) {

    const includesDevelopmentId = findApplicationIDsFromTemplate('XXXX-XXXX-XX', beforeItWasContents).length > 0
    const includesRezoning = beforeItWasContents.includes('rezoning')
    const isNotTemporary = !beforeItWasContents.includes('temporary use permit')
    const hasPlanningReport = news.reportUrls.length > 0 && !!news.reportUrls.find((r) => r.title.toLowerCase().includes('planning report'))
  
    return includesDevelopmentId && isApplication && includesRezoning && isNotTemporary && hasPlanningReport

  } else {
    return false
  }

}

export async function parseApplication(news: IMeetingDetail): Promise<FullRecord[]> {

  try {

    const rezoningIds = findApplicationIDsFromTemplate('XXXX-XXXX-XX', news.contents)

    if (rezoningIds.length === 0) {
      console.log(chalk.red(`No rezoning IDs found in ${news.title}`))
      return []
    }

    const rezoningId = rezoningIds[0]

    const response = await AIGetPartialRecords(news.contents, {
      expectedWords: [rezoningId],
      applicationId: 'in the format of XXXX-XXXX-XX where Xs are numbers',
      fieldsToAnalyze: ['building type', 'zoning', 'stats']
    })

    if (!response || response.length === 0) {
      console.log(chalk.red(`No response for Surrey application - ${news.title}`))
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
