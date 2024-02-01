import moment from 'moment'
import puppeteer from 'puppeteer'
import chalk from 'chalk'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'
import { chatGPTTextQuery } from '../../rezonings/AIUtilities'
import { IFullRezoningDetail, RecordsRepository } from '../../repositories/RecordsRepository'
import { generateID } from '../../repositories/GenerateID'
import { formatDateString } from '../../scraper/BulkUtilities'

const startUrl = 'https://www.burnaby.ca/services-and-payments/permits-and-applications/building-permits-issued-and-tabulation-reports'

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
}

async function scrape(options: IOptions) {

  const browser = await puppeteer.launch({
    headless: options.headless !== undefined ? options.headless : 'new'
  })

  const page = await browser.newPage()

  await page.goto(startUrl)

  const developmentPermitUrls = await page.evaluate(async () => {

    const jqueryScript = document.createElement('script')
    jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js'
    jqueryScript.type = 'text/javascript'
    document.getElementsByTagName('head')[0].appendChild(jqueryScript)

    await new Promise((resolve) => {setTimeout(resolve, 1000)})

    const urls = $('.accordion a').map((index, element) => {
      return {
        title: $(element).text().trim(), // ex. February 1, 2023.pdf
        url: new URL($(element).attr('href')!, window.location.origin).href,
      }
    }).get()

    return urls

  })

  // Filter by date
  const filteredDevelopmentPermitUrls = developmentPermitUrls
    .map((urlObject) => {
      return {
        ...urlObject,
        date: formatDateString(urlObject.title.replace('.pdf', ''))
      }
    })
    .filter((urlObject) => {
      if (options.startDate) {
        if (moment(urlObject.date).isBefore(options.startDate!)) {
          return false
        }
      }
      if (options.endDate) {
        if (moment(urlObject.date).isSameOrAfter(options.endDate!)) {
          return false
        }
      }
      return true
    })

  return filteredDevelopmentPermitUrls

}

interface IDevelopmentPermitGPTItem {
  permitNumber: string
  address: string
  buildingType: string
  value: number
  numberOfUnits: number
  applicant: string
  description: string
}

export async function analyze(options: IOptions) {

  const developmentPermitUrls = await scrape(options)

  for (const urlObject of developmentPermitUrls) {

    const pdf = await downloadPDF(urlObject.url)
    const parsed = await parsePDF(pdf)
  
    const response = await chatGPTTextQuery(`
      Given the following text extracted from a PDF that represents development permit data, identify only permits that relate to the construction of new buildings, then give me the data in the following JSON data structure:
      {
        data: {
          permitNumber: usually in the format of BLDXX-XXXXX
          address: address in question, only include street address, not city or postal code
          buildingType: one of single-family residential (including duplexes), townhouse, mixed use (only if there is residential + commercial), multi-family residential (only if there is no commercial), industrial (manufacturing, utilities, etc.), commercial, or other (if demo or not a permit for a new building) - all lowercase
          value: $ value as a number
          numberOfUnits: number of units, usually a number listed right after the $ value
          applicant: name of applicant
          description: complete description of project
        }[]
      }
  
      Here is the text: ${parsed}
    `, '4')

    if (!response || response.error || !response.data) {
      console.log(chalk.red(`Error with Burnaby development permit: ${urlObject.date} - ${urlObject.url}`))
      continue
    }

    // NOTE: For now, the $ value of work is not incorporated, something to think about for the future.
    // My current thinking is that not enough cities publish these values.
    const parsedDevelopmentPermits: IFullRezoningDetail[] = response.data.map((permit: IDevelopmentPermitGPTItem) => {
      return {
        id: generateID('dev'),
        city: 'Burnaby',
        metroCity: 'Metro Vancouver',
        type: 'development permit',
        applicationId: permit.permitNumber,
        address: permit.address,
        applicant: permit.applicant,
        behalf: null,
        description: permit.description,
        buildingType: permit.buildingType,
        status: 'approved',
        date: urlObject.date,
        dates: {
          appliedDate: null,
          publicHearingDate: null,
          approvalDate: urlObject.date,
          denialDate: null,
          withdrawnDate: null
        },
        stats: {
          buildings: null,
          stratas: permit.numberOfUnits,
          rentals: null,
          hotels: null,
          fsr: null,
          storeys: null,
        },
        zoning: {
          previousZoningCode: null,
          previousZoningDescription: null,
          newZoningCode: null,
          newZoningDescription: null

        },
        reportUrls: [],
        minutesUrls: [],
        location: {
          latitude: null,
          longitude: null
        },
        createDate: moment().format('YYYY-MM-DD'),
        updateDate: moment().format('YYYY-MM-DD')
      }
    })

    RecordsRepository.upsertRecords('development permit', parsedDevelopmentPermits)

  }

}
