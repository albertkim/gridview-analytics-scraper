import {scrape as scrapeBC} from './cities/BC'
import {scrape as scrapeVancouver} from './cities/Vancouver'
import {scrape as scrapeRichmond} from './cities/Richmond'
import {scrape as scrapeBurnaby} from './cities/Burnaby'
import { RawRepository } from '../repositories/RawRepository'

// TODO: This param is only properly used for Burnaby atm
const startDate = null
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
      endDate: endDate,
      headless: 'new'
    })
    RawRepository.updateNews('BC (province)', bcData)
  }

  if (citiesToScrape.includes('Vancouver')) {
    const vancouverData = await scrapeVancouver({
      startDate: startDate,
      endDate: endDate,
      headless: 'new'
    })
    RawRepository.updateNews('Vancouver', vancouverData)
  }

  if (citiesToScrape.includes('Richmond')) {
    const richmondData = await scrapeRichmond({
      startDate: startDate,
      endDate: endDate,
      headless: 'new'
    })
    RawRepository.updateNews('Richmond', richmondData)
  }

  // Burnaby code requires running in multiple date batches, upsert entries instead of fully replacing
  if (citiesToScrape.includes('Burnaby')) {
    const burnabyData = await scrapeBurnaby({
      startDate: startDate,
      endDate: endDate,
      headless: 'new'
    })
    RawRepository.upsertNews('Burnaby', burnabyData)
  }

}

main()
