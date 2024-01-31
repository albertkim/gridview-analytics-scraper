import axios from 'axios'
import moment from 'moment'
import fs from 'fs'
import path from 'path'
import csv from 'csvtojson'
import puppeteer from 'puppeteer'
import { formatDateString } from '../../scraper/BulkUtilities'

const startUrl = 'https://data.opendatasoft.com/explore/dataset/issued-building-permits%40vancouver/export/?sort=-issueyear'

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
}

async function scrape(options: IOptions) {

  const browser = await puppeteer.launch({
    headless: options.headless !== undefined ? options.headless : 'new'
  })

  const page = await browser.newPage()

  await page.goto(startUrl)

  const csvExportUrl = await page.evaluate(async () => {

    // Page already comes with jQuery

    const rawExportUrl = $('a:contains("Whole dataset")').first().attr('href')!
    const exportUrl = new URL(rawExportUrl, window.location.origin).href
    return exportUrl

  })

  // Note: This is a large 40mb+ file
  const response = await axios.get(csvExportUrl, { responseType: 'arraybuffer' })
  const csvString = Buffer.from(response.data).toString('utf8')

  const data = await csv({
    delimiter: ';',
    trim: true,
    nullObject: true
  }).fromString(csvString)

  // Save file as a local file for future reference
  fs.writeFileSync(path.join(__dirname, 'vancouver-development-permits.json'), JSON.stringify(data, null, 2))

  // Only return approved permits for new buildings, filter by date
  const filteredData = data
    .filter((row) => !!row['IssueDate'])
    .filter((row) => row['TypeOfWork'] === 'New Building')
    .filter((row) => {
      const date = formatDateString(row['IssueDate'])
      if (options.startDate) {
        if (moment(date).isBefore(options.startDate!)) {
          return false
        }
      }
      if (options.endDate) {
        if (moment(date).isSameOrAfter(options.endDate!)) {
          return false
        }
      }
      return true
    })

  return filteredData

}

export async function analyze(options: IOptions) {

  const data = await scrape(options)

  const developmentPermits = []

  for (const entry of data) {
    // TODO: Need to refactor RezoningsRepository to use this
  }

}
