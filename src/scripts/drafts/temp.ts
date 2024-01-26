import moment from 'moment'
import { IMeetingDetail, RawRepository } from '../../repositories/RawRepository'
import { RezoningsRepository, checkGPTRezoningJSON } from '../../repositories/RezoningsRepository'
import { checkIfApplication } from '../../rezonings/cities/Surrey/Applications'
import { checkIfBylaw } from '../../rezonings/cities/Surrey/Bylaws'
import { checkIfPublicHearing, parsePublicHearing } from '../../rezonings/cities/Surrey/PublicHearings'

(async () => {

  const news = RawRepository.getNews({city: 'Surrey'})

  const validLists: IMeetingDetail[] = []

  for (const n of news) {
    const isRezoningType = checkIfApplication(n) || checkIfPublicHearing(n) || checkIfBylaw(n)
    let isInDateRange = true
    if (moment(n.date).isBefore('2023-01-01')) {
      isInDateRange = false
    }
    if (moment(n.date).isSameOrAfter('2024-01-01')) {
      isInDateRange = false
    }
    if (isRezoningType && isInDateRange) {
      validLists.push(n)
    }
  }

  console.log(`List length: ${validLists.length}`)

})()
