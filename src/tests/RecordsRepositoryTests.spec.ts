import { FullRecord } from '../repositories/FullRecord'
import { RecordsRepository } from '../repositories/RecordsRepositoryV2'

test('Check that dangerouslyReplaceRecordsForCity works correctly', () => {

  const repository = new RecordsRepository('test')
  repository.dangerouslyReplaceAllRecords('all', [])

  expect(repository.getRecords('all').length).toBe(0)

  const nonCityRezoning = new FullRecord({
    type: 'rezoning',
    city: 'not-city',
    metroCity: 'metroCity',
    address: '1234 Main St',
    status: 'applied'
  })
  
  const nonCityDevelopmentPermit = new FullRecord({
    type: 'development permit',
    city: 'not-city',
    metroCity: 'metroCity',
    address: '1234 Main St',
    status: 'applied'
  })

  const cityRezoning = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: '1234 Main St',
    status: 'applied'
  })

  const cityDevelopmentPermit = new FullRecord({
    type: 'development permit',
    city: 'city',
    metroCity: 'metroCity',
    address: '1234 Main St',
    status: 'applied'
  })

  repository.createRecord(nonCityRezoning)
  repository.createRecord(nonCityDevelopmentPermit)
  repository.createRecord(cityRezoning)
  repository.createRecord(cityDevelopmentPermit)

  const allRecords = repository.getRecords('all')
  expect(allRecords.length).toBe(4)

  // Remove all items from city and type rezoning
  repository.dangerouslyReplaceRecordsForCity('rezoning', 'city', [])

  const allRecordsAfterReplacement = repository.getRecords('all')
  expect(allRecordsAfterReplacement.length).toBe(3)

  const allRecordsAfterReplacementIDs = allRecordsAfterReplacement.map((record) => record.id)
  expect(allRecordsAfterReplacementIDs.includes(nonCityRezoning.id)).toBe(true)
  expect(allRecordsAfterReplacementIDs.includes(nonCityDevelopmentPermit.id)).toBe(true)
  expect(allRecordsAfterReplacementIDs.includes(cityRezoning.id)).toBe(false) // Only this one should be removed
  expect(allRecordsAfterReplacementIDs.includes(cityDevelopmentPermit.id)).toBe(true)

})
