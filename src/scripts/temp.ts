import moment from 'moment'
import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository } from '../repositories/RezoningsRepository'

(async () => {

  const rezonings = RezoningsRepository.getRezonings({city: 'Burnaby'})

  const filteredRezonings = rezonings.filter((item) => {
    return item.urls === undefined
  })

  filteredRezonings.forEach((item) => {
    console.log(JSON.stringify(item, null, 2))
  })

  console.log(`No date url rezonings: ${filteredRezonings.length}`)

})()
