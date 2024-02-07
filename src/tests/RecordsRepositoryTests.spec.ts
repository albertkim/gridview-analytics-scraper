import { FullRecord, IFullRecordParams } from '../repositories/FullRecord'
import { RecordsRepository } from '../repositories/RecordsRepositoryV2'

const repository = new RecordsRepository('test')

beforeEach(() => {
  repository.dangerouslyReplaceAllRecords('all', [])
  expect(repository.getRecords('all').length).toBe(0)
})

afterEach(() => {
  repository.dangerouslyReplaceAllRecords('all', [])
  expect(repository.getRecords('all').length).toBe(0)
})

test('Check that FullRecord fields are correctly added to database with upsert', () => {

  const object: IFullRecordParams = {
    city: 'Richmond',
    metroCity: 'Metro Vancouver',
    type: 'rezoning',
    address: '123 Fake Street',
    status: 'applied',
    applicationId: 'applicationId',
    applicant: 'applicant',
    behalf: 'behalf',
    description: 'description',
    rawSummaries: [],
    buildingType: 'multi-family residential',
    dates: {
      appliedDate: '2020-01-01',
      publicHearingDate: null,
      approvalDate: null,
      denialDate: null,
      withdrawnDate: null
    },
    stats: {
      buildings: 1,
      stratas: 2,
      rentals: 3,
      hotels: 4,
      fsr: 5,
      storeys: 6
    },
    zoning: {
      previousZoningCode: 'previousZoningCode',
      previousZoningDescription: 'previousZoningDescription',
      newZoningCode: 'newZoningCode',
      newZoningDescription: 'newZoningDescription'
    },
    reportUrls: [
      {
        url: 'url',
        title: 'title',
        date: '2020-01-01',
        status: 'applied'
      }
    ],
    minutesUrls: [
      {
        url: 'url',
        date: '2020-01-01',
        status: 'applied'
      }
    ],
    location: {
      latitude: 1,
      longitude: 2
    }
  }

  const entry = new FullRecord(object)
  repository.upsertRecords('rezoning', ([entry]))

  const allRecords = repository.getRecords('all')
  expect(allRecords.length).toBe(1)

  // Should be a perfect match except for id, createDate, and updateDate
  const matchingRecord = allRecords[0]
  const matchingRecordWithoutIdAndDates = {
    ...matchingRecord,
    id: undefined,
    createDate: undefined,
    updateDate: undefined
  }
  expect(matchingRecordWithoutIdAndDates).toEqual(object)

})

test('Check that merging 2 records with the same application uses values from the new description entry', () => {

  const entry1 = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address',
    rawSummaries: [],
    status: 'applied',
    applicationId: 'applicationId',
    description: 'descroption 1',
  })

  const entry2 = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address',
    rawSummaries: [],
    status: 'applied',
    applicationId: 'applicationId',
    description: 'descroption 2'
  })

  repository.upsertRecords('rezoning', [entry1])
  repository.upsertRecords('rezoning', [entry2])

  const allRecords = repository.getRecords('all')
  expect(allRecords.length).toBe(1)
  expect(allRecords[0].description).toBe(entry2.description)

})

test('Check that upsert with same application IDs works correctly', () => {

  const applicationId = 'applicationId'

  const entry1 = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address 1',
    rawSummaries: [],
    status: 'applied',
    applicationId: applicationId
  })

  expect(entry1.applicationId).toBe(applicationId)

  const entry2 = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address 2',
    rawSummaries: [],
    status: 'applied',
    applicationId: applicationId
  })

  expect(entry2.applicationId).toBe(applicationId)

  // Even though the addresses are different, it entry2 should be merged into entry1 because applicationID checks should take precedent
  repository.upsertRecords('rezoning', [entry1])
  repository.upsertRecords('rezoning', [entry2])

  const allRecords = repository.getRecords('all')
  expect(allRecords.length).toBe(1)
  expect(allRecords[0].id).toBe(entry1.id)
  expect(allRecords[0].applicationId).toBe(applicationId)

})

test('Check that upsert with similar address works correctly', () => {

  const entry1 = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address 1',
    rawSummaries: [],
    status: 'applied'
  })

  repository.upsertRecords('rezoning', [entry1])
  expect(repository.getRecords('all').length).toBe(1)

  const entry2 = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address 2',
    rawSummaries: [],
    status: 'applied'
  })

  repository.upsertRecords('rezoning', [entry2])
  expect(repository.getRecords('all').length).toBe(2)

  // This entry has the same address as entry 1, so it should be merged
  const description = 'Merged description'
  const entry3 = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address 1',
    rawSummaries: [],
    status: 'applied',
    description: description
  })

  repository.upsertRecords('rezoning', [entry3])
  const allRecords = repository.getRecords('all')
  expect(allRecords.length).toBe(2)
  const matchingEntry1Record = allRecords.find((record) => record.id === entry1.id)
  expect(!!matchingEntry1Record)
  expect(matchingEntry1Record?.description).toBe(description)

})

test('Check that dangerouslyReplaceRecordsForCity works correctly', () => {

  const nonCityRezoning = new FullRecord({
    type: 'rezoning',
    city: 'not-city',
    metroCity: 'metroCity',
    address: 'address 1',
    rawSummaries: [],
    status: 'applied'
  })
  
  const nonCityDevelopmentPermit = new FullRecord({
    type: 'development permit',
    city: 'not-city',
    metroCity: 'metroCity',
    address: 'address 2',
    rawSummaries: [],
    status: 'applied'
  })

  const cityRezoning = new FullRecord({
    type: 'rezoning',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address 3',
    rawSummaries: [],
    status: 'applied'
  })

  const cityDevelopmentPermit = new FullRecord({
    type: 'development permit',
    city: 'city',
    metroCity: 'metroCity',
    address: 'address 4',
    rawSummaries: [],
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
  expect(allRecordsAfterReplacementIDs.includes(cityRezoning.id)).toBe(false) // This one should be removed
  expect(allRecordsAfterReplacementIDs.includes(cityDevelopmentPermit.id)).toBe(true)

})
