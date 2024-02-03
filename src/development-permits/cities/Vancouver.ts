import axios from 'axios'
import moment from 'moment'
import fs from 'fs'
import path from 'path'
import csv from 'csvtojson'
import puppeteer from 'puppeteer'
import { cleanString, formatDateString } from '../../scraper/BulkUtilities'
import { generateID } from '../../repositories/GenerateID'
import { AIGetRecordDetails } from '../../utilities/AIUtilitiesV2'
import { IFullRezoningDetail } from '../../repositories/RecordsRepository'
import { RecordsRepository as RecordsRepositoryConstructor } from '../../repositories/RecordsRepositoryV2'

const startUrl = 'https://data.opendatasoft.com/explore/dataset/issued-building-permits%40vancouver/export/?sort=-issueyear'

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
}

interface IVancouverDevelopmentPermit {
  PermitNumber: string
  PermitNumberCreatedDate: string
  IssueDate: string
  PermitElapsedDays: string
  ProjectValue: string
  TypeOfWork: string
  Address: string
  ProjectDescription: string
  PermitCategory: string
  Applicant: string
  ApplicantAddress: string
  PropertyUse: string
  SpecificUseCategory: string
  BuildingContractor: string
  BuildingContractorAddress: string
  IssueYear: string
  GeoLocalArea: string
  Geom: string
  YearMonth: string
  geo_point_2d: string
}

const RecordsRepository = new RecordsRepositoryConstructor('draft')

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

  const data: IVancouverDevelopmentPermit[] = await csv({
    delimiter: ';',
    trim: true,
    nullObject: true
  }).fromString(csvString)

  // Save file as a local file for future reference
  fs.writeFileSync(path.join(__dirname, 'vancouver-dps.json'), JSON.stringify(data, null, 2))

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

  for (const entry of data) {

    const detailsResponse = await AIGetRecordDetails(entry.ProjectDescription, {fieldsToAnalyze: ['building type', 'stats']})
    if (!detailsResponse) {
      continue
    }

    const record: IFullRezoningDetail = {
      id: generateID('dev'),
      city: 'Vancouver',
      metroCity: 'Metro Vancouver',
      type: 'development permit',
      applicationId: entry.PermitNumber,
      address: entry.Address.split(', Vancouver')[0],
      applicant: entry.Applicant,
      behalf: null,
      description: cleanString(entry.ProjectDescription),
      buildingType: detailsResponse.buildingType,
      status: 'approved',
      dates: {
        appliedDate: null,
        publicHearingDate: null,
        approvalDate: formatDateString(entry.IssueDate),
        denialDate: null,
        withdrawnDate: null
      },
      stats: detailsResponse.stats,
      zoning: detailsResponse.zoning,
      reportUrls: [
        {
          url: startUrl,
          title: 'Vancouver OpenData',
          date: formatDateString(entry.IssueDate),
          status: 'approved'
        }
      ],
      minutesUrls: [], // No minutes for vancouver development permits
      location: {
        latitude: null,
        longitude: null
      },
      createDate: moment().format('YYYY-MM-DD'),
      updateDate: moment().format('YYYY-MM-DD')
    }

    RecordsRepository.upsertRecords('development permit', [record])

  }

}
