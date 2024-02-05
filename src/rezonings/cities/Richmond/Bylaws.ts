import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { ZoningStatus } from '../../../repositories/RecordsRepository'
import { ErrorsRepository } from '../../../repositories/ErrorsRepository'
import { parseCleanPDF } from '../../../utilities/PDFUtilitiesV2'
import { FullRecord } from '../../../repositories/FullRecord'
import { AIGetPartialRecords } from '../../../utilities/AIUtilitiesV2'

export function checkIfBylaw(news: IMeetingDetail) {
  const isRichmond = news.city === 'Richmond'
  const hasReportURLs = news.reportUrls.length > 0
  const isCouncil = news.meetingType === 'Council Minutes'
  const titleHasBylaw = news.title.toLowerCase().includes('bylaws for adoption')
  return isRichmond && hasReportURLs && isCouncil && titleHasBylaw
}

// Example: https://citycouncil.richmond.ca/__shared/assets/Bylaw_1043570969.pdf
export async function parseBylaw(news: IMeetingDetail): Promise<FullRecord[]> {

  const finalRecords: FullRecord[] = []

  try {

    for (const pdfUrl of news.reportUrls) {

      const parsedPDF = await parseCleanPDF(pdfUrl.url, {
        maxPages: 2
      })

      if (!parsedPDF) {
        console.log(chalk.red(`PDF could not be parsed: ${pdfUrl.url}`))
        continue
      }

      // Get the first matching application ID - RZ XX-XXXXXX
      const permitNumberRegex = /RZ[\s\S]{0,3}(\d{2}-\d{6})/i
      const permitNumberWithoutPrefix = parsedPDF.match(permitNumberRegex)?.[1]
      if (!permitNumberWithoutPrefix) {
        console.log(chalk.red(`No rezoning number found for Richmond bylaw - ${news.reportUrls[0].url}`))
        return []
      }

      const permitNumber = `RZ ${permitNumberWithoutPrefix}`

      const response = await AIGetPartialRecords(parsedPDF, {
        expectedWords: [permitNumber],
        fieldsToAnalyze: [] // Don't rely on bylaw data to get specific rezoning details
      })

      if (!response || response.length === 0) {
        console.log(chalk.red(`No response for Richmond bylaw - ${news.reportUrls[0].url}`))
        return []
      }

      // Figure out if approved, denied, or withdrawn
      let status: ZoningStatus = 'approved'
      if (news.title.toLowerCase().includes('defeated')) status = 'denied'
      if (news.title.toLowerCase().includes('withdrawn')) status = 'withdrawn'

      const records =  response.map((record) => {
        return new FullRecord({
          city: 'Richmond',
          metroCity: 'Metro Vancouver',
          type: 'rezoning',
          applicationId: record.applicationId,
          address: record.address,
          applicant: record.applicant,
          behalf: record.behalf,
          description: record.description,
          buildingType: record.buildingType,
          status: status,
          dates: {
            appliedDate: null,
            publicHearingDate: null,
            approvalDate: status === 'approved' ? news.date : null,
            denialDate: status === 'denied' ? news.date : null,
            withdrawnDate: status === 'withdrawn' ? news.date : null
          },
          reportUrls: news.reportUrls.map((urlObject) => {
            return {
              date: news.date,
              title: urlObject.title,
              url: urlObject.url,
              status: status
            }
          }),
          minutesUrls: news.minutesUrl ? [{
            url: news.minutesUrl,
            date: news.date,
            status: status
          }] : [],
        })
      })

      finalRecords.push(...records)

    }

    return finalRecords

  } catch (error) {
    console.error(chalk.bgRed('Error parsing bylaw'))
    console.error(chalk.red(error))
    ErrorsRepository.addError(news)
    return []
  }

}
