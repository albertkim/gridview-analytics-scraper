import chalk from 'chalk'
import puppeteer from 'puppeteer'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { getMeetingList } from './GetMeetingList'
import { getMeetingDetails } from './GetMeetingDetails'
import { formatDateString, runPromisesInBatches } from '../../BulkUtilities'

const startUrl = 'https://covapp.vancouver.ca/councilMeetingPublic/CouncilMeetings.aspx'
const maxNumberOfPages = 200

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

  // Vancouver website requires desktop size to show tabular data
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

  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

  await page.goto(startUrl)

  // Wait for the text 'Previous Meetings' somewhere on the page, then click

  await page.waitForFunction(
    text => !!Array.from(document.querySelectorAll('*')).find(el => el.textContent!.includes(text)),
    {},
    'Previous Meetings'
  )

  await page.evaluate(async () => {
    $('a:contains("Previous Meetings")').trigger('click')
  })
  await new Promise((resolve) => {setTimeout(resolve, 500)})

  const meetingList: {url: string, meetingType: string, date: string}[] = []

  for (let i = 0; i < maxNumberOfPages; i++) {
    const meetingListResult = await getMeetingList(page, { startDate: options.startDate, endDate: options.endDate })
    const count = meetingListResult.data.length > 0 ? chalk.green(`${meetingListResult.data.length} items`) : '0 items'
    console.log(`Scraped list page up to: ${meetingListResult.earliestDate}, ${count}, ${i}/${maxNumberOfPages} max pages`)

    meetingList.push(...meetingListResult.data)

    if (!meetingListResult.goToNextPage) {
      break
    }

    // Go to next page
    await page.evaluate(async () => {
      $('.ListNavigation_Next').trigger('click')
    })
    await new Promise((resolve) => {setTimeout(resolve, 500)})
  }

  // Get meeting details in parallel
  const promiseArray = meetingList.map((m, i) => {

    return async () => {

      try {

        const parallelPage = await browser.newPage()

        console.log(`Scraping page details: ${i}/${meetingList.length}`)

        const meetingDetails = await getMeetingDetails(parallelPage, m.url, m.date)

        console.log(chalk.bgGreen(`Scraped meeting details for ${meetingDetails.length > 0 ? meetingDetails[0].date : '-'} - ${meetingDetails.length} items`))

        await parallelPage.close()

        return meetingDetails

      } catch (error) {

        console.log(chalk.bgRed(m.url))
        console.log(error)
        return []

      }

    }

  })

  // For each parent page item, scrape the details
  const results = (await runPromisesInBatches(promiseArray, options.concurrency)).flat()

  await browser.close()
  console.log(`Browser closed`)

  return results

}
