import moment from 'moment'
import chalk from 'chalk'
import { RawRepository } from '../repositories/RawRepository'
import { IRezoningDetail, RezoningsRepository, checkGPTJSON, mergeEntries } from '../repositories/RezoningsRepository'
import { getGPTBaseRezoningQuery, getGPTBaseRezoningStatsQuery } from './GPTUtilities'
import {
  downloadPDF,
  generatePDF,
  parsePDF,
  chatGPTTextQuery
} from '../utilities'

export async function analyze() {

  const scrapedList = RawRepository.getNews({city: 'Vancouver'})
  const rezoningJSON: IRezoningDetail[] = []

  for (const news of scrapedList) {

    if (news.title.includes('Rezoning:')) {
      if (news.reportUrls.length > 0) {
        const firstPDFURL = news.reportUrls[0].url
        const pdfData = await downloadPDF(firstPDFURL)
        const pdf3pages = await generatePDF(pdfData, {
          maxPages: 3
        })
        const parsedPDF = await parsePDF(pdf3pages as Buffer)
        const GPTTextReply = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF.text))
        let replyData = JSON.parse(GPTTextReply.choices[0].message.content!)
        if (!checkGPTJSON(replyData)) {
          console.warn(chalk.bgYellow('GPT JSON is invalid, running again'))
          const newGPTTextReply = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF.text))
          replyData = JSON.parse(newGPTTextReply.choices[0].message.content!)
          console.log(replyData)
          if (!checkGPTJSON(replyData)) {
            console.error(chalk.bgRed('GPT JSON is invalid 2nd time, skipping'))
            break
          }
        }
        console.log(chalk.bgGreen('GPT JSON is valid'))
        const GPTStatsReply = await chatGPTTextQuery(getGPTBaseRezoningStatsQuery(replyData.description))
        const GPTStats = JSON.parse(GPTStatsReply.choices[0].message.content!)
        if (!replyData.error ) {
          const newData: IRezoningDetail = {
            city: 'Vancouver',
            metroCity: 'Metro Vancouver',
            urls: news.reportUrls,
            minutesUrls: news.minutesUrl ? [news.minutesUrl] : [],
            resolutionId: news.resolutionId,
            ...replyData,
            stats: GPTStats,
            createDate: moment().format('YYYY-MM-DD'),
            updateDate: moment().format('YYYY-MM-DD')
          }

          const matchingItem = rezoningJSON
            .find((item) => item.city === newData.city && item.address === replyData.address)

          if (matchingItem) {
            const matchingItemIndex = rezoningJSON.indexOf(matchingItem)
            rezoningJSON[matchingItemIndex] = mergeEntries(matchingItem, newData)
          } else {
            rezoningJSON.push(newData)
          }
        }
      }
    }

  }

  RezoningsRepository.updateRezonings('Vancouver', rezoningJSON)

}
