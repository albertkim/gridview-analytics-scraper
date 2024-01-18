import moment from 'moment'
import chalk from 'chalk'
import { RawRepository } from '../../../repositories/RawRepository'
import { RezoningsRepository } from '../../../repositories/RezoningsRepository'
import { checkIfApplication, parseApplication } from './Applications'
import { checkIfPublicHearing, parsePublicHearing } from './PublicHearings'
import { checkIfBylaw, parseBylaw } from './Bylaws'

export async function analyze(startDate: string | null, endDate: string | null) {

  const scrapedList = RawRepository.getNews({city: 'Vancouver'})
  const validLists = scrapedList.filter((item) => {
    return checkIfApplication(item) || checkIfPublicHearing(item) || checkIfBylaw(item)
  })

  for (let i = 0; i < validLists.length; i++) {

    console.log(chalk.bgWhite(`Analyzing ${i + 1}/${validLists.length} - Vancouver`))

    const news = validLists[i]

    if (startDate && moment(news.date).isBefore(startDate)) {
      continue
    }

    if (endDate && moment(news.date).isAfter(endDate)) {
      continue
    }

    if (checkIfApplication(news)) {
      const applicationDetails = await parseApplication(news)
      if (applicationDetails) {
        RezoningsRepository.upsertRezonings([applicationDetails])
      }
    }

    if (checkIfPublicHearing(news)) {
      const publicHearingDetails = await parsePublicHearing(news)
      if (publicHearingDetails) {
        RezoningsRepository.upsertRezonings([publicHearingDetails])
      }
    }

    if (checkIfBylaw(news)) {
      const bylawDetails = await parseBylaw(news)
      if (bylawDetails) {
        RezoningsRepository.upsertRezonings(bylawDetails)
      }
    }

  }

}
