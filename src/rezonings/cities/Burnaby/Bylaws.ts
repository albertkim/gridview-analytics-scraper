import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, ZoningStatus } from '../../../repositories/RecordsRepository'
import { chatGPTRezoningQuery } from '../../../utilities/AIUtilities'
import { cleanBurnabyRezoningId, getBurnabyBaseGPTQuery } from './BurnabyUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { generateID } from '../../../repositories/GenerateID'

// Check that title prefixes ABANDONMENT for FINAL ADOPTION
export function checkIfBylaw(news: IMeetingDetail) {
  const isBurnaby = news.city === 'Burnaby'
  const isCityCouncil = ['City Council Meeting', 'City Council'].some((string) => news.meetingType.includes(string))
  const isFinalAdoptionOrAbandanment = news.title.toLowerCase().includes('final adoption') || news.title.toLowerCase().includes('abandonment')
  const isRezoningTitle = news.title.toLowerCase().includes('zoning bylaw')
  const hasRez = news.title.toLowerCase().includes('rez')

  return isBurnaby && isCityCouncil && isFinalAdoptionOrAbandanment && isRezoningTitle && hasRez && hasRez
}

// Burnaby bylaw info can be found in the scraped text, attached PDFs are not very helpful
export async function parseBylaw(news: IMeetingDetail): Promise<IFullRezoningDetail | null> {

  try {

    const infoString = `${news.title} - ${news.contents}`

    const partialRezoningDetails = await chatGPTRezoningQuery(
      getBurnabyBaseGPTQuery(infoString),
      {analyzeType: true, analyzeStats: false} // No need to get stats, can't get it from the available documents
    )

    if (!partialRezoningDetails) {
      throw new Error()
    }

    // Figure out if approved, denied, or withdrawn
    let status: ZoningStatus = 'approved'
    if (news.title.toLowerCase().includes('abandonment')) status = 'denied'
    if (news.title.toLowerCase().includes('withdrawn')) status = 'withdrawn'

    // Return full rezoning details object
    return {
      id: generateID('rez'),
      type: 'rezoning',
      ...partialRezoningDetails,
      applicationId: cleanBurnabyRezoningId(partialRezoningDetails.applicationId),
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
      stats: {
        buildings: null,
        stratas: null,
        rentals: null,
        hotels: null,
        fsr: null,
        storeys: null
      },
      status: status,
      dates: {
        appliedDate: null,
        publicHearingDate: null,
        approvalDate: status === 'approved' ? news.date : null,
        denialDate: status === 'denied' ? news.date : null,
        withdrawnDate: null
      },
      location: {
        latitude: null,
        longitude: null
      },
      createDate: moment().format('YYYY-MM-DD'),
      updateDate: moment().format('YYYY-MM-DD')
    }

  } catch (error) {
    console.error(chalk.bgRed('Error parsing bylaw'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return null
  }

}
