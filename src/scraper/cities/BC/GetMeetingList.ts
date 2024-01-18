import chalk from 'chalk'
import moment from 'moment'
import { Page } from 'puppeteer'
import { formatDateString } from '../../BulkUtilities'

export interface IScrapingDateOptions {
  startDate: string | null
  endDate: string | null
}

const startUrl = 'https://archive.news.gov.bc.ca/'
const maxNumberOfPages = 200

// STRATEGY: Scrape all news for the Ministry of Housing, then the Ministry of Transportation and Infrastructure
export async function getMeetingList(page: Page, options: IScrapingDateOptions): Promise<{date: string, meetingType: string, url: string}[]> {

  // Note that the BC website only shows up to Nov 26, 2020
  // If date is not set or is before 2021-01-01
  // When you reach the last page, the same item with date 2020-12-02 is repeatedly shown
  // Going back earlier requires scraping a different set of pages, not necessary at this time
  const earliestDate = '2021-01-01'
  if (!options.startDate) {
    options.startDate = earliestDate
  } else if (moment(options.startDate).isBefore(earliestDate)) {
    options.startDate = earliestDate
  }

  await page.goto(startUrl)
  await new Promise((resolve) => {setTimeout(resolve, 1000)})

  const ministryOfHousingResults = await getMeetingListForMinistry(page, 'Ministry of Housing', options)
  const ministryOfTransportationAndInfrastructureResults = await getMeetingListForMinistry(page, 'Ministry of Transportation and Infrastructure', options)

  // Merge arrays and sort by date newest to oldest
  const results = [...ministryOfHousingResults, ...ministryOfTransportationAndInfrastructureResults].sort((a, b) => {
    return moment(b.date).diff(moment(a.date))
  })

  return results

}

async function getMeetingListForMinistry(page: Page, ministry: string, options: IScrapingDateOptions): Promise<{date: string, meetingType: string, url: string}[]> {

  // Go to the start url
  await page.goto(startUrl)
  await new Promise((resolve) => {setTimeout(resolve, 1000)})

  // Select the ministry filter
  await page.evaluate(async (ministry) => {
    $('#ministryList > select > option:contains("' + ministry + '")').attr('selected', 'selected')
    $('#searchButton input').click()
  }, ministry)
  await new Promise((resolve) => {setTimeout(resolve, 1000)})

  // Iterate through the pages until the max number of pages are hit or the date range is reached

  const meetingList: {url: string, meetingType: string, date: string}[] = []

  for (let i = 0; i < maxNumberOfPages; i++) {
    const meetingListResult = await getSingleMeetingListPage(page, ministry, options)
    const count = meetingListResult.data.length > 0 ? chalk.green(`${meetingListResult.data.length} items`) : '0 items'
    console.log(`Scraped list page up to: ${meetingListResult.earliestDate}, ${count}, ${i}/${maxNumberOfPages} max pages`)

    meetingList.push(...meetingListResult.data)

    if (!meetingListResult.goToNextPage) {
      break
    }

    // Go to next page
    await page.evaluate(async () => {
      $('input[title*="Next Page"]').trigger('click')
    })
    await new Promise((resolve) => {setTimeout(resolve, 2000)})
  }

  return meetingList

}

interface IMeetingListData {
  goToNextPage: boolean
  earliestDate: string | null
  data: Array<{url: string, meetingType: string, date: string}>
}

async function getSingleMeetingListPage(page: Page, ministry: string, options: IScrapingDateOptions): Promise<IMeetingListData> {

  const results = await page.evaluate(async (ministry) => {

    let data: {date: string, meetingType: string, url: string}[] = []

    const tableRecordElements = $('.newsRelease')

    tableRecordElements.each((index, element) => {
      const date = $(element).find('.dateline').text()
      const url = $(element).find('a')[0].href
      data.push({
        date: date,
        meetingType: ministry,
        url: url
      })
    })

    return {
      goToNextPage: true,
      earliestDate: data.length > 0 ? data[data.length - 1].date : null,
      data: data
    }

  }, ministry)

  results.earliestDate = results.earliestDate ? formatDateString(results.earliestDate) : null
  results.data.forEach((result) => {
    result.date = formatDateString(result.date)
  })

  // Check date filters

  if (options.startDate) {
    const reachedBeforeStartDate = results.data.find((result) => moment(result.date).isBefore(options.startDate))
    if (reachedBeforeStartDate) {
      // false the next page url so that the caller stops going to the next page
      results.goToNextPage = false
    }
    results.data = results.data.filter((result) => {
      return moment(result.date).isSameOrAfter(options.startDate!)
    })
  }

  if (options.endDate) {
    results.data = results.data.filter((result) => {
      return moment(result.date).isSameOrBefore(options.endDate!)
    })
  }

  return results

}
