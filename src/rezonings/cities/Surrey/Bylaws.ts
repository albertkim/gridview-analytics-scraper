import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { chatGPTPartialRezoningQuery } from '../../AIUtilities'
import { getSurreyBylawGPTQuery, getSurreyDevelopmentID } from './SurreyUtilities'
import { generateID } from '../../../repositories/GenerateID'
import { IFullRezoningDetail, ZoningStatus } from '../../../repositories/RezoningsRepository'

export function checkIfBylaw(news: IMeetingDetail) {

  const includesDevelopmentId = !!getSurreyDevelopmentID(news.contents)
  const isNotLandUseApplication = !news.title.toLowerCase().includes('land use application')
  const includesBylawsAndPermits = news.title.toLowerCase().includes('bylaws and permits')
  const includesRezoning = news.contents.toLowerCase().includes('amendment bylaw')
  const isNotReading = !news.contents.toLowerCase().includes('reading')

  return includesDevelopmentId && isNotLandUseApplication && includesBylawsAndPermits && includesRezoning && isNotReading

}

export async function parseBylaw(news: IMeetingDetail) {

  try {

    // Don't need to be strict with getting stats for bylaws - application data is more accurate anyways, save a GPT 4 call
    const partialRezoningDetails = await chatGPTPartialRezoningQuery(
      getSurreyBylawGPTQuery(news.contents),
      {analyzeType: true, analyzeStats: false}
    )

    if (!partialRezoningDetails) {
      // No need to throw error, because we expect some to not be final bylaw decisions
      console.log(chalk.yellow(`No final bylaw decision found for ${news.date} - ${news.title}`))
      return null
    }

    let status: ZoningStatus
    if (['approved', 'denied', 'withdrawn'].some((status) => partialRezoningDetails.status === status)) {
      status = partialRezoningDetails.status as ZoningStatus
    } else {
      console.log(chalk.yellow(`Invalid status returned by GPT: ${partialRezoningDetails.status}`))
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
          status: status
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl,
        status: status
      }] : [],
      status: status,
      dates: {
        appliedDate: null,
        publicHearingDate: null,
        approvalDate: status === 'approved' ? news.date : null,
        denialDate: status === 'denied' ? news.date : null,
        withdrawnDate: status === 'withdrawn' ? news.date : null
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
    console.error(chalk.bgRed(`Error parsing bylaw for ${news.date} - ${news.title}`))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
