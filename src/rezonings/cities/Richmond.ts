import moment from 'moment'
import chalk from 'chalk'
import { RawRepository } from '../../repositories/RawRepository'
import { RezoningsRepository, IRezoningDetail, mergeEntries, checkGPTJSON } from '../../repositories/RezoningsRepository'
import { getGPTBaseRezoningQuery, getGPTBaseRezoningStatsQuery } from '../GPTUtilities'
import {
  downloadPDF,
  generatePDF,
  parsePDF
} from '../PDFUtilities'
import { chatGPTTextQuery } from '../GPTUtilities'

const baseRezoningIdQuery = 'ID in the format of "RZ 12-123456", usually in the brackets - correct the format if necessary - null if not found'

export async function analyze(startDate: string | null, endDate: string | null) {

  const scrapedList = RawRepository.getNews({city: 'Richmond'})
  const rezoningJSON: IRezoningDetail[] = RezoningsRepository.getRezonings({city: 'Richmond'})

  for (const news of scrapedList) {

    if (startDate && moment(news.date).isBefore(startDate)) {
      continue
    }

    if (endDate && moment(news.date).isAfter(endDate)) {
      continue
    }

    if (news.title.toLowerCase().includes('rezoning') && news.title.toLowerCase().includes('application')) {
      if (news.reportUrls.length > 0) {

        try {

          const firstPDFURL = news.reportUrls[0].url
          const pdfData = await downloadPDF(firstPDFURL)
          const pdf3pages = await generatePDF(pdfData, {
            maxPages: 3
          })
          const parsedPDF = await parsePDF(pdf3pages as Buffer)
          const GPTTextReply = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF.text, {
            rezoningId: baseRezoningIdQuery
          }))
          let replyData = JSON.parse(GPTTextReply.choices[0].message.content!)
          if (!checkGPTJSON(replyData)) {
            console.warn(chalk.bgYellow('GPT JSON is invalid, running again'))
            const newGPTTextReply = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF.text, {
              rezoningId: baseRezoningIdQuery
            }))
            replyData = JSON.parse(newGPTTextReply.choices[0].message.content!)
            console.log(replyData)
            if (!checkGPTJSON(replyData)) {
              console.error(chalk.bgRed('GPT JSON is invalid 2nd time, skipping'))
              continue
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
              rezoningId: replyData.rezoningId,
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

        } catch (error) {
          console.error(error)
          continue
        }
        
      }
    }

    if (news.title.toLowerCase().includes('bylaw for adoption')) {
      // All required information is in the description text
      const GPTTextReply = await chatGPTTextQuery(`
        Given the following description of city bylaw adoptions, find only the ones that relate to Richmond Zoning Bylaws and return the following in JSON format:
        {
          items: [
            {
              address: address - usually in the brackets,
              rezoningId: in the format of RZ 12-123456 - usually in the brackets,
              status: one of approved or denied
            }
          ]
        }
        Description: ${news.contents}
      `)
      const replyData = JSON.parse(GPTTextReply.choices[0].message.content!)

      // Validate the GPT JSON
      if (Array.isArray(replyData.items)) {
        let valid = true
        replyData.items.forEach((item: any) => {
          if (!('address' in item) || !('rezoningId' in item) || !('status' in item)) {
            valid = false
          }
        })
        if (!valid) {
          console.error(chalk.bgRed('GPT JSON is invalid, skipping'))
          continue
        }
      }

      if (!replyData.error) {
        for (const item of replyData.items) {

          const matchingItem = rezoningJSON
            .find((rezoningItem) => rezoningItem.city === 'Richmond' && rezoningItem.rezoningId === item.rezoningId)

          if (matchingItem) {
            const matchingItemIndex = rezoningJSON.indexOf(matchingItem)
            rezoningJSON[matchingItemIndex].status = item.status
            rezoningJSON[matchingItemIndex].dates.approvalDate = item.status === 'approved' ? news.date : null
            rezoningJSON[matchingItemIndex].dates.denialDate = item.status === 'denied' ? news.date : null
            rezoningJSON[matchingItemIndex].updateDate = moment().format('YYYY-MM-DD')
            if (!rezoningJSON[matchingItemIndex].urls.find((urlObject) => urlObject.url === news.url)) {
              rezoningJSON[matchingItemIndex].urls.push({
                title: 'By-laws',
                url: news.url,
                date: news.date
              })
            }
          } else {
            rezoningJSON.push({
              city: 'Richmond',
              metroCity: 'Metro Vancouver',
              rezoningId: item.rezoningId || '',
              address: item.address || '',
              applicant: null,
              behalf: null,
              description: '',
              type: null,
              stats: {
                buildings: null,
                stratas: null,
                rentals: null,
                hotels: null,
                fsr: null,
                height: null,
              },
              zoning: {
                previousZoningCode: null,
                previousZoningDescription: null,
                newZoningCode: null,
                newZoningDescription: null
              },
              status: item.status,
              dates: {
                appliedDate: null,
                publicHearingDate:null,
                approvalDate: item.status === 'approved' ? news.date : null,
                denialDate: item.status === 'denied' ? news.date : null,
                withdrawnDate: null
              },
              urls: [{
                title: 'By-laws',
                url: news.url,
                date: news.date
              }],
              minutesUrls: news.minutesUrl ? [{
                url: news.minutesUrl,
                date: news.date
              }] : [],
              createDate: moment().format('YYYY-MM-DD'),
              updateDate: moment().format('YYYY-MM-DD')
            })
          }

        }
      }
    }

  }

  RezoningsRepository.updateRezoningsForCity('Richmond', rezoningJSON)

}
