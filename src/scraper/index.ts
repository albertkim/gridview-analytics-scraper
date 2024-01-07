import {scrape as scrapeBC} from './cities/BC'
import {scrape as scrapeVancouver} from './cities/Vancouver'
import {scrape as scrapeRichmond} from './cities/Richmond'
import {scrape as scrapeBurnaby} from './cities/Burnaby'
import { RawRepository } from '../repositories/RawRepository'

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
    RawRepository.updateNews('BC', bcData)
  }

  if (citiesToScrape.includes('Vancouver')) {
    const vancouverData = await scrapeVancouver({
      startDate: startDate,
      endDate: null,
      headless: false
    })
    RawRepository.updateNews('Vancouver', vancouverData)
  }

  if (citiesToScrape.includes('Richmond')) {
    const richmondData = await scrapeRichmond({
      startDate: startDate,
      endDate: null,
      headless: false
    })
    RawRepository.updateNews('Richmond', richmondData)
  }

  if (citiesToScrape.includes('Burnaby')) {
    const burnabyData = await scrapeBurnaby({
      startDate: startDate,
      endDate: null,
      headless: false
    })
    RawRepository.updateNews('Burnaby', burnabyData)
  }

}

main()
