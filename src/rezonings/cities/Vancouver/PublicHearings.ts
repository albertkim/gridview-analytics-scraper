import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, IPartialRezoningDetail, checkGPTJSON } from '../../../repositories/RezoningsRepository'
import { getGPTBaseRezoningQuery, chatGPTTextQuery, getGPTBaseRezoningStatsQuery } from '../../GPTUtilities'
import { downloadPDF, generatePDF, parsePDF } from '../../PDFUtilities'

export function checkIfPublicHearing(news: IMeetingDetail) {
  const hasReportURLs = news.reportUrls.length > 0
  const isPublicHearing = news.meetingType.toLowerCase() === 'public hearing'
  return hasReportURLs && isPublicHearing
}

export async function parsePublicHearing(news: IMeetingDetail): Promise<IFullRezoningDetail | null> {

  try {

    // Parse the referral report PDF
    const firstPDFURL = news.reportUrls[0].url
    const pdfData = await downloadPDF(firstPDFURL)
    const pdf3pages = await generatePDF(pdfData, {
      maxPages: 3
    })
    const parsedPDF = await parsePDF(pdf3pages as Buffer)

    // Get partial rezoning details from GPT
    const GPTTextResponse = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF.text, {
      rezoningId: 'null'
    }))
    let partialRezoningDetailsRaw = JSON.parse(GPTTextResponse.choices[0].message.content!)
    if (!checkGPTJSON(partialRezoningDetailsRaw)) {
      console.warn(chalk.bgYellow('Partial rezoning details GPT JSON is invalid, running again'))
      const newGPTTextReply = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF.text, {
        rezoningId: 'null'
      }))
      partialRezoningDetailsRaw = JSON.parse(newGPTTextReply.choices[0].message.content!)
      if (!checkGPTJSON(partialRezoningDetailsRaw)) {
        const errorMessage = 'Partial rezoning details GPT JSON is invalid 2nd time, skipping'
        console.error(chalk.bgRed(errorMessage))
        throw new Error(errorMessage)
      }
    }
    console.log(chalk.bgGreen('Partial rezoning details GPT JSON is valid'))

    // Cast as partial rezoning details
    const partialRezoningDetails = partialRezoningDetailsRaw as IPartialRezoningDetail

    // Get stats
    const GPTStatsReply = await chatGPTTextQuery(getGPTBaseRezoningStatsQuery(partialRezoningDetailsRaw.description), '4')
    const GPTStats = JSON.parse(GPTStatsReply.choices[0].message.content!)
    if (GPTStats.error) {
      const errorMessage = 'Partial rezoning details GPT JSON is not valid, skipping'
      console.log(chalk.bgRed(errorMessage))
      throw new Error(errorMessage)
    }

    // Return full rezoning details object
    const fullRezoningDetails: IFullRezoningDetail = {
      ...partialRezoningDetails,
      city: news.city,
      metroCity: news.metroCity,
      urls: news.reportUrls.map((urlObject) => {
        return {
          date: news.date,
          title: urlObject.title,
          url: urlObject.url,
          type: 'public hearing'
        }
      }),
      minutesUrls: news.minutesUrl ? [{
        date: news.date,
        url: news.minutesUrl
      }] : [],
      stats: GPTStats,
      status: 'public hearing',
      dates: {
        appliedDate: null,
        publicHearingDate: news.date,
        approvalDate: null,
        denialDate: null,
        withdrawnDate: null
      },
      createDate: moment().format('YYYY-MM-DD'),
      updateDate: moment().format('YYYY-MM-DD')
    }

    return fullRezoningDetails

  } catch (error) {
    console.error(error)
    return null
  }

}
