import { RecordsRepository } from '../../repositories/RecordsRepository'

(async () => {
  const records = RecordsRepository.getRecords('all')
  RecordsRepository.dangerouslyUpdateAllRecords('all', records)
})
