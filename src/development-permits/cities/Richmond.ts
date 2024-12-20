import moment from 'moment'
import puppeteer from 'puppeteer'
import chalk from 'chalk'
import { AIGetPartialRecords } from '../../utilities/AIUtilitiesV2'
import { chatGPTJSONQuery } from '../../utilities/AIUtilities'
import { formatDateString } from '../../scraper/BulkUtilities'
import { RecordsRepository as RecordsRepositoryConstructor } from '../../repositories/RecordsRepositoryV2'
import { parseCleanPDF } from '../../utilities/PDFUtilitiesV2'
import { FullRecord, ZoningStatus } from '../../repositories/FullRecord'
import { findApplicationIDsFromTemplate } from '../../utilities/RegexUtilities'

interface IOptions {
  startDate: string
  endDate: string
  headless?: boolean | 'new'
}

const RecordsRepository = new RecordsRepositoryConstructor('draft')

// Scrape development permit meeting minutes
async function scrape(options: IOptions) {

  const browser = await puppeteer.launch({
    headless: true
  })

  const page = await browser.newPage()

  // Get years in YYYY string format between and including startDate and endDate
  const years: string[] = []
  let currentYear = moment(options.startDate).year()
  const endYear = moment(options.endDate).year()
  while (currentYear <= endYear) {
    years.push(currentYear.toString())
    currentYear++
  }

  const minuteUrlObjects: {date: string, minutesUrl: string, contents: string, reports: {title: string, url: string}[]}[] = []

  for (const year of years) {

    const yearUrl = `https://citycouncil.richmond.ca/schedule/WebAgendaMinutesList.aspx?Category=8&Year=${year}`
    await page.goto(yearUrl)

    const results = await page.evaluate(() => {
      // Get all <a> tags with the word "minutes" (case insensitive) and get the closest parent <tr>
      const tableRows = $('a:contains("Minutes")').closest('tr').closest('td')
      const results = tableRows
        .map((index, element) => {
          const date = $(element).find("span[id$='OpenMeetingDate']").text().trim()
          const minutesUrl = $(element).find('a:contains("Minutes")')?.attr('href')
          return {
            date: date,
            minutesUrl: minutesUrl ? new URL(minutesUrl, window.location.origin).href : null
          }
        })
        .get()
        .filter((item) => {
          return !!item.date && !!item.minutesUrl 
        })
      return results as {date: string, minutesUrl: string}[]
    })

    results.forEach((result) => {
      result.date = formatDateString(result.date)
    })

    // Only add results that are within the date range
    const filteredResults = results.filter((result) => {
      return moment(result.date).isBetween(options.startDate, options.endDate, null, '[)')
    }).map((result) => {
      return {
        date: result.date,
        minutesUrl: result.minutesUrl,
        contents: '',
        reports: []
      }
    })

    minuteUrlObjects.push(...filteredResults)

  }

  // For each meeting minute, get the contents and the development permit reports
  for (const minute of minuteUrlObjects) {
    await page.goto(minute.minutesUrl)
    const result = await page.evaluate(() => {
      // Get all <a> tags that include the words "development" and "permit", case insensitive
      const contents = $('.content').text()
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .replace(/\n+/g, '\n')
      const reportUrls = $('.content a')
        .filter((index, element) => {
          const text = $(element).text().toLowerCase()
          return text.includes('permit') && text.includes('development')
        })
        .map((index, element) => {
          return {
            url: new URL($(element).attr('href')!, window.location.origin).href,
            title: $(element).text().trim()
          }
        })
        .get()
      return {
        contents: contents,
        reportUrls: reportUrls
      }
    })
    minute.contents = result.contents
    minute.reports = result.reportUrls
  }

  browser.close()

  return minuteUrlObjects

}

// Get every pdf <a> link that relates to a development permit.
// Summarize the entire .contents of the details page to get the permit decision status
// Combine permit details with the decision status and the date of the meeting
export async function analyze(options: IOptions) {

  const minutes = await scrape(options)

  console.log(`Richmond development permits - ${minutes.length} meetings identified`)

  for (const meeting of minutes) {

    // AI summary of which permits were approved
    const developmentPermitDecisionResponse = await chatGPTJSONQuery(`
      You are an expert in land use planning and development. Given the following text, identify development permits (XX-XXXXXX where X is a number, usually near the start of the document, do not mention any RZ XX-XXXXXX codes). Return the data in the following JSON format:
      {
        data: {
          developmentPermitId: string in the format of XX-XXXXXX,
          status: one of "approved", "applied", "denied", "withdrawn"
        }[]
      }
      Make sure you read carefully, and format your data accurately.
      Here is the text: ${meeting.contents}
    `)

    if (!developmentPermitDecisionResponse || !developmentPermitDecisionResponse.data) {
      console.log(chalk.red(`No decisions response for Richmond development permit meeting ${meeting.date}`))
      continue
    }

    const developmentPermitDecisions = developmentPermitDecisionResponse.data as {developmentPermitId: string, status: string}[]

    for (const report of meeting.reports) {

      // Note that some PDF reports may be image-based
      const parsedReport = await parseCleanPDF(report.url, {maxPages: 3})

      if (!parsedReport) {
        console.log(chalk.red(`No parsed report for - ${meeting.date} - ${report.url}`))
        continue
      }

      // All permit numbers should be on the first report page (about 120 words of the PDF)
      const permitNumbers = findApplicationIDsFromTemplate('DP XX-XXXXXX', parsedReport)

      if (!permitNumbers || permitNumbers.length === 0) {
        console.log(chalk.red(`No Richmond DP XX-XXXXXX permit number found for ${meeting.date} - ${report.url}`))
        continue
      }

      const response = await AIGetPartialRecords(parsedReport, {
        instructions: 'Identify only the development permits that refer to new developments, not alterations.',
        applicationId: 'file number in the format of DP XX-XXXXXX where X is a number (do not mention RZ XX-XXXXXX codes)',
        fieldsToAnalyze: ['building type', 'stats'],
        expectedWords: permitNumbers
      })

      if (response.length === 0) {
        console.log(chalk.yellow(`No new development DPs found in ${report.url}`))
        continue
      }

      for (const responseItem of response) {

        // Find the development permit by doing a search on only the XX-XXXXXX part (exclude the DP) and then getting the status string, make into lowercase
        const permitNumber = responseItem.applicationId

        if (!permitNumber) {
          console.log(chalk.red(`No permit number found for Richmond - ${meeting.minutesUrl} - skipping`))
          continue
        }

        // NOTE: developmentPermitDecisions contains XX-XXXXXX, a subset of DP XX-XXXXXX
        let status = developmentPermitDecisions.find((permit) => permitNumber.includes(permit.developmentPermitId))?.status.toLowerCase() as ZoningStatus
  
        // DP status matching may not work
        if (!status) {
          console.log(chalk.red(`No matching status for Richmond ${permitNumber} - ${meeting.minutesUrl} - skipping`))
          console.log(chalk.yellow(JSON.stringify(responseItem)))
          console.log(chalk.yellow(JSON.stringify(developmentPermitDecisions)))
          continue
        }
  
        // Only add approved permits
        if (status !== 'approved') {
          console.log(chalk.yellow(`Richmond ${permitNumber} not approved - ${status} - ${meeting.minutesUrl} - skipping`))
          continue
        }

        const record = new FullRecord({
          city: 'Richmond',
          metroCity: 'Metro Vancouver',
          type: 'development permit',
          applicationId: permitNumber, // Use the regex permit number
          address: responseItem.address,
          applicant: responseItem.applicant,
          behalf: responseItem.behalf,
          description: responseItem.description,
          rawSummaries: responseItem.rawSummaries.map((summaryObject) => {
            return {
              summary: summaryObject.summary,
              date: meeting.date,
              status: status,
              reportUrl: report.url
            }
          }),
          buildingType: responseItem.buildingType,
          status: status,
          dates: {
            appliedDate: null,
            publicHearingDate: null,
            approvalDate: meeting.date,
            denialDate: null,
            withdrawnDate: null
          },
          stats: responseItem.stats,
          zoning: responseItem.zoning,
          reportUrls: [
            {
              url: report.url,
              title: report.title,
              date: meeting.date,
              status: status
            }
          ],
          minutesUrls: [
            {
              url: meeting.minutesUrl,
              date: meeting.date,
              status: status
            }
          ]
        })
  
        RecordsRepository.upsertRecords('development permit', [record])

      }

    }

  }

}
