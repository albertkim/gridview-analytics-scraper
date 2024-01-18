import { Page } from 'puppeteer'
import { IMeetingDetail } from '../../../repositories/RawRepository'

export async function getMeetingDetails(page: Page, url: string, date: string): Promise<IMeetingDetail> {

  await page.goto(url)
  await new Promise((resolve) => {setTimeout(resolve, 500)})

  const results = await page.evaluate(async (date) => {

    const meetingType = $('.TitleFull').parent().text().split(' -- ')[1]?.trim()

    const resolutionTopic = $('.RecordDetailsFull :contains("Item Topic: ")').next().text()?.trim()

    let resolutionNumber = null
    const resolutionNumberElement = $('.RecordDetailsFull :contains("Resolution Number")')
    if (resolutionNumberElement) {
        resolutionNumber = resolutionNumberElement.next().text()?.trim()
    }

    let fullTextContents = ''
    const fullTextContentsElement = $('.RecordDetailsFull :contains("Full Text")')
    if (fullTextContentsElement) {
      fullTextContents = fullTextContentsElement.next().text()?.trim()
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '')?.trim()
    }

    let resolutionContents = ''
    const resolutionContentsElement = $('.RecordDetailsFull :contains("Resolution")')
    if (resolutionContentsElement) {
        resolutionContents = resolutionContentsElement.next().text()
          .replace(/\s+/g, ' ')
          .replace(/[\r\n]+/g, '')?.trim()
    }

    let minutesUrl = null
    const mintesUrlElement = $('a:contains("View Minutes")')
    if (mintesUrlElement) {
        minutesUrl = mintesUrlElement.attr('href') || null
    }

    let permalink = $('#permalink > a').attr('href')

    let reportUrls = []
    const reportElements = $('.RecordDetailsFull :contains("View Report")')
    reportUrls = $(reportElements)
        .map((index, value) => $(value).attr('href'))
        .get()

    const pickLongerString = function(string1: string, string2: string) {
      return string1.length >= string2.length ? string1 : string2
    }

    return {
      city: 'Richmond',
      metroCity: 'Metro Vancouver',
      url: permalink || url,
      date: date,
      meetingType: meetingType,
      title: resolutionTopic,
      resolutionId: resolutionNumber,
      contents: pickLongerString(fullTextContents, resolutionContents), // Pick the bigger one
      minutesUrl: minutesUrl,
      reportUrls: reportUrls.map((url) => {
        return {
          title: 'Report',
          url: url
        }
      })
    }

  }, date)

  return results

}
