import { RecordsRepository } from '../repositories/RecordsRepositoryV2'

(async () => {

  const repository = new RecordsRepository('draft')

  repository.dangerouslyReplaceRecordsForCity('rezoning', 'Burnaby', [])

})()
