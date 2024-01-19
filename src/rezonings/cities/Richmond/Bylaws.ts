import moment from 'moment'
import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, ZoningStatus } from '../../../repositories/RezoningsRepository'
import { imageQuery } from '../../AIUtilities'
import { cleanRichmondRezoningId } from './RichmondUtilities'
import { downloadPDF, generateScreenshotFromPDF } from '../../PDFUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { generateID } from '../../../repositories/GenerateID'

export function checkIfBylaw(news: IMeetingDetail) {
  const isRichmond = news.city === 'Richmond'
  const hasReportURLs = news.reportUrls.length > 0
  const isCouncil = news.meetingType === 'Council Minutes'
  const titleHasBylaw = news.title.toLowerCase().includes('bylaws for adoption')
  return isRichmond && hasReportURLs && isCouncil && titleHasBylaw
}

export async function parseBylaw(news: IMeetingDetail): Promise<IFullRezoningDetail[]> {

  try {

    // Parsing Richmond zoning bylaws are tricky because they only use scanned PDFs and don't show much info about the PDF before opening.
    // Strategy: Scan every PDF with Google Cloud Vision and find ones that relate to zoning bylaws

    const bylawData: {address: string, rezoningId: string | null, url: {title: string, url: string}}[] = []

    for (const pdfUrl of news.reportUrls) {

      try {

        const pdfData = await downloadPDF(pdfUrl.url)
        const screenshot = await generateScreenshotFromPDF(pdfData, 0)
        const imageQueryResponse = await imageQuery(`
          Given the following data, identify if it is related to a community plan/zoning bylaw. If so, read it carefully and return the following JSON format. Otherwise just return an error.
          {
            address: address in question - if multiple addresses in the same section comma separate - null if not found
            rezoningId: rezoning id in the format "RZ XX-XXXXX" where the Xs are numbers - reformat if necessary - null if not found
          }
        `, screenshot)

        if (imageQueryResponse.address && imageQueryResponse.rezoningId) {
          bylawData.push({
            ...imageQueryResponse,
            url: pdfUrl
          })
        } else {
          console.log(chalk.bgYellow(`Image query response did not return an address for: ${pdfUrl.url}`))
        }

      } catch (error) {

        console.error(error)
        continue

      }

    }

    // Figure out if approved, denied, or withdrawn
    let status: ZoningStatus = 'approved'
    if (news.title.toLowerCase().includes('defeated')) status = 'denied'
    if (news.title.toLowerCase().includes('withdrawn')) status = 'withdrawn'

    return bylawData.map((bylaw) => {
      return {
        id: generateID('rez'),
        city: news.city,
        metroCity: news.metroCity,
        address: bylaw.address,
        rezoningId: cleanRichmondRezoningId(bylaw.rezoningId || ''),
        applicant: null,
        behalf: null,
        description: '',
        type: null,
        urls: [{
          title: bylaw.url.title,
          url: bylaw.url.title,
          date: news.date,
          type: status
        }],
        minutesUrls: news.minutesUrl ? [{
          url: news.minutesUrl,
          date: news.date,
          type: status
        }] : [],
        stats: {
          buildings: null,
          stratas: null,
          rentals: null,
          hotels: null,
          fsr: null,
          storeys: null
        },
        zoning: {
          previousZoningCode: null,
          previousZoningDescription: null,
          newZoningCode: null,
          newZoningDescription: null
        },
        status: 'approved',
        dates: {
          appliedDate: null,
          publicHearingDate: null,
          approvalDate: news.date,
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
    })

  } catch (error) {
    console.error(chalk.bgRed('Error parsing bylaw'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return []
  }

}
