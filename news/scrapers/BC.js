const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const startUrl = 'https://archive.news.gov.bc.ca/'
const numberOfPages = 3

async function main() {

  console.log(`Launching Puppeteer`)
  const browser = await puppeteer.launch({
    headless: 'new'
  })

  // Pass this page instance around instead of re-using a global variable
  console.log(`Opening browser new page`)
  const page = await browser.newPage()

  // Print browser page console events to this node script console
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log(msg.text())
    }
  })

  // Inject jQuery into the page
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

  console.log(`Browser and page initialized`)

  await page.goto(startUrl)
  await page.waitForTimeout(500)

  try {

    // Filter for news from the Ministry of Housing
    await page.evaluate(async () => {
      $('#ministryList > select > option:contains("Ministory of Housing")')
      $('#searchButton input').click()
    })
    await page.waitForTimeout(1000)

    // Scrape parent pages and store a list of news links
    /**
     * @type {
     *  {
     *    url: string
     *  }[]
     * }
     */
    let parentData = []

    for (let i = 0; i < numberOfPages; i++) {
      console.log(`Ministory of Housing - Scraping parent page: ${i}`)
      const parentPageResults = await scrapeParentPage(page)
      parentData = [...parentData, ...parentPageResults.data]
      // Next page
      await page.evaluate(async () => {
        $('input[title*="Next Page"]').click()
      })
      await page.waitForTimeout(1000)
    }

    // Filter for news from the Ministry of Transportation and Infrastructure
    await page.evaluate(async () => {
      $('#ministryList > select > option:contains("Ministry of Transportation and Infrastructure")')
      $('#searchButton input').click()
    })
    await page.waitForTimeout(1000)

    for (let i = 0; i < numberOfPages; i++) {
      console.log(`Ministry of Transportation and Infrastructure - Scraping parent page: ${i}`)
      const parentPageResults = await scrapeParentPage(page)
      parentData = [...parentData, ...parentPageResults.data]
      // Next page
      await page.evaluate(async () => {
        $('input[title*="Next Page"]').click()
      })
      await page.waitForTimeout(500)
    }

    console.log(parentData)

    // For each parent page item, scrape the details
    let results = []

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

    console.log(`Writing file...`)
    fs.writeFileSync(path.join(__dirname, 'BC.json'), JSON.stringify(results, null, 2), 'utf8')
    console.log(`File saved`)

  } catch (error) {

    console.error(error)

    await browser.close()
    console.log(`Browser closed`)

  }

}

/**
 * @param {puppeteer.Page} page
*/
async function scrapeParentPage(page) {

  const results = await page.evaluate(async () => {
    let data = []

    const tableRecordElements = $('.newsRelease')

    tableRecordElements.each((index, element) => {

      const date = $(element).find('.dateline').text()
      const url = $(element).find('a')[0].href
      data.push({
        date: date,
        url: url
      })
    })

    return {
      data: data
    }
  })

  return results

}

/**
 * REfers to each item within a Vancouver meeting minute
 * @typedef {Object} MeetingDetail
 * @property {string} url
 * @property {string} date
 * @property {string} meetingType
 * @property {string} title
 * @property {string} resolutionId
 * @property {string} contents
 * @property {string} minutesUrl
 * @property {{title: string, url: string}[]} reportUrls
 */

/**
 * @param {puppeteer.Page} page
 * @param {string} url
 * @param {string} date
 * @returns {MeetingDetail[]}
*/
async function scrapePageDetails(page, url, date) {

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

main()
