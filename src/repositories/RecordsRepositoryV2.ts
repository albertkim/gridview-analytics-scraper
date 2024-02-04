import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import moment from 'moment'
import similarity from 'similarity'
import { IFullRezoningDetail, mergeEntries } from './RecordsRepository'
import { FullRecord } from './FullRecord'

export class RecordsRepository {

  private database: string

  // Object where key is databaseMode, value is string
  private databaseMapping: Record<'final' | 'draft' | 'draft2' | 'test', string> = {
    final: path.join(__dirname, '../database/rezonings.json'),
    draft: path.join(__dirname, '../database/rezonings-draft.json'),
    draft2: path.join(__dirname, '../database/rezonings-draft-2.json'),
    test: path.join(__dirname, '../database/rezonings-test.json')
  }

  constructor(databaseMode: 'final' | 'draft' | 'draft2' | 'test') {
    this.database = this.databaseMapping[databaseMode]
  }

  getRecords(type: 'all' | 'rezoning' | 'development permit', filter?: {city?: string}) {
    let records = JSON.parse(fs.readFileSync(this.database, 'utf8')) as IFullRezoningDetail[]
    if (type !== 'all') {
      records = records.filter((item) => item.type === type)
    }
    if (filter?.city) {
      records = records.filter((item) => item.city === filter.city)
    }
    return records.map((record) => new FullRecord(record))
  }

  // Get all records with similar addresses to the provided record (but not including the record)
  getRecordsWithSimilarAddresses(type: 'rezoning' | 'development permit', record: FullRecord): {index: number, rezoning: FullRecord, similarity: number}[] {

    const minimumSimilarity = 0.7

    if (!record.address) return []

    const numbersInAddress = (record.address || '').match(/\d+/g)

    if (!numbersInAddress) return []

    const allRecords = this.getRecords(type)

    const recordsWithMatchingNumbers: {
      index: number
      rezoning: FullRecord
      similarity: number
    }[] = []

    for (let i = 0; i < allRecords.length; i++) {
      const otherRecord = allRecords[i]
      if (otherRecord.id === record.id) continue
      if (otherRecord.city !== record.city) continue
      if (!otherRecord.address) continue
      const otherNumbersInAddress = (otherRecord.address || '').match(/\d+/g)
      if (!otherNumbersInAddress) continue
      const numbersMatch = otherNumbersInAddress.every(otherNumber => numbersInAddress.includes(otherNumber))
      if (numbersMatch) {
        const similarityScore = similarity(record.address.toLowerCase(), otherRecord.address.toLowerCase())
        if (similarityScore > minimumSimilarity) {
          recordsWithMatchingNumbers.push({
            index: i,
            rezoning: otherRecord,
            similarity: similarityScore
          })
        }
      }
    }

    return recordsWithMatchingNumbers

  }

  dangerouslyReplaceRecordsForCity(type: 'rezoning' | 'development permit', city: string, newRecords: FullRecord[]) {
    const previousRecords = this.getRecords('all')
    const recordsToKeep = previousRecords.filter((item) => item.type !== type || item.city !== city)
    const recordsToWrite = [...recordsToKeep, ...newRecords]
    fs.writeFileSync(
      this.database,
      JSON.stringify(recordsToWrite, null, 2),
      'utf8'
    )
  }

  dangerouslyReplaceAllRecords(type: 'all' | 'rezoning' | 'development permit', newRecords: FullRecord[]) {
    const allRecords = this.getRecords('all')
    const recordsToKeep = type === 'all' ? [] : allRecords.filter((item) => item.type !== type) // will be empty if 'all' type is provided, meaning everything should be replaced
    const recordsToWrite = reorderItems([...recordsToKeep, ...newRecords])
    fs.writeFileSync(
      this.database,
      JSON.stringify(recordsToWrite, null, 2),
      'utf8'
    )
  }

  createRecord(record: FullRecord) {
    const previousEntries = this.getRecords('all')
    const orderedEntries = reorderItems([...previousEntries, record])
    fs.writeFileSync(
      this.database,
      JSON.stringify(orderedEntries, null, 2),
      'utf8'
    )
  }

  // Update a record completely, does not merge with previous entry
  // Most use cases will require the upsertRecords() function, defined below
  updateRecord(id: string, record: FullRecord) {
    record.id = id
    const previousEntries = this.getRecords('all')
    const matchingRezoningIndex = previousEntries.findIndex((item) => item.id === id)
    if (matchingRezoningIndex === -1) throw new Error(`Could not find rezoning with id ${id}`)
    previousEntries[matchingRezoningIndex] = record
    fs.writeFileSync(
      this.database,
      JSON.stringify(previousEntries, null, 2),
      'utf8'
    )
  }

  // Add records to the database - merge if there is a record of the same type and the same address
  upsertRecords(type: 'rezoning' | 'development permit', records: FullRecord[]) {

    for (const record of records) {

      // Get records for each iteration so that it can properly merge with the provided new records, at the cost of performance
      const previousRecords = this.getRecords(type)

      // Check for any entries with the same ID (not application ID)
      const recordWithMatchingID = previousRecords.find((item) => item.id === record.id)
      if (recordWithMatchingID) {
        recordWithMatchingID.merge(record)
        console.log(chalk.green(`Merging record with ID ${recordWithMatchingID.id}`))
        this.updateRecord(recordWithMatchingID.id, recordWithMatchingID)
        continue
      }

      // Check for any entries with the same application ID - take precedent over matching addresses if exists
      const recordWithMatchingApplicationID = record.applicationId ?
        previousRecords.find((item) => item.applicationId === record.applicationId)
        : null
      if (recordWithMatchingApplicationID) {
        recordWithMatchingApplicationID.merge(record)
        console.log(chalk.green(`Merging record with ID ${recordWithMatchingApplicationID.id}`))
        this.updateRecord(recordWithMatchingApplicationID.id, recordWithMatchingApplicationID)
        continue
      } else if (record.applicationId) {
        // If there is any application ID at all, then add as a new entry recardless of if a similar address exists
        // There can be multiple rezonings (unlikely) or development permits (likely) for the same address
        console.log(chalk.green(`Adding new record with ID ${record.id}`))
        this.createRecord(record)
        continue
      }

      // Check for any entries with the same/similar addresses
      const similarAddresses = this.getRecordsWithSimilarAddresses(type, record)
      if (similarAddresses.length > 0) {
        const similarRecord = similarAddresses[0].rezoning
        similarRecord.merge(record)
        console.log(chalk.green(`Merging record with ID ${similarRecord.id}`))
        this.updateRecord(similarRecord.id, similarRecord)
        continue
      }

      // If nothing similar, just add the entry to the database
      console.log(chalk.green(`Adding new record with ID ${record.id}`))
      this.createRecord(record)

    }

  }

  reorderRecords() {
    const allRecords = this.getRecords('all')
    const reorderedRecords = reorderItems(allRecords)
    this.dangerouslyReplaceAllRecords('all', reorderedRecords)
  }

  // Upserts all draft records into the final database - must be in draft mode
  finalCheckIn() {

    console.log(chalk.bgWhite('Checking in the draft records into the final records database.'))

    if (this.database !== this.databaseMapping.final) {
      throw new Error('Repository must be in "final" mode to perform a check-in.')
    }

    const draftRecordObjects = JSON.parse(fs.readFileSync(this.databaseMapping.draft, 'utf8')) as IFullRezoningDetail[]
    const draftRecords = draftRecordObjects.map((record) => new FullRecord(record))

    for (const record of draftRecords) {
      this.upsertRecords(record.type, [record])
    }

    console.log(chalk.green('Check-in complete. You may now safely clear rezonings-draft.json'))

  }

}

function reorderItems(items: FullRecord[]): FullRecord[] {
  const sortedItems = items
    .sort((a, b) => {
      if (!a.getLatestDate()) return 1
      if (!b.getLatestDate()) return -1
      return moment(b.getLatestDate()).diff(moment(a.getLatestDate()))
    })
  return sortedItems
}
