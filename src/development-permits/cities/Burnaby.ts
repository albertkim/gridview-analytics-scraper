import moment from 'moment'
import puppeteer from 'puppeteer'
import { downloadPDF, generatePDFTextArray, parsePDF } from '../../rezonings/PDFUtilities'
import { IFullRezoningDetail } from '../../repositories/RecordsRepository'
import { generateID } from '../../repositories/GenerateID'
import { formatDateString } from '../../scraper/BulkUtilities'
import { AIGetPartialRecords } from '../../rezonings/AIUtilitiesV2'
import { RecordsRepository as RecordsRepositoryConstructor } from '../../repositories/RecordsRepositoryV2'

const startUrl = 'https://www.burnaby.ca/services-and-payments/permits-and-applications/building-permits-issued-and-tabulation-reports'

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
}

const RecordsRepository = new RecordsRepositoryConstructor('draft')

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

export async function analyze(options: IOptions) {

  const developmentPermitUrls = await scrape(options)

  for (const urlObject of developmentPermitUrls) {

    const pdf = await downloadPDF(urlObject.url)
    const parsedArray = await generatePDFTextArray(pdf)

    for (const parsed of parsedArray) {

      // Find the number of instances of "Site Address" in the text
      const regex = /Site Address/g
      const matches = parsed.match(regex)
      const uniqueMatches = new Set(matches)
      const expectedRecords = uniqueMatches.size || 1

      const response = await AIGetPartialRecords(parsed, expectedRecords, 'BLDXX-XXXXX where X is a number', {
        introduction: 'Identify only the items that refer to new developments, not alterations. Number of units is usually a number listed right after the $ value',
        fieldsToAnalyze: ['building type', 'stats']
      })

      // NOTE: For now, the $ value of work is not incorporated, something to think about for the future.
      // My current thinking is that not enough cities publish these values.
      const records: IFullRezoningDetail[] = response.map((permit) => {
        return {
          id: generateID('dev'),
          type: 'development permit',
          city: 'Burnaby',
          metroCity: 'Metro Vancouver',
          applicationId: permit.applicationId,
          address: permit. address,
          applicant: permit.applicant,
          behalf: permit.behalf,
          description: permit.description,
          buildingType: permit.buildingType,
          status: 'approved',
          stats: permit.stats,
          zoning: permit.zoning,
          dates: {
            appliedDate: null,
            publicHearingDate: null,
            approvalDate: urlObject.date,
            denialDate: null,
            withdrawnDate: null
          },
          reportUrls: [
            {
              title: urlObject.title,
              url: urlObject.url,
              date: urlObject.date,
              status: 'approved'
            }
          ],
          minutesUrls: [],
          location: {
            latitude: null,
            longitude: null
          },
          createDate: moment().format('YYYY-MM-DD'),
          updateDate: moment().format('YYYY-MM-DD')
        }
      })

      for (const record of records) {
        RecordsRepository.upsertRecords('development permit', [record])
      }


    }

  }

}
