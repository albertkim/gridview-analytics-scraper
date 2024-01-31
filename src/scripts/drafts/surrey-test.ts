import fs from 'fs'
import path from 'path'
import moment from 'moment'
import { RawRepository } from '../../repositories/RawRepository'
import { IFullRezoningDetail } from '../../repositories/RecordsRepository'
import { checkIfApplication, parseApplication } from '../../rezonings/cities/Surrey/Applications'
import { checkIfPublicHearing, parsePublicHearing } from '../../rezonings/cities/Surrey/PublicHearings'
import { checkIfBylaw, parseBylaw } from '../../rezonings/cities/Surrey/Bylaws'

(async () => {

  const startDate = '2023-12-01'
  const endDate = '2023-12-31'

  const news = RawRepository.getNews({city: 'Surrey'}).filter((n) => {
    if (startDate && moment(n.date).isBefore(startDate)) {
      return false
    }
    if (endDate && moment(n.date).isSameOrAfter(endDate)) {
      return false
    }
    return true
  })

  const applications: IFullRezoningDetail[] = []
  const publicHearings: IFullRezoningDetail[] = []
  const bylaws: IFullRezoningDetail[] = []

  for (const n of news) {
    if (checkIfApplication(n)) {
      const rezoning = await parseApplication(n)
      if (rezoning) {
        applications.push(rezoning)
      }
    }
    if (checkIfPublicHearing(n)) {
      const rezoning = await parsePublicHearing(n)
      if (rezoning) {
        publicHearings.push(rezoning)
      }
    }
    if (checkIfBylaw(n)) {
      const rezoning = await parseBylaw(n)
      if (rezoning) {
        bylaws.push(rezoning)
      }
    }
  }

  fs.writeFileSync(path.join(__dirname, 'surrey-applications.json'), JSON.stringify(applications, null, 2))
  fs.writeFileSync(path.join(__dirname, 'surrey-public-hearings.json'), JSON.stringify(publicHearings, null, 2))
  fs.writeFileSync(path.join(__dirname, 'surrey-bylaws.json'), JSON.stringify(bylaws, null, 2))

})()
