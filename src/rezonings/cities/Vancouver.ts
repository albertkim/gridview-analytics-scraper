import moment from 'moment'
import chalk from 'chalk'
import { RawRepository } from '../../repositories/RawRepository'
import { IRezoningDetail, ZoningType, RezoningsRepository, checkGPTJSON, mergeEntries } from '../../repositories/RezoningsRepository'
import { getGPTBaseRezoningQuery, getGPTBaseRezoningStatsQuery } from '../GPTUtilities'
import {
  downloadPDF,
  generatePDF,
  generatePDFTextArray,
  parsePDF,
  chatGPTTextQuery
} from '../PDFUtilities'

interface IBylawData {
  address: string
  status: 'approved' | 'denied' | 'pending'
  date: string
  type: ZoningType
  zoning: {
    previousZoningCode: string | null
    previousZoningDescription: string | null
    newZoningCode: string | null
    newZoningDescription: string | null
  }
}

export async function analyze(startDate: string | null, endDate: string | null) {

  const scrapedList = RawRepository.getNews({city: 'Vancouver'})
  const rezoningJSON: IRezoningDetail[] = RezoningsRepository.getRezonings({city: 'Vancouver'})

  for (const news of scrapedList) {

    if (startDate && moment(news.date).isBefore(startDate)) {
      continue
    }

    if (endDate && moment(news.date).isAfter(endDate)) {
      continue
    }

    if (news.title.includes('Rezoning:')) {
      if (news.reportUrls.length > 0) {

        try {

          const firstPDFURL = news.reportUrls[0].url
          const pdfData = await downloadPDF(firstPDFURL)
          const pdf3pages = await generatePDF(pdfData, {
            maxPages: 3
          })
          const parsedPDF = await parsePDF(pdf3pages as Buffer)
          const GPTTextReply = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF.text, {
            rezoningId: 'null'
          }))
          let replyData = JSON.parse(GPTTextReply.choices[0].message.content!)
          if (!checkGPTJSON(replyData)) {
            console.warn(chalk.bgYellow('GPT JSON is invalid, running again'))
            const newGPTTextReply = await chatGPTTextQuery(getGPTBaseRezoningQuery(parsedPDF.text, {
              rezoningId: 'null'
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
          if (!replyData.error ) {
            const newData: IRezoningDetail = {
              city: 'Vancouver',
              metroCity: 'Metro Vancouver',
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

    if (news.title === ('By-laws')) {
      const bylawPDFUrls = news.reportUrls.map((urlObject) => urlObject.url)

      for (const url of bylawPDFUrls) {

        try {

          const pdfData = await downloadPDF(url)
          const pdfTextOnlyData = await generatePDFTextArray(pdfData, {
            minCharacterCount: 10,
            expectedWords: ['Explanation', 'rezon']
          })

          for (const text of pdfTextOnlyData) {
            const gptTextReply = await chatGPTTextQuery(`
              Given the following raw text from a PDF, identify the sections that relate to approving a rezoning, ignore the rest, and identify the following in json format:
              {
                address: address in question - if multiple addresses in the same section comma separate
                status: one of approved, denied, or pending
                date: date in YYYY-MM-DD format
                type: one of single-family residential, townhouse, mixed use, multi-family residential, industrial, commercial, or other
                zoning: {
                  previousZoningCode: city zoning code before rezoning or null if unclear
                  previousZoningDescription: best description of previous zoning code (ex. low density residential)
                  newZoningCode: city zoning code after rezoning or null if unclear
                  newZoningDescription: best description of new zoning code (ex. high density residential)
                }
              }
              Otherwise return an error. Here is the data: ${text}
            `)
            const replyData: IBylawData = JSON.parse(gptTextReply.choices[0].message.content!)

            if (!(replyData as any).error) {

              const matchingItem = rezoningJSON
                .find((item) => item.city === 'Vancouver' && item.address === replyData.address)

              if (matchingItem) {
                const matchingItemIndex = rezoningJSON.indexOf(matchingItem)
                rezoningJSON[matchingItemIndex].dates.approvalDate = replyData.status === 'approved' ? news.date : null
                rezoningJSON[matchingItemIndex].dates.denialDate = replyData.status === 'denied' ? news.date : null
                rezoningJSON[matchingItemIndex].updateDate = moment().format('YYYY-MM-DD')
                if (!rezoningJSON[matchingItemIndex].urls.find((urlObject) => urlObject.url === url)) {
                  rezoningJSON[matchingItemIndex].urls.push({
                    title: 'By-laws',
                    url: url,
                    date: news.date
                  })
                }
              } else {
                // We don't have the rezoning application yet in the database, or it is not from a private application
                rezoningJSON.push({
                  city: 'Vancouver',
                  metroCity: 'Metro Vancouver',
                  rezoningId: null,
                  address: replyData.address,
                  applicant: null,
                  behalf: null,
                  description: '',
                  type: replyData.type,
                  stats: {
                    buildings: null,
                    stratas: null,
                    rentals: null,
                    hotels: null,
                    fsr: null,
                    height: null,
                  },
                  zoning: replyData.zoning,
                  status: replyData.status,
                  dates: {
                    appliedDate: null,
                    publicHearingDate:null,
                    approvalDate: replyData.status === 'approved' ? news.date : null,
                    denialDate: replyData.status === 'denied' ? news.date : null,
                    withdrawnDate: null
                  },
                  urls: [{
                    title: 'By-laws',
                    url: url,
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

        } catch (error) {
          console.error(error)
          continue
        }

      }
    }
  }

  RezoningsRepository.updateRezoningsForCity('Vancouver', rezoningJSON)

}
