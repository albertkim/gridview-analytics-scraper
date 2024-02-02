import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { chatGPTRezoningQuery } from '../../AIUtilities'
import { getSurreyBaseGPTQuery, getSurreyDevelopmentID } from './SurreyUtilities'
import { generateID } from '../../../repositories/GenerateID'
import { IFullRezoningDetail } from '../../../repositories/RecordsRepository'

export function checkIfPublicHearing(news: IMeetingDetail) {

  const includesDevelopmentId = !!getSurreyDevelopmentID(news.contents)
  const isPublicHearingMeetingType = news.meetingType.toLowerCase().includes('public hearing')
  const isPublicHearingItem = ['public hearing', 'delegations'].every((word) => news.title.toLowerCase().includes(word))
  const includesRezoning = news.contents.toLowerCase().includes('rezon')
  const hasPlanningReport = news.reportUrls.length > 0 && !!news.reportUrls.find((r) => r.title.toLowerCase().includes('planning report'))

  return includesDevelopmentId && isPublicHearingMeetingType && isPublicHearingItem && includesRezoning && hasPlanningReport

}

export async function parsePublicHearing(news: IMeetingDetail) {

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
      status: 'public hearing',
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
    console.error(chalk.bgRed('Error parsing public hearing'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
