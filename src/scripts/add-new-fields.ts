import { RecordsRepository } from '../repositories/RecordsRepositoryV2'

(async () => {

  const repository = new RecordsRepository('final')

  const allRecords = repository.getRecords('all')
  
  repository.dangerouslyReplaceAllRecords('all', allRecords)

})()
