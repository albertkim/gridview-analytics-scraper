import fs from 'fs'
import path from 'path'
import {scrape as scrapeBC} from './cities/BC'
import {scrape as scrapeVancouver} from './cities/Vancouver'

// TODO: This param isn't properly used in the scraper yet
const startDate = '2021-01-01'
const endDate = null

async function main() {

  // Phase 1 - Raw scraping

  const bcData = await scrapeBC({
    startDate: startDate,
    endDate: null
  })
  fs.writeFileSync(
    path.join(__dirname, '/cities/BC.json'),
    JSON.stringify(bcData, null, 2),
    'utf8'
  )

  const vancouverData = await scrapeVancouver({
    startDate: startDate,
    endDate: null
  })
  fs.writeFileSync(
    path.join(__dirname, '/cities/Vancouver.json'),
    JSON.stringify(vancouverData, null, 2),
    'utf8'
  )

  // Phase 2 - News

  // Phase 3 - Rezonings

}


main()
