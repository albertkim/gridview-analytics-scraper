import puppeteer, { Page } from 'puppeteer'
import { IMeetingDetail } from '../../repositories/RawRepository'
import moment from 'moment'
import chalk from 'chalk'

const startUrl = 'https://pub-burnaby.escribemeetings.com/?FillWidth=1'
const numberOfPastYears = 5

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
  verbose?: boolean
}

export async function scrape(options: IOptions): Promise<IMeetingDetail[]> {

  console.log(`Launching Puppeteer`)
  const browser = await puppeteer.launch({
    headless: options.headless !== undefined ? options.headless : 'new'
  })

  // Pass this page instance around instead of re-using a global variable
  console.log(`Opening browser new page`)
  const page = await browser.newPage()

  // Vancouver website requires desktop size to show tabular data
  page.setViewport({
    width: 1980,
    height: 1080
  })

  // Print browser page console events to this node script console
  if (options.verbose) {
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(msg.text())
      }
    })
  }

  // Inject jQuery into the page
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

  console.log(`Browser and page initialized`)

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

  const meetingObjects: {url: string, meetingType: string}[] = []

  for (let i = 0; i < numberOfPastYears; i++) {
    const newMeetingObjects = await scrapeMeetingListPage(page, moment().subtract(i, 'year').format('YYYY'))
    meetingObjects.push(...newMeetingObjects)
  }

  console.log(meetingObjects)

  let results: IMeetingDetail[] = []
  for (let i = 0; i < meetingObjects.length; i++) {
    console.log(chalk.bgWhite(`Scraping meeting details: ${i}/${meetingObjects.length}`))
    const meeting = meetingObjects[i]
    const meetingResults = await scrapeMeetingPage(page, meeting.url, meeting.meetingType)
    results = [...results, ...meetingResults].filter((r) => r.reportUrls.length > 0)
  }

  // Close the browser
  await browser.close()
  console.log(`Browser closed`)

  results.forEach((result) => {
    result.date = moment(new Date(result.date)).format('YYYY-MM-DD')
  })

  return results

}

// The Burnaby meting lists are paginated by year
async function scrapeMeetingListPage(page: Page, year: string): Promise<{url: string, meetingType: string}[]> {

  console.log(chalk.bgWhite(`Scraping ${year} meeting list page`))

  // Get all city council meetings (may not exist at the start of new year)
  await page.goto(`https://pub-burnaby.escribemeetings.com/?FillWidth=1&Year=${year}&Expanded=City%20Council%20Meeting`)
  await new Promise((resolve) => {setTimeout(resolve, 2000)})
  await page.waitForSelector('.MeetingTypeList:not([style*="display: none"])')

  const councilMeetingExists = await page.evaluate(async () => {
    const meetingTypes = $('.MeetingTypeList:visible .MeetingTypeNameText').map((index, element) => {
      return $(element).text().trim()
    }).get()
    return meetingTypes.includes('City Council Meeting')
  })

  let councilMeetingObjects: {url: string, meetingType: string}[] = []

  if (councilMeetingExists) {
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('.calendar-item')].some(e => e.parentElement!.style.display !== 'none')
    })
    councilMeetingObjects = await page.evaluate(async () => {
      const entries = $('.calendar-item .meeting-title-heading>a')
      const entryObjects = entries.map((index, element) => {
        return {
          url: (element as HTMLAnchorElement).href!,
          meetingType: $(element).text()
        }
      }).get()
      return entryObjects
    })
  }

  // Get all public hearings (may not exist at the start of new year)
  await page.goto(`https://pub-burnaby.escribemeetings.com/?FillWidth=1&Year=${year}&Expanded=Public%20Hearing`)
  await new Promise((resolve) => {setTimeout(resolve, 2000)})
  await page.waitForSelector('.MeetingTypeList:not([style*="display: none"])')

  const publicHearingMeetingExists = await page.evaluate(async () => {
    const meetingTypes = $('.MeetingTypeList:visible .MeetingTypeNameText').map((index, element) => {
      return $(element).text().trim()
    }).get()
    return meetingTypes.includes('Public Hearing')
  })

  let publicHearingMeetingObjects: {url: string, meetingType: string}[] = []

  if (publicHearingMeetingExists) {
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('.calendar-item')].some(e => e.parentElement!.style.display !== 'none')
    })
    publicHearingMeetingObjects = await page.evaluate(async () => {
      const entries = $('.calendar-item .meeting-title-heading>a')
      const entryObjects = entries.map((index, element) => {
        return {
          url: (element as HTMLAnchorElement).href!,
          meetingType: $(element).text()
        }
      }).get()
      return entryObjects
    })
  }

  console.log(chalk.bgGreen(`${year} council meetings: ${councilMeetingObjects.length}`))
  console.log(chalk.bgGreen(`${year} public hearings: ${publicHearingMeetingObjects.length}`))

  return [...councilMeetingObjects, ...publicHearingMeetingObjects]

}

// Parent page refers to the city council meeting page, which includes a list of topics
async function scrapeMeetingPage(page: Page, url: string, meetingType: string): Promise<IMeetingDetail[]> {

  await page.goto(url)
  await new Promise((resolve) => {setTimeout(resolve, 3000)})

  const results = await page.evaluate(async (meetingType) => {
    const date = $('.Date').text()

    // Only look for items with attachments
    const itemElements = $('.AgendaItem').has('img[title="Attachments"]')

    const items = []

    for (const item of itemElements) {
      const title = $(item).find('a').first().text()
      const contents = $(item).find('.AgendaItemDescription').text()

      // Clicking the item opens up a floating panel with links. Also changes URL.
      const hrefJavascript = $(item).find('.AgendaItemTitle a').attr('href')!
      // Regular jQuery click code doesn't work because these links execute javascript in the href instead
      eval(hrefJavascript.replace('javascript:', ''))
      await new Promise((resolve) => {setTimeout(resolve, 500)})

      const reportUrls = $('.AgendaItemSelectedDetails').find('.OrderedAttachment:not(:hidden) a').map((index, element) => {
        return {
          title: $(element).text(),
          url: new URL($(element).attr('href')!, window.location.origin).href
        }
      }).get()

      console.log(reportUrls)

      items.push({
        date: date,
        meetingType: meetingType,
        title: title,
        resolutionId: null,
        contents: contents,
        reportUrls: reportUrls
      })
    }

    return items
  }, meetingType)

  return results.map((r) => {
    return {
      city: 'Burnaby',
      metroCity: 'Metro Vancouver',
      url: page.url(),
      ...r,
      minutesUrl: url
    }
  })

}
