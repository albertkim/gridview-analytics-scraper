import chalk from 'chalk'
import puppeteer from 'puppeteer'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { getMeetingList } from './GetMeetingList'
import { getMeetingDetails } from './GetMeetingDetails'
import { runPromisesInBatches } from '../../BulkUtilities'

const startUrl = 'https://citycouncil.richmond.ca/decisions/search/results.aspx?QB0=AND&QF0=ItemTopic%7cResolutionText%7cFullText%7cSubject&QI0=&QB1=AND&QF1=Date&QI1=&QB4=AND&QF4=Date&QI4=%3e%3d%40DATE-1820&TN=minutes&AC=QBE_QUERY&BU=https%3a%2f%2fcitycouncil.richmond.ca%2fdecisions%2fsearch%2fdefault.aspx&RF=WebBriefDate&'
const maxNumberOfPages = 500

interface IOptions {
  startDate: string | null
  endDate: string | null
  concurrency: number
  headless?: boolean | 'new'
  verbose?: boolean
}

export async function scrape(options: IOptions): Promise<IMeetingDetail[]> {

  const browser = await puppeteer.launch({
    headless: options.headless || 'new'
  })

  const page = await browser.newPage()

  if (options.verbose) {
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(msg.text())
      }
    })
  }

  await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js' })

  let meetingList: Array<{ url: string, date: string }> = []

  let nextPageUrl: string | null = startUrl

  for (let i = 0; i < maxNumberOfPages; i++) {

    if (!nextPageUrl) {
      break
    }

    const meetingListResult = await getMeetingList(page, nextPageUrl, { startDate: options.startDate, endDate: options.endDate })
    const count = meetingListResult.data.length > 0 ? chalk.green(`${meetingListResult.data.length} items`) : '0 items'
    console.log(`Scraped list page up to: ${meetingListResult.earliestDate}, ${count}, ${i}/${maxNumberOfPages} max pages`)

    meetingList.push(...meetingListResult.data)
    nextPageUrl = meetingListResult.nextPageUrl

  }

  // Get meeting details in parallel
  const promiseArray = meetingList.map((m, i) => {

    return async () => {

      try {

        const parallelPage = await browser.newPage()

        console.log(`Scraping page details: ${i}/${meetingList.length}`)
        const meetingDetails = await getMeetingDetails(parallelPage, m.url, m.date)

        // Do not log progress on meeting details, there are too many
        // Every page is expected to have meeting details

        await parallelPage.close()

        return meetingDetails

      } catch (error) {

        console.log(chalk.bgRed(m.url))
        console.log(error)
        return null

      }

    }
  })

  const results = (await runPromisesInBatches(promiseArray, options.concurrency)).filter((m) => m !== null) as IMeetingDetail[]

  await browser.close()
  console.log(`Browser closed`)

  return results

}
