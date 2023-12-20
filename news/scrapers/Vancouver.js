const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const startUrl = 'https://covapp.vancouver.ca/councilMeetingPublic/CouncilMeetings.aspx'
const numberOfPages = 3

async function main() {

  console.log(`Launching Puppeteer`)
  const browser = await puppeteer.launch({
    headless: 'new'
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
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log(msg.text())
    }
  })

  // Inject jQuery into the page
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

  console.log(`Browser and page initialized`)

  await page.goto(startUrl)

  // Wait for the text 'Previous Meetings' somewhere on the page
  await page.waitForFunction(
    text => !!Array.from(document.querySelectorAll('*')).find(el => el.textContent.includes(text)),
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
    /**
     * @type {
     *  {
     *    url: string
     *  }[]
     * }
     */
    let parentData = []
    for (let i = 0; i < numberOfPages; i++) {
      console.log(`Scraping parent page: ${i}`)
      const parentPageResults = await scrapeParentPage(page)
      parentData = [...parentData, ...parentPageResults.data]
      // Next page
      await page.evaluate(async () => {
        $('.ListNavigation_Next').click()
      })
      await page.waitForTimeout(500)
    }

    console.log(parentData)

    // For each parent page item, scrape the details
    let results = []

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

    console.log(`Writing file...`)
    fs.writeFileSync(path.join(__dirname, 'Vancouver.json'), JSON.stringify(results, null, 2), 'utf8')
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
 * @returns {MeetingDetail[]}
*/
async function scrapePageDetails(page, url) {

  await page.goto(url)

  const results = await page.evaluate(async () => {
  
    let data = []

    /**
     * 
     * @param {string} title 
     */
    function cleanTitle(title) {
      if (title) {
        return title.replace(/^\d+\.\s*/, '').trim()
      } return {
        undefined
      }
    }

    const meetingType = $('h1').first().html().split('<br>')[0].replace('agenda', '').trim()
    const date = $('h1').first().html().split('<br>')[1].trim()

    // Vancouver council meeting notes are organized by a series of
    // - h3 "MATTERS ADOPTED ON CONSENT"/"REPORTS" for primary discussion items followed up by ul
    // - h2 "REFERRAL REPORTS" followed up by an h3
    // - h2 "BY-LAWS" followed up by p elements (first may have a PDF)

    $('.main-content h3').each((index, element) => {
      const title = cleanTitle($(element).text().trim())
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
    })

    // Now, handle bylaws separately
    // TODO
    
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



main()
