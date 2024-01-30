import moment from 'moment'
import puppeteer from 'puppeteer'

const startUrl = 'https://www.burnaby.ca/services-and-payments/permits-and-applications/building-permits-issued-and-tabulation-reports'

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

  await page.goto(startUrl)

  const developmentPermitUrls = await page.evaluate(async () => {
  
    // Inject jQuqery into the page
    const jqueryScript = document.createElement('script')
    jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js'
    jqueryScript.type = 'text/javascript'
    document.getElementsByTagName('head')[0].appendChild(jqueryScript)
    await new Promise((resolve) => {setTimeout(resolve, 1000)})

    const urls = $('.accordion a').map((index, element) => {
      return {
        title: $(element).text().trim(),
        url: new URL($(element).attr('href')!, window.location.origin).href
      }
    }).get()

    return urls

  })

  // Filter by date
  const filteredDevelopmentPermitUrls = developmentPermitUrls.filter((urlObject) => {
    const rawDate = urlObject.title.split('.pdf')[0]
    const date = moment(new Date(rawDate)).format('YYYY-MM-DD')
    if (options.startDate) {
      if (moment(date).isBefore(options.startDate!)) {
        return false
      }
    }
    if (options.endDate) {
      if (moment(date).isSameOrAfter(options.endDate!)) {
        return false
      }
    }
    return true
  })

  return filteredDevelopmentPermitUrls

}

export async function analyze(options: IOptions) {

  const developmentPermitUrls = await scrape(options)

  const developmentPermits = []

  for (const urlObject of developmentPermitUrls) {

  }

}
