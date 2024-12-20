import { Page } from 'puppeteer'
import { IMeetingDetail } from '../../../repositories/RawRepository'

export async function getMeetingDetails(page: Page, url: string, meetingType: string, date: string): Promise<IMeetingDetail[]> {

  await page.goto(url)

  const results = await page.evaluate(async (meetingType, date) => {
    
    let data: Omit<IMeetingDetail, 'city' | 'metroCity' | 'url' | 'minutesUrl'>[] = []

    function cleanTitle(title: string = '') {
      if (title) {
        return title.replace(/^\d+\.\s*/, '').trim()
      } else {
        return ''
      }
    }

    // Vancouver council meeting notes are organized by a series of
    // - h3 "MATTERS ADOPTED ON CONSENT"/"REPORTS" for primary discussion items followed up by ul
    // - h2 "REFERRAL REPORTS" followed up by an h3
    // - h2 "BY-LAWS" followed up by p elements (first may have a PDF)

    $('.main-content h3').each((index, element) => {
      const rawTitle = ($(element).text() || '').trim()
      // Only proceed if a valid title exists
      if (rawTitle) {
        const title = cleanTitle(rawTitle)

        const reportUrls: {title: string, url: string}[] = []

        $(element).nextAll().not('p').each(function() {
          // Check if the element matches the stopping condition
          if (!$(this).is(':not(:has(a))')) {
              // Find all 'a' tags in this element
              $(this).find('a').each(function() {
                const urlTitle = $(this).text().trim()
                // check the length of letters only in urlTitle to see if it's a valid title
                if (urlTitle.replace(/[^a-zA-Z]/g, '').length > 3) {
                  reportUrls.push({
                    title: $(this).text(),
                    url: $(this)[0].href
                  })
                }
              })
          } else {
            // Stop the iteration once the stopping condition is met
            return false
          }
        })
  
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

    const bylawLinks = $('h2:contains("BY-LAWS")')
      .nextAll()
      .find('a')
      .filter(function() {
        const hashref = !!$(this)[0].href
        const regexBy = /by/i
        const regexLaw = /law/i
        const text = $(this).text()
        return hashref && regexBy.test(text) && regexLaw.test(text)
      }).map((index, element) => {
        return {
          title: $(element).text(),
          url: $(element)[0].href
        }
      }).get()

    if (bylawLinks.length > 0) {
      data.push({
        date: date,
        meetingType: meetingType,
        title: 'By-laws',
        resolutionId: null,
        contents: '',
        reportUrls: bylawLinks
      })
    }
    
    return data

  }, meetingType, date)

  return results.map((d) => {
    return {
      city: 'Vancouver',
      metroCity: 'Metro Vancouver',
      url: url,
      minutesUrl: url,
      ...d
    }
  })

}
