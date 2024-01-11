import moment from 'moment'
import { RawRepository } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, RezoningsRepository, mergeEntries } from '../../../repositories/RezoningsRepository'
import { checkIfApplication, parseApplication } from './Applications'
import { checkIfPublicHearing, parsePublicHearing } from './PublicHearings'
import { checkIfBylaw, parseBylaw } from './Bylaws'
import chalk from 'chalk'

export async function analyze(startDate: string | null, endDate: string | null) {

  const scrapedList = RawRepository.getNews({city: 'Richmond'})
  const rezoningJSON: IFullRezoningDetail[] = RezoningsRepository.getRezonings({city: 'Richmond'})

  for (const news of scrapedList) {

    if (startDate && moment(news.date).isBefore(startDate)) {
      continue
    }

    if (endDate && moment(news.date).isAfter(endDate)) {
      continue
    }

    if (checkIfApplication(news)) {
      const applicationDetails = await parseApplication(news)
      if (applicationDetails) {
        const matchingItem = rezoningJSON
          .find((item) => item.city === applicationDetails.city && item.address === applicationDetails.address)

        if (matchingItem) {
          const matchingItemIndex = rezoningJSON.indexOf(matchingItem)
          rezoningJSON[matchingItemIndex] = mergeEntries(matchingItem, applicationDetails)
        } else {
          rezoningJSON.push(applicationDetails)
        }
      }
    }

    if (checkIfPublicHearing(news)) {
      const publicHearingDetails = await parsePublicHearing(news)
      if (publicHearingDetails) {
        const matchingItem = rezoningJSON
          .find((item) => item.city === publicHearingDetails.city && item.address === publicHearingDetails.address)

        if (matchingItem) {
          const matchingItemIndex = rezoningJSON.indexOf(matchingItem)
          rezoningJSON[matchingItemIndex] = mergeEntries(matchingItem, publicHearingDetails)
        } else {
          rezoningJSON.push(publicHearingDetails)
        }
      }
    }

    if (checkIfBylaw(news)) {
      const bylawDetailsArray = await parseBylaw(news)
      bylawDetailsArray.forEach((bylawDetails) => {
        const matchingItem = rezoningJSON
          .find((item) => item.city === bylawDetails.city && item.address === bylawDetails.address)

        if (matchingItem) {
          const matchingItemIndex = rezoningJSON.indexOf(matchingItem)
          rezoningJSON[matchingItemIndex] = mergeEntries(matchingItem, bylawDetails)
          console.log(chalk.bgGreen(`Merged ${bylawDetails.address}`))
        } else {
          rezoningJSON.push(bylawDetails)
          console.log(chalk.bgGreen(`Added ${bylawDetails.address}`))
        }
      })
    }

  }

  RezoningsRepository.updateRezoningsForCity('Richmond', rezoningJSON)

}
