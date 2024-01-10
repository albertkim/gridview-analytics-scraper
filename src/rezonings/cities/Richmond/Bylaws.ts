import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'
import { chatGPTTextQuery } from '../../GPTUtilities'
import { cleanRichmondRezoningId } from './RichmondUtilities'

interface IBylawData {
  address: string
  rezoningId: string
  status: 'approved' | 'denied'
}

export function checkIfBylaw(news: IMeetingDetail) {
  const hasReportURLs = news.reportUrls.length > 0
  const isCouncil = news.meetingType === 'Council Minutes'
  const titleHasBylaw = news.title.toLowerCase().includes('bylaws for adoption')
  return hasReportURLs && isCouncil && titleHasBylaw
}

export async function parseBylaw(news: IMeetingDetail): Promise<IFullRezoningDetail | null> {

  try {

    const GPTTextResponse = await chatGPTTextQuery(`
    Identify if the given text is a Richmond zoning bylaw approval/denial. If so, return the following in JSON format. Otherwise return a {error: message}.
      {
        address: address - usually in the brackets,
        rezoningId: in the format of RZ 12-123456 - usually in the brackets,
        status: one of approved or denied
      }
      Description: ${news.contents}
    `)
    const bylawDetailRaw = JSON.parse(GPTTextResponse.choices[0].message.content!)

    if (bylawDetailRaw.error) {
      return null
    }

    const bylawDetail = bylawDetailRaw as IBylawData
    const fullRezoningDetail: IFullRezoningDetail = {
      ...bylawDetail,
      city: news.city,
      metroCity: news.metroCity,
      rezoningId: cleanRichmondRezoningId(bylawDetail.rezoningId),
      applicant: null,
      behalf: null,
      description: '',
      type: null,
      urls: news.reportUrls.map((urlObject) => {
        return {
          date: news.date,
          title: urlObject.title,
          url: urlObject.url,
          type: 'bylaw'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        url: news.minutesUrl,
        date: news.date
      }] : [],
      stats: {
        buildings: null,
        stratas: null,
        rentals: null,
        hotels: null,
        fsr: null,
        height: null
      },
      zoning: {
        previousZoningCode: null,
        previousZoningDescription: null,
        newZoningCode: null,
        newZoningDescription: null
      },
      status: bylawDetail.status,
      dates: {
        appliedDate: null,
        publicHearingDate: null,
        approvalDate: bylawDetail.status === 'approved' ? news.date : null,
        denialDate: bylawDetail.status === 'denied' ? news.date : null,
        withdrawnDate: null
      },
      location: {
        latitude: null,
        longitude: null
      },
      createDate: moment().format('YYYY-MM-DD'),
      updateDate: moment().format('YYYY-MM-DD')
    }

    return fullRezoningDetail

  } catch (error) {
    console.error(error)
    return null
  }

}
