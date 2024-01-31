import { RecordsRepository } from '../../repositories/RecordsRepository'

// 2024-01-31
// Objective: Refactor rezonings schema to be more generalized ("records") and support development permit data
(async () => {

  const records = RecordsRepository.getRecords('all')

  records.forEach((record: any) => {
    record.buildingType = record.type
    record.type = 'rezoning'
    record.applicationId = record.rezoningId
    delete record.rezoningId
    record.reportUrls = record.urls
    delete record.urls
    for (const urlObject of record.reportUrls) {
      urlObject.status = urlObject.type
      delete urlObject.type
    }
    for (const urlObject of record.minutesUrls) {
      urlObject.status = urlObject.type
      delete urlObject.type
    }
  })

  RecordsRepository.dangerouslyUpdateAllRecords('all', records)

})()
