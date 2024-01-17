import { Page } from 'puppeteer'
import { IMeetingDetail } from '../../../repositories/RawRepository'

export async function getMeetingDetails(page: Page, url: string, date: string): Promise<IMeetingDetail[]> {

  await page.goto(url)

  const results = await page.evaluate(async (date) => {
    
    let data: Omit<IMeetingDetail, 'city' | 'metroCity' | 'url' | 'minutesUrl'>[] = []

    function cleanTitle(title: string = '') {
      if (title) {
        return title.replace(/^\d+\.\s*/, '').trim()
      } else {
        return ''
      }
    }

    const meetingType = ($('h1').first().html().split('<br>')[0].replace('agenda', '') || '').trim()

    // Vancouver council meeting notes are organized by a series of
    // - h3 "MATTERS ADOPTED ON CONSENT"/"REPORTS" for primary discussion items followed up by ul
    // - h2 "REFERRAL REPORTS" followed up by an h3
    // - h2 "BY-LAWS" followed up by p elements (first may have a PDF)

    $('.main-content h3').each((index, element) => {
      const rawTitle = ($(element).text() || '').trim()
      // Only proceed if a valid title exists
      if (rawTitle) {
        const title = cleanTitle(rawTitle)
        const reportUrls = $(element).nextAll('ul').first().find('a').map(function() {
          return {
            title: $(this).text(),
            url: $(this)[0].href
          }
        }).get()
  
        data.push({
          date: date,
          meetingType: meetingType,
          title: title,
          resolutionId: null,
          contents: '',
          reportUrls: reportUrls
        })
      }
    })

    // Now, handle the bylaw section (if exists) separately
    const bylawSelector = $('h2:contains("BY-LAWS")')

    // If there are any bylaws, pick the first one. If the next element is a p tag with an a tag, then get the link title and url. If the next element is not a p tag with an a tag, stop. Store results in an array.
    if (bylawSelector.length > 0) {
      const bylawLinkElements = bylawSelector
        .nextUntil(':not(p:has(a))')
        .map((index, element) => {
          return {
            title: $(element).find('a').text(),
            url: $(element).find('a')[0].href
          }
        })
        .get()
      data.push({
        date: date,
        meetingType: meetingType,
        title: 'By-laws',
        resolutionId: null,
        contents: '',
        reportUrls: bylawLinkElements
      })
    }
    
    return data

  }, date)

  // Populate with additional useful data
  // Puppeteer page.evaluate cannot access variables outside of it
  return results.map((d) => {
    return {
      city: 'Vancouver',
      metroCity: 'Metro Vancouver',
      url: url,
      minutesUrl: url,
      ...d,
    }
  })

}
