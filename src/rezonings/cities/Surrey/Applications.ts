import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { chatGPTRezoningQuery } from '../../AIUtilities'
import { getSurreyBaseGPTQuery, getSurreyDevelopmentID } from './SurreyUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { generateID } from '../../../repositories/GenerateID'
import { IFullRezoningDetail } from '../../../repositories/RecordsRepository'

// Note that rezoning applications may show up in council, special, and land use meetings
export function checkIfApplication(news: IMeetingDetail): boolean {

  const isApplication = news.title.toLowerCase().includes('land use applications')

  // In Surrey applications, the key details come before the "it was" line

  const beforeItWasContents = news.contents.toLowerCase().split('it was')[0]

  if (beforeItWasContents) {

    const includesDevelopmentId = !!getSurreyDevelopmentID(beforeItWasContents)
    const includesRezoning = beforeItWasContents.includes('rezoning')
    const isNotTemporary = !beforeItWasContents.includes('temporary use permit')
    const hasPlanningReport = news.reportUrls.length > 0 && !!news.reportUrls.find((r) => r.title.toLowerCase().includes('planning report'))
  
    return includesDevelopmentId && isApplication && includesRezoning && isNotTemporary && hasPlanningReport

  } else {
    return false
  }

}

export async function parseApplication(news: IMeetingDetail) {

  try {

    const partialRezoningDetails = await chatGPTRezoningQuery(
      getSurreyBaseGPTQuery(news.contents),
      {analyzeType: true, analyzeStats: true}
    )

    if (!partialRezoningDetails) {
      throw new Error()
    }

    const fullRezoningDetails: IFullRezoningDetail = {
      id: generateID('rez'),
      type: 'rezoning',
      ...partialRezoningDetails,
      applicationId: getSurreyDevelopmentID(news.contents),
      city: news.city,
      metroCity: news.metroCity,
      reportUrls: news.reportUrls.map((urlObject) => {
        return {
          date: news.date,
          title: urlObject.title.replace('\n', ', '),
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

    return fullRezoningDetails

  } catch (error) {
    console.error(chalk.bgRed('Error parsing application'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }


}
