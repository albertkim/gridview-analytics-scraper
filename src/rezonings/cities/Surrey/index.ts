import chalk from 'chalk'
import moment from 'moment'
import { IMeetingDetail, RawRepository } from '../../../repositories/RawRepository'
import { checkIfApplication, parseApplication } from './Applications'
import { checkIfPublicHearing, parsePublicHearing } from './PublicHearings'
import { checkIfBylaw, parseBylaw } from './Bylaws'

export async function analyze(startDate: string | null, endDate: string | null) {

  const news = RawRepository.getNews({city: 'Surrey'})

  const validLists: IMeetingDetail[] = []

  for (const n of news) {
    const isRezoningType = checkIfApplication(n) || checkIfPublicHearing(n) || checkIfBylaw(n)
    let isInDateRange = true
    if (startDate && moment(n.date).isBefore(startDate)) {
      isInDateRange = false
    }
    if (endDate && moment(n.date).isSameOrAfter(endDate)) {
      isInDateRange = false
    }
    if (isRezoningType && isInDateRange) {
      validLists.push(n)
    }
  }

  for (let i = 0; i < validLists.length; i++) {

    console.log(chalk.bgWhite(`Analyzing ${i + 1}/${validLists.length} - Surrey`))

    const news = validLists[i]

    if (checkIfApplication(news)) {
      const applicationDetails = await parseApplication(news)
      if (applicationDetails) {
        console.log(applicationDetails)
        // RezoningsRepository.upsertRezonings([applicationDetails])
      }
    }

    if (checkIfPublicHearing(news)) {
      const publicHearingDetails = await parsePublicHearing(news)
      if (publicHearingDetails) {
        console.log(publicHearingDetails)
        // RezoningsRepository.upsertRezonings([applicationDetails])
      }
    }

    if (checkIfBylaw(news)) {
      const bylawDetails = await parseBylaw(news)
      if (bylawDetails) {
        console.log(bylawDetails)
        // RezoningsRepository.upsertRezonings([applicationDetails])
      }
    }

  }

}
