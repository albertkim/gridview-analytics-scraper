import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { findApplicationIDsFromTemplate } from '../../../utilities/RegexUtilities'
import { FullRecord } from '../../../repositories/FullRecord'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'

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
export async function parseBylaw(news: IMeetingDetail): Promise<FullRecord[]> {

  try {

    const infoString = `${news.title} - ${news.contents}`

    // Get rezoning IDs
    const rezoningIds = findApplicationIDsFromTemplate('REZ #XX-XX', infoString)
    const rezoningId = rezoningIds.length > 0 ? rezoningIds[0] : null

    if (!rezoningId) {
      console.log(chalk.bgRed(`Error finding rezoning ID from application - ${news.title} - ${news.date} - ${news.contents}`))
      return []
    }

    const response = await AIGetPartialRecords(infoString,
      {
        applicationId: 'ID in the format of REZ #XX-XX where X is a number - format if necessary',
        fieldsToAnalyze: ['building type', 'status'],
        status: 'one of "approved", "denied", or "withdrawn"',
        expectedWords: [rezoningId]
      }
    )

    if (!response || response.length === 0) {
      console.log(chalk.bgRed(`Error parsing application - ${news.title} - ${news.date} - ${news.contents}`))
      return []
    }

    return response
      .filter((record) => record.applicationId)
      .map((record) => {
        const status = record.status!
        return new FullRecord({
          city: 'Burnaby',
          metroCity: 'Metro Vancouver',
          type: 'rezoning',
          applicationId: record.applicationId,
          address: record.address,
          applicant: record.applicant,
          behalf: record.behalf,
          description: record.description,
          status: status!,
          dates: {
            appliedDate: null,
            publicHearingDate: null,
            approvalDate: status === 'approved' ? news.date : null,
            denialDate: status === 'denied' ? news.date : null,
            withdrawnDate: status === 'withdrawn' ? news.date : null
          },
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
          }] : []
        })
      })

  } catch (error) {
    console.error(chalk.bgRed('Error parsing bylaw'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return []
  }

}
