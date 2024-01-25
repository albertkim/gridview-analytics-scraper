import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { chatGPTPartialRezoningQuery } from '../../AIUtilities'
import { getSurreyBaseGPTQuery } from './SurreyUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { generateID } from '../../../repositories/GenerateID'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'

// Note that rezoning applications may show up in council, special, and land use meetings
export function checkIfApplication(news: IMeetingDetail): boolean {

  const isApplication = news.title.toLowerCase().includes('land use applications')
  const includesRezoning = news.contents.toLowerCase().includes('rezon')
  const hasPlanningReport = news.reportUrls.length > 0 && !!news.reportUrls.find((r) => r.title.toLowerCase().includes('planning report'))

  return isApplication && includesRezoning && hasPlanningReport

}

export async function parseApplication(news: IMeetingDetail) {

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
          type: 'applied'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl,
        type: 'applied'
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
