import { RecordsRepository } from '../../repositories/RecordsRepository'

(async () => {

  RecordsRepository.dangerouslyReplaceRecords('rezoning', 'Surrey', [])

})()
