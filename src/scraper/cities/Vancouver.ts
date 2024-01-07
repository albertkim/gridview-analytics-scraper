import puppeteer, { Page } from 'puppeteer'
import { IMeetingDetail } from '../../repositories/RawRepository'

const startUrl = 'https://covapp.vancouver.ca/councilMeetingPublic/CouncilMeetings.aspx'
const numberOfPages = 3

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
  verbose?: boolean
}

export async function scrape(options: IOptions): Promise<IMeetingDetail[]> {

  console.log(`Launching Puppeteer`)
  const browser = await puppeteer.launch({
    headless: options.headless || 'new'
  })

  // Pass this page instance around instead of re-using a global variable
  console.log(`Opening browser new page`)
  const page = await browser.newPage()

  // Vancouver website requires desktop size to show tabular data
  page.setViewport({
    width: 1980,
    height: 1080
  })

  // Print browser page console events to this node script console
  if (options.verbose) {
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(msg.text())
      }
    })
  }

  // Inject jQuery into the page
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

  console.log(`Browser and page initialized`)

  await page.goto(startUrl)

  // Wait for the text 'Previous Meetings' somewhere on the page
  await page.waitForFunction(
    text => !!Array.from(document.querySelectorAll('*')).find(el => el.textContent!.includes(text)),
    {},
    'Previous Meetings'
  )

  // Need to go to the 'previous meetings' tab first
  await page.evaluate(async () => {
    $('a:contains("Previous Meetings")').click()
  })
  await page.waitForTimeout(500)

  try {

    // Need to go to the 'previous meetings' tab first
    await page.evaluate(async () => {
      $('a:contains("Previous Meetings")').click()
    })

    // Scrape parent pages and store a list of the "Agenda and minutes" links
    let parentData: Array<{url: string}> = []
    for (let i = 0; i < numberOfPages; i++) {
      console.log(`Scraping parent page: ${i}`)
      const parentPageResults = await scrapeParentPage(page)
      parentData = [...parentData, ...parentPageResults]
      // Next page
      await page.evaluate(async () => {
        $('.ListNavigation_Next').click()
      })
      await page.waitForTimeout(500)
    }

    console.log(parentData)

    // For each parent page item, scrape the details
    let results: IMeetingDetail[] = []

    for (let i = 0; i < parentData.length; i++) {
      const parentPageResult = parentData[i]
      console.log(`Scraping page details: ${i}`)
      const childPageResult = await scrapePageDetails(page, parentPageResult.url)
      results = [...results, ...childPageResult.map((result) => {
        return {
          city: 'Vancouver',
          metroCity: 'Metro Vancouver',
          ...result
        }
      })]
    }

    // Close the browser
    await browser.close()
    console.log(`Browser closed`)

    return results

  } catch (error) {

    await browser.close()
    console.log(`Browser closed`)

    throw error

  }

}

async function scrapeParentPage(page: Page): Promise<Array<{url: string}>> {

  const results = await page.evaluate(async () => {
    let data: Array<{url: string}> = []

    const tableRecordElements = $('.TableRecords tbody tr')

    tableRecordElements.each((index, element) => {

      const date = $(element).find('td:nth-child(1)').text()
      const meetingType = $(element).find('td:nth-child(2)').text()
      let meetingMinutesUrl
      const meetingMinutesUrlElement = $(element).find('td:nth-child(4) a:contains("Agenda and Minutes")')
      if (meetingMinutesUrlElement) {
        meetingMinutesUrl = meetingMinutesUrlElement.attr('href')
      }

      if (meetingMinutesUrl) {
        data.push({
          url: meetingMinutesUrl
        })
      }
    })

    return data
  })

  return results

}

async function scrapePageDetails(page: Page, url: string): Promise<Omit<IMeetingDetail, 'city' | 'metroCity'>[]> {

  await page.goto(url)

  const results = await page.evaluate(async () => {
    
    let data: Omit<IMeetingDetail, 'city' | 'metroCity' | 'url' | 'minutesUrl'>[] = []

    function cleanTitle(title: string) {
      if (title) {
        return title.replace(/^\d+\.\s*/, '').trim()
      } else {
        return ''
      }
    }

    const meetingType = $('h1').first().html().split('<br>')[0].replace('agenda', '').trim()
    const date = $('h1').first().html().split('<br>')[1].trim()

    // Vancouver council meeting notes are organized by a series of
    // - h3 "MATTERS ADOPTED ON CONSENT"/"REPORTS" for primary discussion items followed up by ul
    // - h2 "REFERRAL REPORTS" followed up by an h3
    // - h2 "BY-LAWS" followed up by p elements (first may have a PDF)

    $('.main-content h3').each((index, element) => {
      const rawTitle = $(element).text().trim()
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

  })

  // Populate with additional useful data
  // Puppeteer page.evaluate cannot access variables outside of it
  return results.map((d) => {
    return {
      url: url,
      minutesUrl: url,
      ...d,
    }
  })

}
