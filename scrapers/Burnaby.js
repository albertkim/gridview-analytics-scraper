const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const startUrl = 'https://pub-burnaby.escribemeetings.com/?FillWidth=1'
const numberOfItems = 10

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
  // page.on('console', msg => {
  //   if (msg.type() === 'log') {
  //     console.log(msg.text())
  //   }
  // })

  // Inject jQuery into the page
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})

  console.log(`Browser and page initialized`)

  await page.goto(startUrl)

  await page.waitForSelector('#maincontent')

  await page.evaluate(async () => {
    $('button:contains("Past")').trigger('click')
  })

  await page.waitForSelector('.PastMeetingTypesName')

  await page.evaluate(async () => {
    $('a:contains("City Council Meeting")').trigger('click')
  })

  await page.waitForSelector('.calendar-item')

  const meetingUrls = await page.evaluate(async () => {
    const urls = $('.calendar-item a:contains("City Council Meeting")')
      .map((index, element) => element.href)
      .get()
    return urls
  })

  console.log(meetingUrls)

  let results = []
  for (let i = 0; i < meetingUrls.length && i < numberOfItems; i++) {
    console.log(`Scraping page details: ${i}`)
    const meetingUrl = meetingUrls[i]
    const meetingResults = await scrapeParentPage(page, meetingUrl)
    results = [...results, ...meetingResults].filter((r) => r.reportUrls.length > 0)
  }

  // Close the browser
  await browser.close()
  console.log(`Browser closed`)

  console.log(`Writing file...`)
  fs.writeFileSync(path.join(__dirname, 'Burnaby.json'), JSON.stringify(results, null, 2), 'utf8')
  console.log(`File saved`)

}

// Parent page refers to the city council meeting page, which includes a list of topics
/**
 * @param {puppeteer.page} page
 * @param {string} url
*/
async function scrapeParentPage(page, url) {

  await page.goto(url)
  await new Promise((resolve) => {setTimeout(resolve, 3000)})

  const results = await page.evaluate(async () => {
    const date = $('.Date').text()

    // Only look for items with attachments
    const itemElements = $('.AgendaItem').has('img[title="Attachments"]')

    const items = []

    for (const item of itemElements) {
      const title = $(item).find('a').first().text()
      const contents = $(item).find('.AgendaItemDescription').text()

      // Clicking the item opens up a floating panel with links. Also changes URL.
      const hrefJavascript = $(item).find('.AgendaItemTitle a').attr('href')
      // Regular jQuery click code doesn't work because these links execute javascript in the href instead
      eval(hrefJavascript.replace('javascript:', ''))
      await new Promise((resolve) => {setTimeout(resolve, 500)})

      const reportUrls = $('.AgendaItemSelectedDetails').find('.OrderedAttachment:not(:hidden) a').map((index, element) => {
        return {
          title: $(element).text(),
          url: new URL($(element).attr('href'), window.location.origin).href
        }
      }).get()

      console.log(reportUrls)

      items.push({
        date: date,
        meetingType: 'City council',
        title: title,
        resolutionId: null,
        contents: contents,
        reportUrls: reportUrls
      })
    }

    return items
  })

  return results.map((r) => {
    return {
      city: 'Burnaby',
      metroCity: 'Metro Vancouver',
      url: page.url(),
      ...r,
      minutesUrl: url
    }
  })

}

main()
