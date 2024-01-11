import moment from 'moment'
import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail } from '../../../repositories/RezoningsRepository'
import { imageQuery } from '../../AIUtilities'
import { cleanRichmondRezoningId } from './RichmondUtilities'
import { downloadPDF, generateScreenshotFromPDF } from '../../PDFUtilities'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'

export function checkIfBylaw(news: IMeetingDetail) {
  const hasReportURLs = news.reportUrls.length > 0
  const isCouncil = news.meetingType === 'Council Minutes'
  const titleHasBylaw = news.title.toLowerCase().includes('bylaws for adoption')
  return hasReportURLs && isCouncil && titleHasBylaw
}

export async function parseBylaw(news: IMeetingDetail): Promise<IFullRezoningDetail[]> {

  try {

    // Parsing Richmond zoning bylaws are tricky because they only use scanned PDFs and don't show much info about the PDF before opening.
    // But I found that if you find the bylaw number (10308), the PDF url includes the number as Bylaw_12345[more_numbers].pdf
    // Strategy: Write code to parse all the potential zoning/community bylaw numbers. Then find the relevant PDFs, and send the image to GPT 4 Vision.

    // Case insensitive, find all 5 digit numbers that follow the format "Richmond Zoning Bylaw No. (4 digit number), Amendment Bylaw No. (5 digit number)" or "Community Plan Bylaw (4 digit number), Amendment Bylaw No. (5 digit number)", and return an array of the 5 digit numbers
    const zoningBylawMatches = news.contents.match(/(Richmond\sZoning\sBylaw\sNo\.\s\d{4},\sAmendment\sBylaw\sNo\.\s\d{5})|(Community\sPlan\sBylaw\s\d{4},\sAmendment\sBylaw\sNo\.\s\d{5})/gi) || []
    // Return an array of the 5 digit numbers as a string array
    const zoningBylawNumbersArray = zoningBylawMatches.map((match) => {
      const bylawNumberMatches = match.match(/\d{5}/g) || []
      return bylawNumberMatches[0]
    })

    const matchingURLs = news.reportUrls
      .filter((urlObject) => {
        return zoningBylawNumbersArray.some((bylawNumber) => {
          return urlObject.url.includes(`${bylawNumber}`)
        })
      })
      .map((urlObject) => urlObject.url)

    const bylawData: {address: string, rezoningId: string | null}[] = []

    for (const pdfUrl of matchingURLs) {

      try {

        const pdfData = await downloadPDF(pdfUrl)
        const screenshot = await generateScreenshotFromPDF(pdfData, 0)
        const imageQueryResponse = await imageQuery(`
          Given the following data, identify if it is related to a community plan/rezoning. If so, read it carefully and return the following JSON format. Otherwise just return an error.
          {
            address: address in question - if multiple addresses in the same section comma separate
            rezoningId: rezoning id usually in the format "RZ XX-XXXXX" where the Xs are numbers - reformat if necessary - null if not found
          }
        `, screenshot)

        console.log(imageQueryResponse)

        if (imageQueryResponse.address) {
          bylawData.push(imageQueryResponse)
        } else {
          console.log(chalk.bgYellow(`Image query response did not return an address for: ${pdfUrl}`))
        }

      } catch (error) {

        continue

      }

    }

    return bylawData.map((bylaw) => {
      return {
        ...bylaw,
        city: news.city,
        metroCity: news.metroCity,
        address: bylaw.address,
        rezoningId: cleanRichmondRezoningId(bylaw.rezoningId || ''),
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
          fsr: null
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
    console.error(error)
    ErrorsRepository.addError(news)
    return []
  }

}
