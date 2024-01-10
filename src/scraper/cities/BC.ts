import puppeteer, { Page } from 'puppeteer'
import { IMeetingDetail } from '../../repositories/RawRepository'
import moment from 'moment'

const startUrl = 'https://archive.news.gov.bc.ca/'
const numberOfPages = 40

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
  verbose?: boolean
}

export async function scrape(options: IOptions): Promise<IMeetingDetail[]> {

  console.log(`Launching Puppeteer`)
  const browser = await puppeteer.launch({
    headless: options.headless !== undefined ? options.headless : 'new'
  })

  const page = await browser.newPage()

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
  await page.waitForTimeout(500)

  try {

    // Filter for news from the Ministry of Housing
    await page.evaluate(async () => {
      $('#ministryList > select > option:contains("Ministry of Housing")').attr('selected', 'selected')
      $('#searchButton input').click()
    })
    await page.waitForTimeout(2000)

    let parentData: Array<{url: string, date: string}> = []

    for (let i = 0; i < numberOfPages; i++) {
      console.log(`Ministry of Housing - Scraping parent page: ${i}`)
      const parentPageResults = await scrapeParentPage(page)
      parentData = [...parentData, ...parentPageResults]
      // Next page
      await page.evaluate(async () => {
        $('input[title*="Next Page"]').click()
      })
      await page.waitForTimeout(2000)
    }

    // Filter for news from the Ministry of Transportation and Infrastructure
    await page.evaluate(async () => {
      $('#ministryList > select > option:contains("Ministry of Transportation and Infrastructure")').attr('selected', 'selected')
      $('#searchButton input').click()
    })
    await page.waitForTimeout(2000)

    for (let i = 0; i < numberOfPages; i++) {
      console.log(`Ministry of Transportation and Infrastructure - Scraping parent page: ${i}`)
      const parentPageResults = await scrapeParentPage(page)
      parentData = [...parentData, ...parentPageResults]
      // Next page
      await page.evaluate(async () => {
        $('input[title*="Next Page"]').click()
      })
      await page.waitForTimeout(2000)
    }

    console.log(parentData)

    // For each parent page item, scrape the details
    let results: IMeetingDetail[] = []

    for (let i = 0; i < parentData.length; i++) {
      const parentPageResult = parentData[i]
      console.log(`Scraping page details: ${i}`)
      const childPageResult = await scrapePageDetails(page, parentPageResult.url, parentPageResult.date)
      results.push({
        city: 'BC (province)',
        metroCity: null,
        ...childPageResult
      })
    }

    // Close the browser
    await browser.close()
    console.log(`Browser closed`)

    results.forEach((result) => {
      result.date = moment(new Date(result.date)).format('YYYY-MM-DD')
    })

    return results

  } catch (error) {

    await browser.close()
    console.log(`Browser closed`)

    throw error

  }

}

async function scrapeParentPage(page: Page): Promise<Array<{date: string, url: string}>> {

  const results = await page.evaluate(async () => {
    let data: Array<{date: string, url: string}> = []

    const tableRecordElements = $('.newsRelease')

    tableRecordElements.each((index, element) => {

      const date = $(element).find('.dateline').text()
      const url = $(element).find('a')[0].href
      data.push({
        date: date,
        url: url
      })
    })

    return data
  })

  return results

}

async function scrapePageDetails(page: Page, url: string, date: string): Promise<Omit<IMeetingDetail, 'city' | 'metroCity'>> {

  await page.goto(url)
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

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
    ...results,
    date: date,
    url: url,
    minutesUrl: url
  }

}
