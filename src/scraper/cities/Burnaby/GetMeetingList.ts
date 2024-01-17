import { Page } from 'puppeteer'
import { formatDateString } from '../../BulkUtilities'
import moment from 'moment'
import chalk from 'chalk'

interface IMeetingListItem {
  url: string
  meetingType: string
  date: string
}

export interface IScrapingDateOptions {
  startDate: string | null
  endDate: string | null
}

// How many years back to scrape, including this year
const maxYearsBack = 7

// STRATEGY: Scrape all 7 years of meeting lists, then filter out meetings that are outside of the date range
export async function getMeetingList(page: Page, options: IScrapingDateOptions): Promise<IMeetingListItem[]> {

  // Output: ['2023', '2022', '2021', '2020', '2019', '2018', '2017']
  let yearsArray = Array.from({ length: maxYearsBack }, (_, i) => (moment().year() - i).toString())

  // If startDate or endDate is specified, filter years Array to only include years that are within the date range
  if (options.startDate || options.endDate) {
    const startDate = options.startDate ? moment(options.startDate) : moment().subtract(maxYearsBack, 'years')
    const endDate = options.endDate ? moment(options.endDate) : moment()

    const startYear = startDate.year()
    const endYear = endDate.year()

    yearsArray = []
    for (let year = startYear; year <= endYear; year++) {
      yearsArray.push(year.toString())
    }
  }

  const meetingList: IMeetingListItem[] = []

  for (const year of yearsArray) {

    console.log(`Scraping ${year} meeting list page`)

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

    meetingList.push(...councilMeetingObjects, ...publicHearingMeetingObjects, ...legacyCouncilMeetingObjects)

  }

  let filteredMeetingList = meetingList.filter((meetingObject) => {

    if (options.startDate) {
      if (moment(meetingObject.date).isBefore(options.startDate!)) {
        return false
      }
    }

    if (options.endDate) {
      if (moment(meetingObject.date).isSameOrAfter(options.endDate!)) {
        return false
      }
    }

    return true

  })

  return filteredMeetingList

}

// Burnaby meeting types:
// City Council Meeting - main city council meeting type as of Mar 9, 2020
// City Council - legacy city council meeting type before Mar 9, 2020
// Public Hearing - public hearing meeting type
async function parseMeetingListEntries(page: Page, meetingType: string): Promise<IMeetingListItem[]> {

  const councilMeetingExists = await page.evaluate(async (waitForMeeting: string) => {
    const meetingTypes = $('.MeetingTypeList:visible .MeetingTypeNameText').map((index, element) => {
      return $(element).text().trim()
    }).get()
    return meetingTypes.includes(waitForMeeting)
  }, meetingType)

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
          date: $(element).find('.meeting-date').text().split('@')[0] // Input looks like Monday, January 15, 2024 @ 5:00 PM
        }
      }).get()
      return entryObjects
    })
  }

  councilMeetingObjects.forEach((meeting) => {
    meeting.date = formatDateString(meeting.date)
  })

  return councilMeetingObjects

}
