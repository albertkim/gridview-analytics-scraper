import moment from 'moment'
import chalk from 'chalk'
import { IMeetingDetail, RawRepository } from '../../repositories/RawRepository'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'
import { chatGPTPartialRezoningQuery, getGPTBaseRezoningQuery } from '../../rezonings/AIUtilities'
import { IFullRezoningDetail, RecordsRepository } from '../../repositories/RecordsRepository'
import { generateID } from '../../repositories/GenerateID'

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
}

// Development permits are mentioned in scraped city council meetings
async function scrape(options: IOptions) {

  const news = RawRepository.getNews({city: 'Richmond'})

  // Filter by date and development permits
  const filteredNews = news
    .filter((n) => {
      // Check title and make sure it includes "permit - development" or "permits - development", case-insensitive, variable number of spaces/dashes in between
      const regex = /permits?\s*-\s*development/i
      return regex.test(n.title)
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

  return filteredNews

}

// Each news item may have one or more development permit reports, and the permit reports may even refer to the same one (ex. a development panel permit minute and an approval report - ex: http://citycouncil.richmond.ca/decisions/search/permalink/15569)
// TODO: May be an issue if multiple development permits are issued in the same document
export async function analyze(options: IOptions) {

  const newsWithDevelopmentPermits = await scrape(options)

  for (const news of newsWithDevelopmentPermits) {

    // Look for reports that include "report to council" (note that each word could be on separate lines)
    const matchingReportContents: {news: IMeetingDetail, reportUrl: string, contents: string}[] = []

    for (const report of news.reportUrls) {
      const pdf = await downloadPDF(report.url)
      const parsedReport = await parsePDF(pdf, 3) // These reports are strange because almost every word is on a new line
      const regex = /report\s+to\s+council/i
      const match = regex.test(parsedReport.replace(/\n/g, ' '))
      if (match) matchingReportContents.push({
        news: news,
        reportUrl: report.url,
        contents: parsedReport
      })
    }

    for (const contents of matchingReportContents) {
      const response = await chatGPTPartialRezoningQuery(
        getGPTBaseRezoningQuery(contents.contents, {
          applicationId: `permit id in the format of DP XX-XXXXXX where X is a number`
        }),
        {analyzeType: true, analyzeStats: true}
      )

      if (!response) {
        console.log(chalk.red(`Error with Richmond development permit ${contents.news.date} - ${contents.reportUrl}`))
        continue
      }

      const record: IFullRezoningDetail = {
        id: generateID('dev'),
        city: 'Richmond',
        metroCity: 'Metro Vancouver',
        type: 'development permit',
        applicationId: response.applicationId,
        address: response.address,
        applicant: response.applicant,
        behalf: response.behalf,
        description: response.description,
        buildingType: response.buildingType,
        status: 'approved',
        dates: {
          appliedDate: null,
          publicHearingDate: null,
          approvalDate: contents.news.date,
          denialDate: null,
          withdrawnDate: null
        },
        stats: response.stats,
        zoning: response.zoning,
        reportUrls: [
          {
            url: contents.reportUrl,
            title: 'Report to Council',
            date: contents.news.date,
            status: 'approved'
          }
        ],
        minutesUrls: contents.news.minutesUrl ? [{
          url: contents.news.minutesUrl,
          date: contents.news.date,
          status: 'approved'
        }] : [],
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


}
