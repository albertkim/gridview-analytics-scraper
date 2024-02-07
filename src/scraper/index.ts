import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import {scrape as scrapeBC} from './cities/BC'
import {scrape as scrapeVancouver} from './cities/Vancouver'
import {scrape as scrapeRichmond} from './cities/Richmond'
import {scrape as scrapeBurnaby} from './cities/Burnaby'
import {scrape as scrapeSurrey} from './cities/Surrey'
import { RawRepository } from '../repositories/RawRepository'

// yarn run scrape
// NOTE: All the controls you need to run the city scraper should be here
const startDate = '2024-01-01'                  // Inclusive (reads from this date, including this date): YYYY-MM-DD
const endDate = '2024-02-31'                    // Exclusive (reads up to just before date): YYYY-MM-DD
const concurrency = 5                           // Max number of browser tabs to open
const citiesToScrape: string[] = [
  // 'BC (province)',
  // 'Vancouver',
  'Richmond',
  // 'Burnaby',
  // 'Surrey'
]
const headless = false                  // true or false (true = no browser UI, false = browser UI, 'new' = new browser UI)
const shouldUpdateDatabase = true       // If true, update database, otherwise just print a local file in this directory

async function main() {

  if (shouldUpdateDatabase) console.log(chalk.red(`NOTE: The scraper will update the database. Make sure this is what you want.`))
  else console.log(chalk.yellow(`NOTE: The scraper will not update the database.`))
  console.log(chalk.green(`Scraping: ${citiesToScrape.join(', ')}`))
  console.log(`Scraping from ${chalk.green(startDate || '-')} to ${chalk.green(endDate || '-')}`)
  console.log(`Concurrency: ${concurrency}`)

  if (citiesToScrape.includes('BC (province)')) {
    const data = await scrapeBC({
      startDate: startDate,
      endDate: endDate,
      headless: headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'bc (province).json'), JSON.stringify(data, null, 2))
  }

  if (citiesToScrape.includes('Vancouver')) {
    const data = await scrapeVancouver({
      startDate: startDate,
      endDate: endDate,
      headless: headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'vancouver.json'), JSON.stringify(data, null, 2))
  }

  if (citiesToScrape.includes('Richmond')) {
    const data = await scrapeRichmond({
      startDate: startDate,
      endDate: endDate,
      headless: headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'richmond.json'), JSON.stringify(data, null, 2))
  }

  // Burnaby code may require running in multiple date ranges because of rate limiting
  if (citiesToScrape.includes('Burnaby')) {
    const data = await scrapeBurnaby({
      startDate: startDate,
      endDate: endDate,
      headless: headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'burnaby.json'), JSON.stringify(data, null, 2))
  }

  if (citiesToScrape.includes('Surrey')) {
    const data = await scrapeSurrey({
      startDate: startDate,
      endDate: endDate,
      headless: headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'surrey.json'), JSON.stringify(data, null, 2))
  }

}

main()
