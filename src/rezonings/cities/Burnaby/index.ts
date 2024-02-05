import moment from 'moment'
import chalk from 'chalk'
import { RawRepository } from '../../../repositories/RawRepository'
import { RecordsRepository } from '../../../repositories/RecordsRepositoryV2'
import { checkIfApplication, parseApplication } from './Applications'
import { checkIfPublicHearing, parsePublicHearing } from './PublicHearings'
import { checkIfBylaw, parseBylaw } from './Bylaws'

const repository = new RecordsRepository('draft')

export async function analyze(startDate: string | null, endDate: string | null) {

  const scrapedList = RawRepository.getNews({city: 'Burnaby'})
  
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

    console.log(chalk.bgWhite(`Analyzing ${i + 1}/${validLists.length} - Burnaby`))

    const news = validLists[i]

    if (checkIfApplication(news)) {
      const applicationDetails = await parseApplication(news)
      if (applicationDetails) {
        repository.upsertRecords('rezoning', applicationDetails)
      }
    }

    if (checkIfPublicHearing(news)) {
      const publicHearingDetails = await parsePublicHearing(news)
      if (publicHearingDetails) {
        repository.upsertRecords('rezoning', publicHearingDetails)
      }
    }

    if (checkIfBylaw(news)) {
      const bylawDetail = await parseBylaw(news)
      if (bylawDetail) {
        repository.upsertRecords('rezoning', bylawDetail)
      }
    }

  }

}
