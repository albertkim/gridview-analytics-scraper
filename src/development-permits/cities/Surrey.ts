import moment from 'moment'
import chalk from 'chalk'
import { RawRepository } from '../../repositories/RawRepository'
import { IFullRezoningDetail } from '../../repositories/RecordsRepository'
import { generateID } from '../../repositories/GenerateID'
import { AIGetPartialRecords } from '../../rezonings/AIUtilitiesV2'
import { RecordsRepository as RecordsRepositoryConstructor } from '../../repositories/RecordsRepositoryV2'

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
}

const RecordsRepository = new RecordsRepositoryConstructor('draft')

// Development permits are mentioned in scraped city council meetings
async function scrape(options: IOptions) {

  const news = RawRepository.getNews({city: 'Surrey'})

  // Filter by development permits type, dates, and reports
  const filteredNews = news
    .filter((n) => {
      // Check contents and make sure it includes "development permit", case-insensitive
      const regex = /development\s*permit/i
      return regex.test(n.contents)
    })
    .filter((n) => {
      if (options.startDate) {
        if (moment(n.date).isBefore(options.startDate!)) {
          return false
        }
      }
      if (options.endDate) {
        if (moment(n.date).isSameOrAfter(options.endDate!)) {
          return false
        }
      }
      return true
    })
    .filter((n) => {
      return n.reportUrls.length > 0
    })

  return filteredNews

}

export async function analyze(options: IOptions) {

  // Filtered to only include news with at least one report URL
  const newsWithDevelopmentPermits = await scrape(options)

  for (const news of newsWithDevelopmentPermits) {

    const report = news.reportUrls[0]

    // Regex to find XXXX-XXXX-XX where X is a number
    const permitNumberRegex = /\d{4}-\d{4}-\d{2}/
    const permitNumber = `${report.title} ${news.contents}`.match(permitNumberRegex)?.[0]

    if (!permitNumber) {
      console.log(chalk.red(`No XXXX-XXXX-XX permit number found for ${news.date} - ${news.title}`))
      continue
    }

    const response = await AIGetPartialRecords(news.contents, 'XXXX-XXXX-XX where X is a number', {
      instructions: 'Identify only the items that refer to new developments, not alterations.',
      fieldsToAnalyze: ['building type', 'stats'],
      expectedWords: [permitNumber]
    })

    const records: IFullRezoningDetail[] = response.map((permit) => {
      return {
        id: generateID('dev'),
        city: 'Surrey',
        metroCity: 'Metro Vancouver',
        type: 'development permit',
        applicationId: permitNumber,
        address: permit.address,
        applicant: permit.applicant,
        behalf: permit.behalf,
        description: permit.description,
        buildingType: permit.buildingType,
        status: 'approved',
        stats: permit.stats,
        zoning: permit.zoning,
        dates: {
          appliedDate: null,
          publicHearingDate: null,
          approvalDate: news.date,
          denialDate: null,
          withdrawnDate: null
        },
        reportUrls: [
          {
            title: report.title,
            url: report.url,
            date: news.date,
            status: 'approved'
          }
        ],
        minutesUrls: news.minutesUrl ? [
          {
            url: news.minutesUrl,
            date: news.date,
            status: 'approved'
          }
        ] : [],
        location: {
          latitude: null,
          longitude: null
        },
        createDate: moment().format('YYYY-MM-DD'),
        updateDate: moment().format('YYYY-MM-DD')
      }
    })

    for (const record of records) {
      RecordsRepository.upsertRecords('development permit', [record])
    }
    
  }

}
