import chalk from 'chalk'
import puppeteer from 'puppeteer'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { getMeetingDetail } from './GetMeetingDetail'
import { getMeetingList } from './GetMeetingList'
import { runPromisesInBatches } from '../../BulkUtilities'

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

  if (options.verbose) {
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(msg.text())
      }
    })
  }

  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

  const meetingList = await getMeetingList(page, { startDate: options.startDate, endDate: options.endDate })

  // Get meeting details in parallel
  const promiseArray = meetingList.map((m, i) => {

    return async () => {

      try {

        const parallelPage = await browser.newPage()

        console.log(`Scraping page details: ${i}/${meetingList.length}`)
        const meetingDetails = await getMeetingDetail(parallelPage, m.url, m.date)

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
