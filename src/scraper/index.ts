import {scrape as scrapeBC} from './cities/BC'
import {scrape as scrapeVancouver} from './cities/Vancouver'
import {scrape as scrapeRichmond} from './cities/Richmond'
import {scrape as scrapeBurnaby} from './cities/Burnaby'
import { RawRepository } from '../repositories/RawRepository'
import { BulkUtilities } from './BulkUtilities'

// TODO: This param isn't properly used in the scraper yet
const startDate = '2021-01-01'
const endDate = null
const citiesToScrape: string[] = [
  // 'BC (province)',
  // 'Vancouver',
  // 'Richmond',
  'Burnaby'
]

async function main() {

  if (citiesToScrape.includes('BC (province)')) {
    const bcData = await scrapeBC({
      startDate: startDate,
      endDate: null,
      headless: false
    })
    RawRepository.updateNews('BC (province)', bcData)
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
    // RawRepository.updateNews('Burnaby', burnabyData)
  }

  // Bulk operations
  // BulkUtilities.bulkCleanDate()

}

main()
