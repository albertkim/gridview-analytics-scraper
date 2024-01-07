import moment from 'moment'
import chalk from 'chalk'
import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository, IRezoningDetail, mergeEntries, checkGPTJSON } from '../repositories/RezoningsRepository'
import { getGPTBaseRezoningQuery, getGPTBaseRezoningStatsQuery } from './GPTUtilities'
import {
  downloadPDF,
  generatePDF,
  parsePDF,
  chatGPTTextQuery
} from '../utilities'

export async function analyze() {

  const scrapedList = RawRepository.getNews({city: 'Richmond'})
  const rezoningJSON: IRezoningDetail[] = RezoningsRepository.getRezonings({city: 'Richmond'})

  for (const news of scrapedList) {

    if (news.title.toLowerCase().includes('rezoning') && news.title.toLowerCase().includes('application')) {
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
        if (!replyData.error) {
          const newData = {
            city: 'Richmond',
            urls: news.reportUrls.map((urlObject) => {
              return {
                date: news.date,
                title: urlObject.title,
                url: urlObject.url
              }
            }),
            minutesUrls: news.minutesUrl ? [{
              date: news.date,
              url: news.minutesUrl
            }] : [],
            resolutionId: news.resolutionId,
            ...replyData,
            stats: GPTStats,
            createDate: moment().format('YYYY-MM-DD'),
            updateDate: moment().format('YYYY-MM-DD')
          }

          // Search if exists in the master JSON file. If exists, replace. If not, add
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

  RezoningsRepository.updateRezonings('Richmond', rezoningJSON)

}
