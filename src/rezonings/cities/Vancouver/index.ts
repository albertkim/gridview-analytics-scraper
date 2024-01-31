import moment from 'moment'
import chalk from 'chalk'
import { RawRepository } from '../../../repositories/RawRepository'
import { RecordsRepository } from '../../../repositories/RecordsRepository'
import { checkIfApplication, parseApplication } from './Applications'
import { checkIfPublicHearing, parsePublicHearing } from './PublicHearings'
import { checkIfBylaw, parseBylaw } from './Bylaws'

export async function analyze(startDate: string | null, endDate: string | null) {

  const scrapedList = RawRepository.getNews({city: 'Vancouver'})

  // Only keep rezoning-related items
  const validLists = scrapedList.filter((item) => {
    const isRezoningType = checkIfApplication(item) || checkIfPublicHearing(item) || checkIfBylaw(item)
    let isInDateRange = true
    if (startDate && moment(item.date).isBefore(startDate)) {
      isInDateRange = false
    }
    if (endDate && moment(item.date).isSameOrAfter(endDate)) {
      isInDateRange = false
    }
    return isRezoningType && isInDateRange
  })

  for (let i = 0; i < validLists.length; i++) {

    console.log(chalk.bgWhite(`Analyzing ${i + 1}/${validLists.length} - Vancouver`))

    const news = validLists[i]

    if (checkIfApplication(news)) {
      const applicationDetails = await parseApplication(news)
      if (applicationDetails) {
        RecordsRepository.upsertRecords('rezoning', [applicationDetails])
      }
    }

    if (checkIfPublicHearing(news)) {
      const publicHearingDetails = await parsePublicHearing(news)
      if (publicHearingDetails) {
        RecordsRepository.upsertRecords('rezoning', [publicHearingDetails])
      }
    }

    if (checkIfBylaw(news)) {
      const bylawDetails = await parseBylaw(news)
      if (bylawDetails) {
        RecordsRepository.upsertRecords('rezoning', bylawDetails)
      }
    }

  }

}
