import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import {scrape as scrapeBC} from './cities/BC'
import {scrape as scrapeVancouver} from './cities/Vancouver'
import {scrape as scrapeRichmond} from './cities/Richmond'
import {scrape as scrapeBurnaby} from './cities/Burnaby'
import {scrape as scrapeSurrey} from './cities/Surrey'
import { RawRepository } from '../repositories/RawRepository'
import { getArgs } from '../utilities/CommandLineUtilities'

// yarn run scrape

const concurrency = 5                  // Max number of browser tabs to open
const availableCities: string[] = [
  'BC (province)',
  'Vancouver',
  'Richmond',
  'Burnaby',
  'Surrey'
]
const shouldUpdateDatabase = true      // If true, update database, otherwise just print a local file in this directory

const args = getArgs(availableCities)

async function main() {

  if (shouldUpdateDatabase) console.log(chalk.red(`NOTE: The scraper will update the database. Make sure this is what you want.`))
  else console.log(chalk.yellow(`NOTE: The scraper will not update the database.`))
  console.log(`Concurrency: ${concurrency}`)

  if (args.cities.includes('BC (province)')) {
    console.log(chalk.bgWhite(`Scraping: BC (province)`))
    const data = await scrapeBC({
      startDate: args.startDate,
      endDate: args.endDate,
      headless: args.headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'bc (province).json'), JSON.stringify(data, null, 2))
  }

  if (args.cities.includes('Vancouver')) {
    console.log(chalk.bgWhite(`Scraping: Vancouver`))
    const data = await scrapeVancouver({
      startDate: args.startDate,
      endDate: args.endDate,
      headless: args.headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'vancouver.json'), JSON.stringify(data, null, 2))
  }

  if (args.cities.includes('Richmond')) {
    console.log(chalk.bgWhite(`Scraping: Richmond`))
    const data = await scrapeRichmond({
      startDate: args.startDate,
      endDate: args.endDate,
      headless: args.headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'richmond.json'), JSON.stringify(data, null, 2))
  }

  // Burnaby code may require running in multiple date ranges because of rate limiting
  if (args.cities.includes('Burnaby')) {
    console.log(chalk.bgWhite(`Scraping: Burnaby`))
    const data = await scrapeBurnaby({
      startDate: args.startDate,
      endDate: args.endDate,
      headless: args.headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'burnaby.json'), JSON.stringify(data, null, 2))
  }

  if (args.cities.includes('Surrey')) {
    const data = await scrapeSurrey({
      startDate: args.startDate,
      endDate: args.endDate,
      headless: args.headless,
      concurrency: concurrency
    })
    if (shouldUpdateDatabase) RawRepository.upsertNews(data)
    else fs.writeFileSync(path.join(__dirname, 'surrey.json'), JSON.stringify(data, null, 2))
  }

  process.exit(0)

}

main()
