import chalk from 'chalk'
import moment from 'moment'
import { Page } from 'puppeteer'
import { formatDateString } from '../../BulkUtilities'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { getMeetingDetails } from './GetMeetingDetails'

export interface IScrapingDateOptions {
  startDate: string | null
  endDate: string | null
}

interface IMeetingListItem {
  date: string
  title: string
  contents: string
  url: string
  tag: string
}

const meetingsStartUrl = 'https://www.surrey.ca/city-government/councilmeetings/council-committee-commission-board-and-task-force-minutes'
const corporateReportsStartUrl = 'https://www.surrey.ca/city-government/councilmeetings/corporate-reports'
const planningReportsStartUrl = 'https://www.surrey.ca/city-government/councilmeetings/planning-reports'

const maxNumberOfPages = 200

// STRATEGY: Scrape all meetings, then combine with with corporate reports and planning reports
export async function getMeetingList(page: Page, options: IScrapingDateOptions) {

  // This is the array to return
  const results: IMeetingDetail[] = []

  let corporateReports: {date: string, url: string, title: string, tag: string, contents: string}[] = []
  let planningReports: {date: string, url: string, title: string, tag: string, contents: string}[] = []
  const meetings: {date: string, meetingType: string, url: string}[] = []

  // Step 1: Get all corporate reports

  await page.goto(corporateReportsStartUrl)
  await new Promise((resolve) => {setTimeout(resolve, 1000)})

  console.log(`Scraping Surrey corporate reports`)
  for (let i = 0; i < maxNumberOfPages; i++) {
    const corporateReportResult = await getMeetingListItems(page, options)
    const count = corporateReportResult.data.length > 0 ? chalk.green(`${corporateReportResult.data.length} items`) : '0 items'
    console.log(`Scraped corporate report list page up to: ${corporateReportResult.data[0]?.date}, ${count}, ${i}/${maxNumberOfPages} max pages`)

    corporateReports.push(...corporateReportResult.data)

    if (corporateReportResult.nextPageUrl) {
      await page.goto(corporateReportResult.nextPageUrl)
    } else {
      break
    }
  }

  // Step 2: Get all planning reports

  await page.goto(planningReportsStartUrl)
  await new Promise((resolve) => {setTimeout(resolve, 1000)})

  console.log(`Scraping Surrey planning reports`)
  for (let i = 0; i < maxNumberOfPages; i++) {
    // For planning reports, sometimes dates are not an exact match. As a result, get results up to 1 week prior
    const planningReportResult = await getMeetingListItems(page, {
      startDate: moment(options.startDate).subtract(1, 'week').format('YYYY-MM-DD'),
      endDate: options.endDate
    })
    const count = planningReportResult.data.length > 0 ? chalk.green(`${planningReportResult.data.length} items`) : '0 items'
    console.log(`Scraped planning report list page up to: ${planningReportResult.data[0]?.date}, ${count}, ${i}/${maxNumberOfPages} max pages`)

    // Update planning report titles to include the contents
    planningReportResult.data.forEach((r) => {
      if (r.contents) {
        r.title = `${r.title} (${r.contents})`
      }
    })

    planningReports.push(...planningReportResult.data)

    if (planningReportResult.nextPageUrl) {
      await page.goto(planningReportResult.nextPageUrl)
    } else {
      break
    }
  }

  // Step 3: Get all meeting minutes

  await page.goto(meetingsStartUrl)
  await new Promise((resolve) => {setTimeout(resolve, 1000)})

  console.log(`Scraping Surrey meeting list`)
  for (let i = 0; i < maxNumberOfPages; i++) {
    const meetingListResult = await getMeetingListItems(page, options)
    const count = meetingListResult.data.length > 0 ? chalk.green(`${meetingListResult.data.length} items`) : '0 items'
    console.log(`Scraped meeting list page up to: ${meetingListResult.data[0]?.date}, ${count}, ${i}/${maxNumberOfPages} max pages`)

    meetingListResult.data.forEach((data) => {
      const date = data.date
      const url = data.url
      let meetingType = data.tag.replace('Minutes', '').trim()

      // Sometimes the tag is empty due to input error on the city's side. Try to fill, but be explicit for corporate report and planning report meeting types
      if (data.title.toLowerCase().includes('public hearing')) {
        meetingType = 'Regular Council Public Hearing'
      } else if (data.title.toLowerCase().includes('land use')) {
        meetingType = 'Regular Council Land Use'
      } else {
        meetingType = getMeetingTypeFromMessyString(data.title)
      }

      if (date && url && meetingType) {
        const tempMeetingObject = {
          date: data.date,
          url: data.url,
          meetingType: meetingType
        }
        meetings.push(tempMeetingObject)
      }
    })

    if (meetingListResult.nextPageUrl) {
      await page.goto(meetingListResult.nextPageUrl)
    } else {
      break
    }
  }

  // Step 4: Parse meeting minutes and combine with corporate/planning reports

  for (const meeting of meetings) {

    const meetingDetails = await getMeetingDetails({
      page: page,
      url: meeting.url,
      date: meeting.date,
      meetingType: meeting.meetingType,
      allCorporateReports: corporateReports,
      allPlanningReports: planningReports
    })

    results.push(...meetingDetails)

  }

  // Check that all corporate and planning reports urls are incorporated somewhere in results, but only within the min/max dates from results
  const latestMeetingDate = moment(meetings[0].date || options.endDate)
  const corporateReportUrls = corporateReports.filter((r) => moment(r.date).isBetween(options.startDate, latestMeetingDate, undefined, '[]')).map((r) => r.url)
  const planningReportUrls = planningReports.filter((r) => moment(r.date).isBetween(options.startDate, latestMeetingDate, undefined, '[]')).map((r) => r.url)
  const allReportUrls = [...corporateReportUrls, ...planningReportUrls]
  const allReportUrlsInResults = results.map((r) => r.reportUrls.map((u) => u.url)).flat()
  const missingReportUrls = allReportUrls.filter((u) => !allReportUrlsInResults.includes(u))
  if (missingReportUrls.length > 0) {
    console.log(chalk.red(`Missing Surrey report urls in results: \n${missingReportUrls.join('\n')}`))
  }

  return results

}

async function getMeetingListItems(page: Page, options: IScrapingDateOptions): Promise<{data: IMeetingListItem[], nextPageUrl: string | null}> {

  const results = await page.evaluate(async (arg?: any) => {

    // The Surrey website does not use jQuery, so we need to inject it
    const jqueryScript = document.createElement('script')
    jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js'
    jqueryScript.type = 'text/javascript'
    document.getElementsByTagName('head')[0].appendChild(jqueryScript)

    // Wait for jQuery to load
    await new Promise((resolve) => {setTimeout(resolve, 1000)})

    const list = $('.view-content .search').map((index, element) => {
      const date = $(element).find('.datetime').text().trim()
      // Example h4 values:
        // "Regular Council Land Use Minutes: December 17, 2018"
        // "December 17, 2018 Regular Council Meeting Minutes"
        // "Advisory Design Panel Meeting Minutes - December 13, 2018"
        // "Board of Variance Meeting Minutes - 2018-12-12"

      const title = $(element).find('h4').text()
      const url = new URL($(element).find('a').attr('href')!, window.location.origin).href
      // Note that the contents are very raw and need to be cleaned/formatted by the caller
      const contents = $(element).find('.listing-view__item-body')
        .contents()
        .filter((index, element) => {
          return element.nodeType === Node.TEXT_NODE && !!element.nodeValue && element.nodeValue?.trim().length > 0
        })
        .map((index, element) => $(element).text().trim())
        .get()
        .filter((c) => !['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'septemer', 'october', 'november', 'december'].some((m) => c.toLowerCase().includes(m)))
        .join('\n')
      const tag = $(element).find('.field-content.tag').text().trim()
      return {
        date: date,
        title: title,
        contents: contents,
        url: url,
        tag: tag
      }
    }).get()

    const nextPageUrlRaw = $('.pager__item.is-active').next('.pager__item').find('a').attr('href')
    let nextPageUrl: string | null = null
    if (nextPageUrlRaw) {
      const nextPageUrlObject = new URL(window.location.href)
      nextPageUrlObject.search = nextPageUrlRaw
      nextPageUrl = nextPageUrlObject.href
    }

    return {
      data: list,
      nextPageUrl: nextPageUrl
    }

  })

  // Format dates and meeting types
  results.data.forEach((m) => {
    m.date = formatDateString(m.date)
  })

  // Filter by date

  if (options.startDate) {
    const reachedBeforeStartDate = results.data.find((result) => moment(result.date).isBefore(options.startDate))
    if (reachedBeforeStartDate) {
      // false the next page url so that the caller stops going to the next page
      results.nextPageUrl = null
    }
    results.data = results.data.filter((result) => {
      return moment(result.date).isSameOrAfter(options.startDate!)
    })
  }

  if (options.endDate) {
    results.data = results.data.filter((result) => {
      return moment(result.date).isBefore(options.endDate!)
    })
    // Keep going to the next page until the startDate filter is reached or the max page limit is reached
  }

  return results

}

// Example: '\n    September 29, 2008\nPlanning Report 7908-0093-0098A Avenue and King George Highway\nSeptember 29, 2008\nActive  '
function getMeetingTypeFromMessyString(raw: string) {

  // Remove all potential consecutive spaces
  raw = raw.replace(/\s\s+/g, ' ')

  // Separate the string into words split by spaces
  const words = raw.split(' ')

  // Find the word "minutes" case-insensitive
  const minutesIndex = words.findIndex((w) => w.toLowerCase().includes('minutes'))

  // Go backwards from minutes and get words that are only words (no numbers) until you reach a word that includes a number
  const meetingTypeWords = []
  for (let i = minutesIndex - 1; i >= 0; i--) {
    if (!/\d/.test(words[i])) {
      meetingTypeWords.push(words[i])
    } else {
      break
    }
  }

  // There may or may not be the word "meeting" somewhere - if so, remove
  const meetingIndex = meetingTypeWords.findIndex((w) => w.toLowerCase().trim() === 'meeting')
  if (meetingIndex > -1) {
    meetingTypeWords.splice(meetingIndex, 1)
  }

  // Clean and join into a single string
  const meetingType = meetingTypeWords.reverse().join(' ').trim()

  return meetingType

}
