import { RecordsRepository } from '../repositories/RecordsRepositoryV2'

(async () => {

  // TODO: Also fill in coordinates as part of the check-in process

  const repository = new RecordsRepository('final')
  repository.finalCheckIn()
  process.exit()

})()
