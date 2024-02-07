import puppeteer from 'puppeteer'
import { getMeetingList } from './GetMeetingList'

interface IOptions {
  startDate: string | null
  endDate: string | null
  concurrency: number
  headless?: boolean
  verbose?: boolean
}

export async function scrape(options: IOptions) {

  const browser = await puppeteer.launch({
    headless: options.headless
  })

  const page = await browser.newPage()

  if (options.verbose) {
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(msg.text())
      }
    })
  }

  // Don't need to use concurrency, Surrey website is fast and does not use JavaScript
  // Because everything is a PDF, read and parse the decisions from the meeting minutes
  const meetingList = await getMeetingList(page, { startDate: options.startDate, endDate: options.endDate })

  return meetingList

}
