import moment from 'moment'
import { Page } from 'puppeteer'
import { formatDateString } from '../../BulkUtilities'

interface IMeetingListData {
  nextPageUrl: string | null
  earliestDate: string | null
  data: Array<{url: string, date: string}>
}

export interface IScrapingDateOptions {
  startDate: string | null
  endDate: string | null
}

export async function getMeetingList(page: Page, url: string, options: IScrapingDateOptions): Promise<IMeetingListData> {

  await page.goto(url)
  await new Promise((resolve) => {setTimeout(resolve, 500)})

  const results: IMeetingListData = await page.evaluate(async () => {

    let data: {url: string, date: string}[] = []

    const resultTextElements =  $('.ResultText')

    resultTextElements.each((index, element) => {
      const date = $(element).find('.Title').text()
      const moreDetailsElements = $(element).find('a:contains("More Details")')
      const moreDetailsUrl = moreDetailsElements ? moreDetailsElements.prop('href') : null
      if (moreDetailsUrl) {
        data.push({
          url: moreDetailsUrl,
          date: date
        })
      }
    })

    const nextPageUrl = $('.next_link').attr('href')!

    return {
      data: data,
      earliestDate: data.length > 0 ? data[data.length - 1].date : null,
      nextPageUrl: nextPageUrl
    }

  })

  results.earliestDate = results.earliestDate ? formatDateString(results.earliestDate) : null
  results.data.forEach((result) => {
    result.date = formatDateString(result.date)
  })

  // Check date filters

  if (options.startDate) {
    const reachedBeforeStartDate = results.data.find((result) => moment(result.date).isBefore(options.startDate))
    if (reachedBeforeStartDate) {
      // Null the next page url so that the caller stops going to the next page
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
