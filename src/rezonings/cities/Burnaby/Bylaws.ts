import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, IPartialRezoningDetail, ZoningStatus, checkGPTJSON } from '../../../repositories/RezoningsRepository'
import { chatGPTTextQuery } from '../../AIUtilities'
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

    let partialRezoningDetailsRaw = await chatGPTTextQuery(getBurnabyBaseGPTQuery(infoString))
    if (!checkGPTJSON(partialRezoningDetailsRaw)) {
      console.warn(chalk.bgYellow('Partial rezoning details GPT JSON is invalid, running again'))
      partialRezoningDetailsRaw = await chatGPTTextQuery(getBurnabyBaseGPTQuery(infoString))
      if (!checkGPTJSON(partialRezoningDetailsRaw)) {
        const errorMessage = 'Partial rezoning details GPT JSON is invalid 2nd time, skipping'
        console.error(chalk.bgRed(errorMessage))
        console.error(chalk.red(JSON.stringify(partialRezoningDetailsRaw, null, 2)))
        ErrorsRepository.addError(news)
        throw new Error(errorMessage)
      }
    }

    // Cast as partial rezoning details
    const partialRezoningDetails = partialRezoningDetailsRaw as IPartialRezoningDetail

    // No need to get stats, can't get it from the available documents

    // Figure out if approval or denial
    const isApproval = news.title.toLowerCase().includes('final adoption')
    const isDenial = news.title.toLowerCase().includes('abandonment')
    let status: ZoningStatus
    if (isApproval) status = 'approved'
    else if (isDenial) status = 'denied'
    else throw new Error(`Unknown status for ${news.title}`)

    // Return full rezoning details object
    return {
      id: generateID('rez'),
      ...partialRezoningDetails,
      rezoningId: cleanBurnabyRezoningId(partialRezoningDetails.rezoningId),
      city: news.city,
      metroCity: news.metroCity,
      urls: news.reportUrls.map((urlObject) => {
        return {
          date: news.date,
          title: urlObject.title,
          url: urlObject.url,
          type: 'bylaw'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl
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
