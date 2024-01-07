import puppeteer, { Page } from 'puppeteer'
import { IMeetingDetail } from '../../repositories/RawRepository'

const startUrl = 'https://citycouncil.richmond.ca/decisions/search/results.aspx?QB0=AND&QF0=ItemTopic%7cResolutionText%7cFullText%7cSubject%7cNameasSubject%7cCommitteeName%7cResult&QI0=&QB2=AND&QF2=Subject&QI2=&QB3=AND&QF3=NameasSubject&QI3=&QB5=AND&QF5=CommitteeName&QI5=%3d%22Council%22&QB1=AND&QF1=Date&QI1=&QB4=AND&QF4=Date&QI4=&TN=minutes&AC=QBE_QUERY&BU=https%3a%2f%2fcitycouncil.richmond.ca%2fdecisions%2fsearch%2fadvanced.aspx&RF=WebBriefDate&'
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

  let results = []

  try {

    // Scrape parent pages
    let parentData: Array<{url: string}> = []
    let nextPageUrl = startUrl
    for (let i = 0; i < numberOfPages; i++) {
      console.log(`Scraping parent page: ${i}`)
      const parentPageResults = await scrapeParentPage(page, nextPageUrl)
      parentData = [...parentData, ...parentPageResults.data]
      nextPageUrl = parentPageResults.nextPageUrl
    }

    console.log(`There are ${parentData.length} items in the parentData array. Scraping details...`)

    // For each parent page item, scrape the details
    for (let i = 0; i < parentData.length; i++) {
      const parentPageResult = parentData[i]
      console.log(`Scraping page details: ${i}`)
      const childPageResult = await scrapePageDetails(page, parentPageResult.url)
      if (childPageResult.date) {
        results.push({
          city: 'Richmond',
          metroCity: 'Metro Vancouver',
          ...childPageResult
        })
      }
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

interface IScrapeParentPageResults {
  nextPageUrl: string
  data: Array<{url: string}>
}

async function scrapeParentPage(page: Page, url: string): Promise<IScrapeParentPageResults> {

  await page.goto(url)

  const results = await page.evaluate(async () => {

    let data: Array<{url: string}> = []

    const resultTextElements =  $('.ResultText')

    resultTextElements.each((index, element) => {
      const moreDetailsElements = $(element).find('a:contains("More Details")')
      const moreDetailsUrl = moreDetailsElements ? moreDetailsElements.prop('href') : null
      if (moreDetailsUrl) {
        data.push({
          url: moreDetailsUrl
        })
      }
    })

    const nextPageUrl = $('.next_link').attr('href')!

    return {
      data: data,
      nextPageUrl: nextPageUrl
    }

  })

  return results

}

async function scrapePageDetails(page: Page, url: string): Promise<Omit<IMeetingDetail, 'city' | 'metroCity'>> {

  await page.goto(url)

  const results = await page.evaluate(async () => {

    const date = $('.TitleFull').text().trim()

    const resolutionTopic = $('.RecordDetailsFull :contains("Item Topic: ")').next().text().trim()

    let resolutionNumber = null
    const resolutionNumberElement = $('.RecordDetailsFull :contains("Resolution Number")')
    if (resolutionNumberElement) {
        resolutionNumber = resolutionNumberElement.next().text().trim()
    }

    let fullTextContents = ''
    const fullTextContentsElement = $('.RecordDetailsFull :contains("Full Text")')
    if (fullTextContentsElement) {
      fullTextContents = fullTextContentsElement.next().text().trim()
    }

    let resolutionContents = ''
    const resolutionContentsElement = $('.RecordDetailsFull :contains("Resolution")')
    if (resolutionContentsElement) {
        resolutionContents = resolutionContentsElement.next().text().trim()
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
      url: permalink || url,
      date: date,
      meetingType: 'City council',
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

  })

  return results

}
