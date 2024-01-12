import moment from 'moment'
import { RawRepository } from '../../../repositories/RawRepository'
import { IFullRezoningDetail, RezoningsRepository, mergeEntries } from '../../../repositories/RezoningsRepository'
import { checkIfApplication, parseApplication } from './Applications'
import { checkIfPublicHearing, parsePublicHearing } from './PublicHearings'
import { checkIfBylaw, parseBylaw } from './Bylaws'
import chalk from 'chalk'

export async function analyze(startDate: string | null, endDate: string | null) {

  const scrapedList = RawRepository.getNews({city: 'Vancouver'})
  const rezoningJSON: IFullRezoningDetail[] = RezoningsRepository.getRezonings({city: 'Vancouver'})

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
        const matchingItems = RezoningsRepository.getRezoningsWithSimilarAddresses(applicationDetails)

        if (matchingItems.length > 0) {
          rezoningJSON[matchingItems[0].index] = mergeEntries(matchingItems[0].rezoning, applicationDetails)
        } else {
          rezoningJSON.push(applicationDetails)
        }
      }
    }

    if (checkIfPublicHearing(news)) {
      const publicHearingDetails = await parsePublicHearing(news)
      if (publicHearingDetails) {
        const matchingItems = RezoningsRepository.getRezoningsWithSimilarAddresses(publicHearingDetails)

        if (matchingItems.length > 0) {
          rezoningJSON[matchingItems[0].index] = mergeEntries(matchingItems[0].rezoning, publicHearingDetails)
        } else {
          rezoningJSON.push(publicHearingDetails)
        }
      }
    }

    if (checkIfBylaw(news)) {
      const bylawDetails = await parseBylaw(news)
      if (bylawDetails) {
        for (const bylawDetail of bylawDetails) {
          const matchingItems = RezoningsRepository.getRezoningsWithSimilarAddresses(bylawDetail)

          if (matchingItems.length > 0) {
            rezoningJSON[matchingItems[0].index] = mergeEntries(matchingItems[0].rezoning, bylawDetail)
            console.log(chalk.bgGreen(`Bylaw merged for ${bylawDetail.address}`))
          } else {
            rezoningJSON.push(bylawDetail)
            console.log(chalk.bgGreen(`Bylaw added for ${bylawDetail.address}`))
          }
        }
      }
    }

  }

  RezoningsRepository.updateRezoningsForCity('Vancouver', rezoningJSON)

}
