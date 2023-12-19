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
  await page.waitForSelector('.TableRecords')

  let results = []

  try {

    // Need to go to the 'previous meetings' tab first
    await page.evaluate(async () => {
      $('a:contains("Previous Meetings")').click()
    })

    // Scrape parent pages
    let parentData = []
    for (let i = 0; i < numberOfPages; i++) {
      console.log(`Scraping parent page: ${i}`)
      const parentPageResults = await scrapeParentPage(page)
      console.log(parentPageResults)
      parentData = [...parentData, ...parentPageResults.data]
      // Next page
      await page.evaluate(async () => {
        $('.ListNavigation_Next').click()
      })
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
 * @param {puppeteer.page} page
*/
async function scrapeParentPage(page) {

  const results = await page.evaluate(async () => {
    let data = []

    const tableRecordElements = $('.TableRecords tbody tr')

    tableRecordElements.each((index, element) => {

      const date = $(element).find('td:nth-child(1)').text()
      const meetingType = $(element).find('td:nth-child(2)').text()
      let meetingMinutesUrl
      const meetingMinutesUrlElement = $(element).find(':contains("Agenda and Minutes")')
      if (meetingMinutesUrlElement) {
        meetingMinutesUrl = meetingMinutesUrlElement.attr('href')
      }

      console.log(`Date: ${date}`)
      console.log(`Meeting type: ${meetingType}`)
      console.log(`Meeting minutes URL: ${meetingMinutesUrl}`)

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

main()
