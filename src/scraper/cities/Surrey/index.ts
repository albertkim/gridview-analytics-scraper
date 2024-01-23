import puppeteer from 'puppeteer'
import { getMeetingList } from './GetMeetingList'

interface IOptions {
  startDate: string | null
  endDate: string | null
  concurrency: number
  headless?: boolean | 'new'
  verbose?: boolean
}

export async function scrape(options: IOptions) {

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

  // Don't need to use concurrency, Surrey website is fast and does not use JavaScript
  const meetingList = await getMeetingList(page, { startDate: options.startDate, endDate: options.endDate })

  // Surrey does not have meeting details to scrape, everything is a PDF URL
  // Because everything is a PDF, read and parse the decisions from the meeting minutes

  return meetingList

}
