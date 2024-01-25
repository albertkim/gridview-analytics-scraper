import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { chatGPTPartialRezoningQuery } from '../../AIUtilities'
import { getSurreyBaseGPTQuery } from './SurreyUtilities'
import { generateID } from '../../../repositories/GenerateID'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'

export function checkIfPublicHearing(news: IMeetingDetail) {

  const isPublicHearingMeetingType = news.meetingType.toLowerCase().includes('public hearing')
  const isPublicHearingItem = ['public hearing', 'delegations'].every((word) => news.title.toLowerCase().includes(word))
  const includesRezoning = news.contents.toLowerCase().includes('rezon')
  const hasPlanningReport = news.reportUrls.length > 0 && !!news.reportUrls.find((r) => r.title.toLowerCase().includes('planning report'))

  return isPublicHearingMeetingType && isPublicHearingItem && includesRezoning && hasPlanningReport

}

export async function parsePublicHearing(news: IMeetingDetail) {

  try {

    const partialRezoningDetails = await chatGPTPartialRezoningQuery(
      getSurreyBaseGPTQuery(news.contents),
      {analyzeType: true, analyzeStats: true}
    )

    if (!partialRezoningDetails) {
      throw new Error()
    }

    const fullRezoningDetails: IFullRezoningDetail = {
      id: generateID('rez'),
      ...partialRezoningDetails,
      rezoningId: null,
      city: news.city,
      metroCity: news.metroCity,
      urls: news.reportUrls.map((urlObject) => {
        return {
          date: news.date,
          title: urlObject.title,
          url: urlObject.url,
          type: 'public hearing'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl,
        type: 'public hearing'
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
    console.error(chalk.bgRed('Error parsing application'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
