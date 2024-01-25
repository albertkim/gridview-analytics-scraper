import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { chatGPTPartialRezoningQuery } from '../../AIUtilities'
import { getSurreyBaseGPTQuery } from './SurreyUtilities'
import { generateID } from '../../../repositories/GenerateID'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'

export function checkIfBylaw(news: IMeetingDetail) {

  const includesBylawsAndPermits = news.title.toLowerCase().includes('bylaws and permits')
  const includesRezoning = news.contents.toLowerCase().includes('rezon')
  const isNotReading = !news.contents.toLowerCase().includes('reading')

  return includesBylawsAndPermits && includesRezoning && isNotReading

}

// "finally adopted" = approved
export async function parseBylaw(news: IMeetingDetail) {

  try {

    const partialRezoningDetails = await chatGPTPartialRezoningQuery(
      getSurreyBaseGPTQuery(news.contents),
      {analyzeType: true, analyzeStats: true}
    )

    if (!partialRezoningDetails) {
      throw new Error()
    }

    const status = ['final', 'adopted'].every((word) => news.contents.toLowerCase().includes(word)) ? 'approved' : 'denied'

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
          type: status
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl,
        type: status
      }] : [],
      status: status,
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
