import moment from 'moment'
import { Page } from 'puppeteer'
import { formatDateString } from '../../BulkUtilities'

interface IMeetingListItem {
  goToNextPage: boolean
  earliestDate: string | null
  data: Array<{url: string, meetingType: string, date: string}>
}

export interface IScrapingDateOptions {
  startDate: string | null
  endDate: string | null
}

export async function getMeetingList(page: Page, options: IScrapingDateOptions): Promise<IMeetingListItem> {

  const results: IMeetingListItem = await page.evaluate(async () => {
    let data: Array<{url: string, meetingType: string, date: string}> = []

    const tableRecordElements = $('.TableRecords tbody tr')

    tableRecordElements.each((index, element) => {

      const date = $(element).find('td:nth-child(1)').text().trim()
      const meetingType = $(element).find('td:nth-child(2)').text().trim()
      let meetingMinutesUrl
      // Most links are called "Agenda and Minutes" but some have different names and extra context in brackets
      const meetingMinutesUrlElement = $(element).find('td:nth-child(4) a').filter(function() {
        const text = $(this).text() as string | undefined
        if (text) {
          return text.toLowerCase().includes('agenda') && text.toLowerCase().includes('minute')
        }
        return false
      })
      if (meetingMinutesUrlElement) {
        meetingMinutesUrl = meetingMinutesUrlElement.attr('href')
      }

      if (meetingMinutesUrl) {
        data.push({
          date: date,
          meetingType: meetingType,
          url: meetingMinutesUrl
        })
      }
    })

    return {
      data: data,
      earliestDate: data.length > 0 ? data[data.length - 1].date : null,
      goToNextPage: true
    }
  })

  results.earliestDate = results.earliestDate ? formatDateString(results.earliestDate) : null
  results.data.forEach((result) => {
    result.date = formatDateString(result.date)
  })

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
      return moment(result.date).isBefore(options.endDate!)
    })
    // Keep going to the next page until the startDate filter is reached or the max page limit is reached
  }

  return results

}
