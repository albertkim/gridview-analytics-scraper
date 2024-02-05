import { RecordsRepository } from '../repositories/RecordsRepositoryV2'

(async () => {

  const repository = new RecordsRepository('final')

  repository.dangerouslyReplaceRecordsForCity('development permit', 'Richmond', [])

})()