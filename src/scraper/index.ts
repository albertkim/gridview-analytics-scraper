import fs from 'fs'
import path from 'path'
import {scrape as scrapeBC} from './cities/BC'
import {scrape as scrapeVancouver} from './cities/Vancouver'
import {scrape as scrapeRichmond} from './cities/Richmond'
import {scrape as scrapeBurnaby} from './cities/Burnaby'

// TODO: This param isn't properly used in the scraper yet
const startDate = '2021-01-01'
const endDate = null
const citiesToScrape = [
  'BC',
  'Vancouver',
  'Richmond',
  'Burnaby'
]

async function main() {

  // Phase 1 - Raw scraping

  if (citiesToScrape.includes('BC')) {
    const bcData = await scrapeBC({
      startDate: startDate,
      endDate: null,
      headless: false
    })
    fs.writeFileSync(
      path.join(__dirname, '/cities/BC-results.json'),
      JSON.stringify(bcData, null, 2),
      'utf8'
    )
  }

  if (citiesToScrape.includes('Vancouver')) {
    const vancouverData = await scrapeVancouver({
      startDate: startDate,
      endDate: null,
      headless: false
    })
    fs.writeFileSync(
      path.join(__dirname, '/cities/Vancouver-results.json'),
      JSON.stringify(vancouverData, null, 2),
      'utf8'
    )
  }

  if (citiesToScrape.includes('Richmond')) {
    const richmondData = await scrapeRichmond({
      startDate: startDate,
      endDate: null,
      headless: false
    })
    fs.writeFileSync(
      path.join(__dirname, '/cities/Richmond-results.json'),
      JSON.stringify(richmondData, null, 2),
      'utf8'
    )
  }

  if (citiesToScrape.includes('Burnaby')) {
    const richmondData = await scrapeBurnaby({
      startDate: startDate,
      endDate: null,
      headless: false
    })
    fs.writeFileSync(
      path.join(__dirname, '/cities/Burnaby-results.json'),
      JSON.stringify(richmondData, null, 2),
      'utf8'
    )
  }

  // Phase 2 - News

  // Phase 3 - Rezonings

}

main()
