import moment from 'moment'
import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository } from '../repositories/RezoningsRepository'

(async () => {

  const rezonings = RezoningsRepository.getRezonings({city: 'Burnaby'})

  const filteredRezonings = rezonings.filter((item) => {
    return item.address === null
  })

  filteredRezonings.forEach((item) => {
    console.log(JSON.stringify(item, null, 2))
  })

  console.log(`Null rezonings: ${filteredRezonings.length}`)

})()
