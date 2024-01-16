import puppeteer, { Page } from 'puppeteer'
import { IMeetingDetail } from '../../repositories/RawRepository'
import moment from 'moment'
import chalk from 'chalk'
import { runPromisesInBatches } from '../BulkUtilities'

const startUrl = 'https://pub-burnaby.escribemeetings.com/?FillWidth=1'
const numberOfYears = 8
const parallelBrowserLimit = 8

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
  await page.addScriptTag({url: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js'})

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

  const meetingObjects: {url: string, meetingType: string, date: string}[] = []

  for (let i = 0; i < numberOfYears; i++) {
    const newMeetingObjects = await scrapeMeetingListPage(page, moment().subtract(i, 'year').format('YYYY'))
    meetingObjects.push(...newMeetingObjects)
  }

  // FOR TESTING PURPOSES ONLY TO SCRAPE A SINGLE YEAR
  // const newMeetingObjects = await scrapeMeetingListPage(page, '2019')
  // meetingObjects.push(...newMeetingObjects)

  // Scrape X pages in parallel
  const promiseArray = meetingObjects.map((meeting, i) => {
    return async () => {
      try {
        const parallelBrowser = await puppeteer.launch({
          headless: options.headless !== undefined ? options.headless : 'new'
        })
        const parallelPage = await parallelBrowser.newPage()
        parallelPage.setViewport({
          width: 1980,
          height: 1080
        })
        console.log(chalk.bgWhite(`Scraping meeting details: ${i}/${meetingObjects.length} ${meeting.url}`))
        let meetingResults: IMeetingDetail[] = []
        if (moment(new Date(meeting.date)).isAfter('2020-02-29')) {
          meetingResults = await scrapeMeetingPageAfterFeb2020(parallelPage, meeting.url, meeting.meetingType)
        } else {
          meetingResults = await scrapeMeetingPageBeforeFeb2020(parallelPage, meeting.url, meeting.meetingType)
        }
        if (meetingResults.length > 0) {
          console.log(chalk.bgGreen(`Scraped meeting details for ${meetingResults[0].date} - ${meetingResults.length} items`))
        } else {
          console.log(chalk.bgRed(`No meeting details for ${meeting.url}`))
        }
        await parallelBrowser.close()
        return meetingResults.filter((r) => r.reportUrls.length > 0)
      } catch (error) {
        console.error(chalk.bgRed(error))
        return []
      }
    }
  })

  const results: IMeetingDetail[] = (await runPromisesInBatches(promiseArray, parallelBrowserLimit)).flat()

  // Close the browser
  await browser.close()
  console.log(`Browser closed`)

  results.forEach((result) => {
    result.date = moment(new Date(result.date)).format('YYYY-MM-DD')
  })

  return results

}

// The Burnaby meting lists are paginated by year
async function scrapeMeetingListPage(page: Page, year: string): Promise<{url: string, meetingType: string, date: string}[]> {

  console.log(chalk.bgWhite(`Scraping ${year} meeting list page`))

  // Get all city council meetings (may not exist at the start of new year)
  await page.goto(`https://pub-burnaby.escribemeetings.com/?FillWidth=1&Year=${year}&Expanded=City%20Council%20Meeting`)
  await new Promise((resolve) => {setTimeout(resolve, 2000)})
  await page.waitForSelector('.MeetingTypeList:not([style*="display: none"])')

  const councilMeetingObjects = await parseMeetingListEntries(page, 'City Council Meeting')

  // Get all public hearings (may not exist at the start of new year)
  await page.goto(`https://pub-burnaby.escribemeetings.com/?FillWidth=1&Year=${year}&Expanded=Public%20Hearing`)
  await new Promise((resolve) => {setTimeout(resolve, 2000)})
  await page.waitForSelector('.MeetingTypeList:not([style*="display: none"])')

  let publicHearingMeetingObjects = await parseMeetingListEntries(page, 'Public Hearing')

  // Legacy city council meetings before feb 2020
  await page.goto(`https://pub-burnaby.escribemeetings.com/?FillWidth=1&Year=${year}&Expanded=City%20Council`)
  await new Promise((resolve) => {setTimeout(resolve, 2000)})
  await page.waitForSelector('.MeetingTypeList:not([style*="display: none"])')

  const legacyCouncilMeetingObjects = await parseMeetingListEntries(page, 'City Council')

  console.log(chalk.bgGreen(`${year} council meetings: ${councilMeetingObjects.length}`))
  console.log(chalk.bgGreen(`${year} public hearings: ${publicHearingMeetingObjects.length}`))
  console.log(chalk.bgGreen(`${year} legacy council meetings: ${legacyCouncilMeetingObjects.length}`))

  return [...councilMeetingObjects, ...publicHearingMeetingObjects, ...legacyCouncilMeetingObjects]

}

export async function parseMeetingListEntries(page: Page, waitForMeeting: string) {

  const councilMeetingExists = await page.evaluate(async (waitForMeeting: string) => {
    const meetingTypes = $('.MeetingTypeList:visible .MeetingTypeNameText').map((index, element) => {
      return $(element).text().trim()
    }).get()
    return meetingTypes.includes(waitForMeeting)
  }, waitForMeeting)

  let councilMeetingObjects: {url: string, meetingType: string, date: string}[] = []

  if (councilMeetingExists) {
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('.calendar-item')].some(e => e.parentElement!.style.display !== 'none')
    })
    councilMeetingObjects = await page.evaluate(async () => {
      const entries = $('.calendar-item:has(.meeting-title-heading>a:visible)')
      const entryObjects = entries.map((index, element) => {
        const meetingLink = $(element).find('.meeting-title-heading a')
        return {
          url: new URL(meetingLink.attr('href')!, window.location.href).href,
          meetingType: meetingLink.text(),
          date: $(element).find('.meeting-date').text().split('@')[0]
        }
      }).get()
      return entryObjects
    })
  }

  return councilMeetingObjects

}

interface IPartialMeetingDetails {
  date: string
  meetingType: string
  title: string
  resolutionId: null
  contents: string
  reportUrls: {
      title: string
      url: string
  }[]
}

// Parent page refers to the city council meeting page, which includes a list of topics
// Note that after Feb 2020, the meeting format changed, so entirely different jquery selectors are needed
async function scrapeMeetingPageAfterFeb2020(page: Page, url: string, meetingType: string): Promise<IMeetingDetail[]> {

  await page.goto(url)
  await new Promise((resolve) => {setTimeout(resolve, 3000)})

  const results = await page.evaluate(async (meetingType) => {
    const date = $('.Date').text()

    // Only look for items with attachments
    // Non-content items have an no-class div that contains all of their child elements - we want to ignore these
    // TODO: This part doesn't seem to be working properly for some reason, not filtering out the parent items...
    const itemElements = $('.AgendaItemContainer').has('img[title="Attachments"]').filter((index, element) => {
      $(element).children().each((index, childElement) => {
        const hasEmptyClass = $(childElement).hasClass('')
        if (hasEmptyClass) return false
      })
      return true
    }).get()

    const items: IPartialMeetingDetails[] = []

    for (const item of itemElements) {
      let title = $(item).find('a').first().text().replace(/\s+/g, ' ').replace(/[\n\r]/g, '').trim()
      if (title) title = title.trim()
      // Get the parent label - first parent is div, previous element to that is the parent label
      const parentLabel = $(item).parents().prev().first().find('.AgendaItemTitle').text().replace(/\s+/g, ' ').replace(/[\n\r]/g, '').trim()
      const contents = $(item).find('.AgendaItemDescription').text().replace(/\s+/g, ' ').replace(/[\n\r]/g, '').trim()

      if (!title || !parentLabel || !contents) continue

      // Clicking the item opens up a floating panel with links. Also changes URL.
      const hrefJavascript = $(item).find('.AgendaItemTitle a').attr('href')!
      // Regular jQuery click code doesn't work because these links execute javascript in the href instead
      eval(hrefJavascript.replace('javascript:', ''))
      await new Promise((resolve) => {setTimeout(resolve, 2000)})

      const reportUrls = $('.AgendaItemSelectedDetails').find('.OrderedAttachment:not(:hidden) a').map((index, element) => {
        return {
          title: $(element).text(),
          url: new URL($(element).attr('href')!, window.location.origin).href
        }
      }).get()

      items.push({
        date: date,
        meetingType: meetingType,
        title: `${parentLabel} - ${title}`,
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
      date: moment(new Date(r.date)).format('YYYY-MM-DD'),
      minutesUrl: url
    }
  })

}

async function scrapeMeetingPageBeforeFeb2020(page: Page, url: string, meetingType: string): Promise<IMeetingDetail[]> {

  await page.goto(url)
  await new Promise((resolve) => {setTimeout(resolve, 3000)})

  const results = await page.evaluate(async (meetingType) => {
    // Don't know which tr includes the date, so search each one and see which one is likely to be a date
    let date: string | null = null
    const potentialDateElements = $('.MsoNormalTable').first().find('tr').get()
    potentialDateElements.forEach((element) => {
      const text = $(element).text().toLowerCase()
      // Check that the text contains any full month string
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const containsMonth = months.some((month) => text.includes(month.toLowerCase()))
      if (containsMonth) {
        date = text.toLowerCase().split(' at ')[0]
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '').trim()
      }
    })

    if (!date) {
      return []
    }

    const itemElements = $('.WordSection1').find('.MsoNormalTable:has(a[href="#"]:visible)').get()

    const items: IPartialMeetingDetails[] = []

    for (const item of itemElements) {
      const title = $(item).find('tr:eq(0) td:eq(1) p')
        .map((index, element) => $(element).text())
        .get().join(' - ')
        .replace(/\s+/g, ' ') // Replace consecutive spaces
        .replace(/[\r\n]+/g, '').trim() // Remove special characters

      // Get the parent label - check previous siblings and find a table where the first tr has an a tag with no href
      const parentLabel = $(item)
        .prevAll('.MsoNormalTable:not(:has(.SelectableItem))')
        .first().find('tr td:eq(1)').text()
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '').trim()

      // Contents may be empty for legacy entries
      const contents = $(item).find('tr:eq(2)').text()
        .replace(/\s+/g, ' ')
        .replace(/[\n\r]/g, '').trim() || ''

      if (!title || !parentLabel) continue

      // Clicking the item opens up a floating panel with links. Also changes URL.
      const itemLink = $(item).find('a')
      itemLink.trigger('click')

      const reportUrls = $('.AgendaItemSelectedDetails').find('.AgendaItemAttachment:not(:hidden) a').map((index, element) => {
        return {
          title: $(element).text().replace(/\s+/g, ' ').replace(/[\n\r]/g, '').trim(),
          url: new URL($(element).attr('href')!, window.location.origin).href
        }
      }).get()

      items.push({
        date: date,
        meetingType: meetingType,
        title: `${parentLabel} - ${title}`,
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
      date: moment(new Date(r.date)).format('YYYY-MM-DD'),
      minutesUrl: url
    }
  })

}
