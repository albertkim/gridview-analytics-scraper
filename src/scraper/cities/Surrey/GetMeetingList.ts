import chalk from 'chalk'
import moment from 'moment'
import { Page } from 'puppeteer'
import { formatDateString } from '../../BulkUtilities'
import { IMeetingDetail } from '../../../repositories/RawRepository'

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

const allReportsStartUrl = 'https://www.surrey.ca/city-government/councilmeetings/council-committee-commission-board-and-task-force-minutes'
const corporateReportsStartUrl = 'https://www.surrey.ca/city-government/councilmeetings/corporate-reports'
const planningReportsStartUrl = 'https://www.surrey.ca/city-government/councilmeetings/planning-reports'

const maxNumberOfPages = 200

// STRATEGY: Scrape all meeting URLs, then combine with with corporate reports and planning report URLs based on date and report type
export async function getMeetingList(page: Page, options: IScrapingDateOptions) {

  // This is the array to return
  const finalMeetingList: IMeetingDetail[] = []

  // Step 1: Get all meeting URLs

  // This will store the meeting urls - will merge into the items from corproate reports and planning reports for the final meeting list
  const tempMeetingUrls: {date: string, meetingType: string, url: string}[] = []

  await page.goto(allReportsStartUrl)
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
        tempMeetingUrls.push(tempMeetingObject)
      } else {
        console.log(chalk.yellow(`Skipping Surrey meeting list item, empty value: ${date}, ${data.title}, ${url}, ${meetingType}`))
      }
    })

    if (meetingListResult.nextPageUrl) {
      await page.goto(meetingListResult.nextPageUrl)
    } else {
      break
    }
  }

  // Step 2: Get corporate report URLs

  await page.goto(corporateReportsStartUrl)
  await new Promise((resolve) => {setTimeout(resolve, 1000)})

  console.log(`Scraping Surrey corporate reports`)
  for (let i = 0; i < maxNumberOfPages; i++) {
    const corporateReportResult = await getMeetingListItems(page, options)
    const count = corporateReportResult.data.length > 0 ? chalk.green(`${corporateReportResult.data.length} items`) : '0 items'
    console.log(`Scraped corporate report list page up to: ${corporateReportResult.data[0]?.date}, ${count}, ${i}/${maxNumberOfPages} max pages`)

    corporateReportResult.data.forEach((data) => {

      // Find the matching meeting list item, then add to final array
      const matchingMeetingListItem = tempMeetingUrls.find((m) => {
        let meetingType: string | null = 'regular council public hearing'
        if (data.tag.toLowerCase().includes('finance')) {
          meetingType = 'finance committee'
        }
        return m.date === data.date && m.meetingType.toLowerCase() === meetingType
      })

      if (matchingMeetingListItem) {
        finalMeetingList.push({
          city: 'Surrey',
          metroCity: 'Metro Vancouver',
          date: data.date,
          url: data.url,
          title: data.title,
          contents: data.contents,
          meetingType: matchingMeetingListItem.meetingType,
          resolutionId: null,
          reportUrls: [{
            title: data.title,
            url: data.url
          }],
          minutesUrl: matchingMeetingListItem.url
        })
      } else {
        console.log(chalk.yellow(`Skipping Surrey corporate report item, ${data.title}, ${data.date}`))
      }
    })

    if (corporateReportResult.nextPageUrl) {
      await page.goto(corporateReportResult.nextPageUrl)
    } else {
      break
    }
  }

  // Step 3: Get planning report URLs

  await page.goto(planningReportsStartUrl)
  await new Promise((resolve) => {setTimeout(resolve, 1000)})

  console.log(`Scraping Surrey planning reports`)
  for (let i = 0; i < maxNumberOfPages; i++) {
    const planningReportResult = await getMeetingListItems(page, options)
    const count = planningReportResult.data.length > 0 ? chalk.green(`${planningReportResult.data.length} items`) : '0 items'
    console.log(`Scraped planning report list page up to: ${planningReportResult.data[0]?.date}, ${count}, ${i}/${maxNumberOfPages} max pages`)

    planningReportResult.data.forEach((data) => {

      // Find the matching meeting list item, then add to final array
      // Find the meeting item that matches the date or comes closest after the date that has the case-insensitive meeting type of 'regular council land use'
      const matchingMeetingListItem = tempMeetingUrls
        .filter((m) => m.meetingType.toLowerCase() === 'regular council land use')
        .filter((m) => {
          return moment(m.date).isSameOrAfter(data.date)
        })
        .sort((a, b) => moment(a.date).diff(moment(b.date)))
        .find(() => true)

      if (matchingMeetingListItem) {
        finalMeetingList.push({
          city: 'Surrey',
          metroCity: 'Metro Vancouver',
          date: data.date,
          url: data.url,
          title: data.title,
          contents: data.contents,
          meetingType: matchingMeetingListItem.meetingType,
          resolutionId: null,
          reportUrls: [{
            title: data.title,
            url: data.url
          }],
          minutesUrl: matchingMeetingListItem.url
        })
      } else {
        console.log(chalk.yellow(`Skipping Surrey planning report item, ${data.title}, ${data.date}`))
      }
    })

    if (planningReportResult.nextPageUrl) {
      await page.goto(planningReportResult.nextPageUrl)
    } else {
      break
    }
  }

  // Return final result
  return finalMeetingList

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

function formatPlanningReportContents(raw: string) {

  // Remove all potential consecutive spaces
  raw = raw.replace(/\s\s+/g, ' ').trim()

  // Separate by newlines
  const lines = raw.split('\n')

  // Only get

}
