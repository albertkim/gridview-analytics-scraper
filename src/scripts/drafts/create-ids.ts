import { generateID } from '../../repositories/GenerateID'
import { RezoningsRepository } from '../../repositories/RezoningsRepository'

(async () => {

  const rezonings = RezoningsRepository.getRezonings()

  for (const rezoning of rezonings) {
    rezoning.id = generateID('rez')
  }

  RezoningsRepository.dangerouslyUpdateAllRezonings(rezonings)

})()
