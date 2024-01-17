import puppeteer from 'puppeteer'
import moment from 'moment'
import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { runPromisesInBatches } from '../../BulkUtilities'
import { getMeetingList } from './GetMeetingList'
import { scrapeMeetingPageAfterMar2020, scrapeMeetingPageBeforeMar2020 } from './GetMeetingDetails'

const startUrl = 'https://pub-burnaby.escribemeetings.com/?FillWidth=1'

interface IOptions {
  startDate: string | null
  endDate: string | null
  concurrency: number
  headless?: boolean | 'new'
  verbose?: boolean
}

export async function scrape(options: IOptions): Promise<IMeetingDetail[]> {

  const browser = await puppeteer.launch({
    headless: options.headless !== undefined ? options.headless : 'new'
  })

  const page = await browser.newPage()

  // Burnaby's website requires desktop size to show tabular data
  page.setViewport({
    width: 1980,
    height: 1080
  })

  if (options.verbose) {
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(msg.text())
      }
    })
  }

  // Inject jQuery into the page
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

  // Still need to go to the start URL first and select "past" because the page seems to remember the "past" selection for future URLs
  await page.goto(startUrl)

  await page.waitForSelector('#maincontent')

  await page.evaluate(async () => {
    $('button:contains("Past")').trigger('click')
  })

  await page.waitForSelector('.PastMeetingTypesName')

  await page.evaluate(async () => {
    $('a:contains("City Council Meeting")').trigger('click')
  })

  const meetingObjects = await getMeetingList(page, {startDate: options.startDate, endDate: options.endDate})

  // Scrape pages in parallel
  const promiseArray = meetingObjects.map((meeting, i) => {

    return async () => {

      try {

        const parallelPage = await browser.newPage()
        parallelPage.setViewport({
          width: 1980,
          height: 1080
        })

        console.log(`Scraping meeting details: ${i}/${meetingObjects.length} ${meeting.url}`)

        let meetingResults: IMeetingDetail[] = []
        // Mar 9, 2020 was the last meeting before the format changed
        if (moment(meeting.date).isAfter('2020-03-10')) {
          meetingResults = await scrapeMeetingPageAfterMar2020(parallelPage, meeting.url, meeting.date, meeting.meetingType)
        } else {
          meetingResults = await scrapeMeetingPageBeforeMar2020(parallelPage, meeting.url, meeting.date, meeting.meetingType)
        }

        if (meetingResults.length > 0) {
          console.log(chalk.bgGreen(`Scraped meeting details for ${meetingResults[0].date} - ${meetingResults.length} items`))
        } else {
          console.log(chalk.bgRed(`No meeting details for ${meeting.url}`))
        }

        await parallelPage.close()

        return meetingResults

      } catch (error) {

        console.error(chalk.bgRed(meeting.url))
        return []

      }

    }
  })

  const results: IMeetingDetail[] = (await runPromisesInBatches(promiseArray, options.concurrency)).flat()

  await browser.close()
  console.log(`Browser closed`)

  return results

}
