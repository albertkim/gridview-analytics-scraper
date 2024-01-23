import { Page } from 'puppeteer'
import { IMeetingDetail } from '../../../repositories/RawRepository'

export async function getMeetingDetail(page: Page, url: string, date: string): Promise<IMeetingDetail> {

  await page.goto(url)

  const results = await page.evaluate(async () => {

    const meetingType = $('table tr:nth-child(3) td:nth-child(2)').text().trim()
    const title = $('table tr:nth-child(4) td').text().trim()
    const contents = $('table tr:nth-child(5) td').text().trim()

    return {
      title: title,
      resolutionId: null,
      meetingType: meetingType,
      contents: contents,
      reportUrls: []
    }

  })

  // Populate with additional useful data
  // Puppeteer page.evaluate cannot access variables outside of it
  return {
    city: 'Surrey',
    metroCity: 'Metro Vancouver',
    ...results,
    date: date,
    url: url,
    minutesUrl: url
  }

}