import fs from 'fs'
import path from 'path'
import moment from 'moment'
import similarity from 'similarity'

export type ZoningType =
  'single-family residential' |
  'townhouse' |
  'mixed use' |
  'multi-family residential' |
  'industrial' |
  'commercial' |
  'other'

export const ZoningTypeValues = [
  'single-family residential',
  'townhouse',
  'mixed use',
  'multi-family residential',
  'industrial',
  'commercial',
  'other'
]

export type ZoningStatus =
  'applied' |
  'public hearing' |
  'approved' |
  'denied' |
  'withdrawn'

export const ZoningStatusValues = [
  'applied',
  'pending',
  'public hearing',
  'approved',
  'denied',
  'withdrawn'
]

export interface IRezoningStats {
  buildings: number | null
  stratas: number | null
  rentals: number | null
  hotels: number | null
  fsr: number | null
  storeys: number | null
}

// This interface is what is processed by GPT. Other fields in the full detail object are added via code.
export interface IPartialRezoningDetail {
  applicationId: string | null
  address: string
  applicant: string | null
  behalf: string | null
  description: string
  buildingType: ZoningType | null
  status: ZoningStatus | null
  stats: IRezoningStats
  zoning: {
    previousZoningCode: string | null
    previousZoningDescription: string | null
    newZoningCode: string | null
    newZoningDescription: string | null
  }
}

export interface IFullRezoningDetail extends IPartialRezoningDetail {
  id: string
  city: string
  metroCity: string | null
  type: 'rezoning' | 'development permit'
  status: ZoningStatus
  dates: {
    appliedDate: string | null
    publicHearingDate: string | null
    approvalDate: string | null
    denialDate: string | null
    withdrawnDate: string | null
  }
  reportUrls: {
    title: string
    url: string
    date: string
    status: ZoningStatus
  }[]
  minutesUrls: {
    url: string
    date: string
    status: ZoningStatus
  }[]
  location: {
    latitude: number | null
    longitude: number | null
  }
  createDate: string
  updateDate: string
}

// Sort by latest activity date desc, determined by the latest date from either reportUrls or minutesUrls
function reorderItems(items: IFullRezoningDetail[]): IFullRezoningDetail[] {
  const mappedItems = items.map((item) => {
    const reportUrlDates = item.reportUrls.map((report) => report.date)
    const minutesUrlDates = item.minutesUrls.map((minutes) => minutes.date)
    const combinedDates = [...reportUrlDates, ...minutesUrlDates]
    const latestDate = combinedDates.length > 0 ? combinedDates.reduce((latest, current) => {
      if (!latest) {
        return current
      }
      if (moment(current).isAfter(moment(latest))) {
        return current
      }
      return latest
    }) : '2000-01-01' // If no dates for some reason, set to a very old date
    return {
      latestDate: latestDate,
      item: item
    }
  })

  const sortedItems = mappedItems
    .sort((a, b) => {
      if (!a.latestDate) {
        return 1
      }
      if (!b.latestDate) {
        return -1
      }
      return moment(b.latestDate).diff(moment(a.latestDate))
    })
    .map((items) => items.item)

  return sortedItems
}

export const RecordsRepository = {

  getRecords(type: 'all' | 'rezoning' | 'development permit', filter?: {city?: string}) {
    let records = JSON.parse(fs.readFileSync(path.join(__dirname, '../database/rezonings.json'), 'utf8')) as IFullRezoningDetail[]
    if (type !== 'all') {
      records = records.filter((item) => item.type === type)
    }
    if (filter?.city) {
      records = records.filter((item) => item.city === filter.city)
    }
    return records
  },

  getRecordsWithSimilarAddresses(type: 'rezoning' | 'development permit', item: IFullRezoningDetail): {index: number, rezoning: IFullRezoningDetail, similarity: number}[] {

    const minimumSimilarity = 0.7

    if (!item.address) return []

    const numbersInAddress = (item.address || '').match(/\d+/g)

    if (!numbersInAddress) return []

    const allRecords = this.getRecords(type)

    const recordsWithMatchingNumbers: {
      index: number
      rezoning: IFullRezoningDetail
      similarity: number
    }[] = []

    for (let i = 0; i < allRecords.length; i++) {
      const otherRecord = allRecords[i]
      if (otherRecord.id === item.id) {
        continue
      }
      if (otherRecord.city !== item.city) {
        continue
      }
      if (!otherRecord.address) {
        continue
      }
      const otherNumbersInAddress = (otherRecord.address || '').match(/\d+/g)
      if (!otherNumbersInAddress) {
        continue
      }
      const numbersMatch = otherNumbersInAddress.every(otherNumber => numbersInAddress.includes(otherNumber))
      if (numbersMatch) {
        const similarityScore = similarity(item.address.toLowerCase(), otherRecord.address.toLowerCase())
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

  },

  // Replaces all records with the same record type and city
  dangerouslyReplaceRecords(type: 'rezoning' | 'development permit', city: string, newRecords: IFullRezoningDetail[]) {

    const previousRecords = this.getRecords('all')
    const recordsToKeep = previousRecords.filter((item) => item.type !== type || item.city !== city)
    const recordsToWrite = [...recordsToKeep, ...newRecords]
    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify(recordsToWrite, null, 2),
      'utf8'
    )

    return this.getRecords(type, {city})
    
  },

  createRecord(record: IFullRezoningDetail) {
    const previousEntries = this.getRecords('all')
    const orderedEntries = reorderItems([...previousEntries, record])
    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify([...orderedEntries, record], null, 2),
      'utf8'
    )
  },

  // Update a record completely, does not merge with previous entry
  // Most use cases will require the upsertRecords() function, defined below
  updateRecord(id: string, record: IFullRezoningDetail) {
    record.id = id
    const previousEntries = this.getRecords('all')
    const matchingRezoningIndex = previousEntries.findIndex((item) => item.id === id)
    if (matchingRezoningIndex === -1) throw new Error(`Could not find rezoning with id ${id}`)
    previousEntries[matchingRezoningIndex] = record
    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify(previousEntries, null, 2),
      'utf8'
    )
  },

  // Add records to the database - merge if there is a record of the same type and the same address
  upsertRecords(type: 'rezoning' | 'development permit', records: IFullRezoningDetail[]) {

    const previousRecords = this.getRecords(type)

    for (const record of records) {

      // Check for any entries with the same ID (not application ID)
      const recordWithMatchingID = previousRecords.find((item) => item.id === record.id)
      if (recordWithMatchingID) {
        const mergedRecord = mergeEntries(recordWithMatchingID, record)
        this.updateRecord(recordWithMatchingID.id, mergedRecord)
        continue
      }

      // Check for any entries with the same application ID - take precedent over matching addresses
      const recordWithMatchingApplicationID = record.applicationId ?
        previousRecords.find((item) => item.applicationId === record.applicationId)
        : null
      if (recordWithMatchingApplicationID) {
        const mergedRecord = mergeEntries(recordWithMatchingApplicationID, record)
        mergedRecord.id = recordWithMatchingApplicationID.id
        this.updateRecord(recordWithMatchingApplicationID.id, mergedRecord)
        continue
      }

      // Check for any entries with the same/similar addresses
      const similarAddresses = this.getRecordsWithSimilarAddresses(type, record)
      if (similarAddresses.length > 0) {
        const similarRecord = similarAddresses[0].rezoning
        const mergedRecord = mergeEntries(similarRecord, record)
        mergedRecord.id = similarRecord.id
        this.updateRecord(similarRecord.id, mergedRecord)
        continue
      }

      // Otherwise, just add the entry to the database
      this.createRecord(record)

    }

    // Reorder all entries
    const allRecords = this.getRecords('all')
    const reorderedRecords = reorderItems(allRecords)
    this.dangerouslyUpdateAllRecords('all', reorderedRecords)

  },

  // Replaces all records of a certain type if specified
  dangerouslyUpdateAllRecords(type: 'all' | 'rezoning' | 'development permit', newRecords: IFullRezoningDetail[]) {
    const allRecords = this.getRecords('all')
    const recordsToKeep = type === 'all' ? [] : allRecords.filter((item) => item.type !== type) // will be empty if 'all' type is provided, meaning everything should be replaced
    const recordsToWrite = reorderItems([...recordsToKeep, ...newRecords])
    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify(recordsToWrite, null, 2),
      'utf8'
    )
  }

}

// Return one of the 2 strongs provided.
// If one string is null/empty, return the non-null strong. Otherwise, return based on priority.
function mergeSimpleField<T extends string | number | null>(string1: T, string2: T, priority: 'old' | 'new' | 'longer') {
  if (string1 === null || string1 === undefined) {
    return string2
  }
  if (!string2 === null || string2 === undefined) {
    return string1
  }
  if (priority === 'old') {
    return string1
  }
  if (priority === 'new') {
    return string2
  }
  if (priority === 'longer' && typeof string1 === 'string' && typeof string2 === 'string') {
    return string1.length > string2.length ? string1 : string2
  }
  return null
}

// Given a rezoning, let the latest minute url and the type. Use minutes instead of reports because some rezonings don't have reports.
// Used to see which data should be preferred during merging (perfer application data)
function getLatestMinuteDate(rezoning: IFullRezoningDetail): {url: string, date: string, status: ZoningStatus} | null {
  const latestDate = rezoning.minutesUrls.reduce((latest, current) => {
    if (!latest) {
      return current
    }
    if (moment(current.date, 'YYYY-MM-DD').isAfter(moment(latest.date, 'YYYY-MM-DD'))) {
      return current
    }
    return latest
  }, null as null | {url: string, date: string, status: ZoningStatus})
  return latestDate
}

// Note that in the params, old/new refers to the old/new entry, not the old/new data
// For old/new data based on dates, see the old/newMinuteDate functionality inside the function
export function mergeEntries(oldEntry: IFullRezoningDetail, newEntry: IFullRezoningDetail) {

  // city, metroCity, address, and createDate should be consistent
  const mergedData = {...oldEntry}

  // Always prefer application type rezoning data over other types of rezoning data
  // But prefer public hearings data over bylaw data, which usually has the least useful information
  let preferred: 'old' | 'new' = 'old'
  const oldMinuteDate = getLatestMinuteDate(oldEntry)
  const newMinuteDate = getLatestMinuteDate(newEntry)

  // If the latest dates are the same, this is probably a re-scrape. Prefer the new data
  if (oldMinuteDate === newMinuteDate) {
    preferred = 'new'
  } else {
    // If development permit, always prefer new (don't have progressive statuses with DPs usually)
    if (oldEntry.type === 'development permit') {
      preferred = 'new'
    } else if (oldEntry.type === 'rezoning') {
      if (oldMinuteDate && oldMinuteDate.status === 'applied') {
        preferred = 'old'
      } else if (newMinuteDate && newMinuteDate.status === 'applied') {
        preferred = 'new'
      } else if (oldMinuteDate && oldMinuteDate.status === 'public hearing') {
        preferred = 'old'
      } else if (newMinuteDate && newMinuteDate.status === 'public hearing') {
        preferred = 'new'
      }
    }
  }

  // Identify whether the old or new entry has the latest minute date
  // and set a variable called "newerEntry" that is either 'new' or 'old'
  // This is used to set the status to be the latest status
  const newerEntry = oldMinuteDate && newMinuteDate && moment(newMinuteDate.date).isAfter(moment(oldMinuteDate.date)) ? 'new' : 'old'

  mergedData.applicationId = mergeSimpleField(oldEntry.applicationId, newEntry.applicationId, preferred)
  mergedData.applicant = mergeSimpleField(oldEntry.applicant, newEntry.applicant, preferred)
  mergedData.behalf = mergeSimpleField(oldEntry.behalf, newEntry.behalf, preferred)
  mergedData.description = mergeSimpleField(oldEntry.description, newEntry.description, preferred) || ''
  if (oldEntry.buildingType !== newEntry.buildingType) {
    mergedData.buildingType = mergeSimpleField(oldEntry.buildingType, newEntry.buildingType, preferred)
  }
  const statsArray: (keyof IFullRezoningDetail['stats'])[] = ['buildings', 'stratas', 'rentals', 'hotels', 'fsr']
  statsArray.forEach((fieldName) => {
    mergedData.stats[fieldName] = mergeSimpleField(oldEntry.stats[fieldName], newEntry.stats[fieldName], preferred)
  })
  mergedData.zoning.previousZoningCode = mergeSimpleField(oldEntry.zoning.previousZoningCode, newEntry.zoning.previousZoningCode, preferred)
  mergedData.zoning.newZoningCode = mergeSimpleField(oldEntry.zoning.newZoningCode, newEntry.zoning.newZoningCode, preferred)
  mergedData.zoning.previousZoningDescription = mergeSimpleField(oldEntry.zoning.previousZoningDescription, newEntry.zoning.previousZoningDescription, preferred)
  mergedData.zoning.newZoningDescription = mergeSimpleField(oldEntry.zoning.newZoningDescription, newEntry.zoning.newZoningDescription, preferred)

  // Always accept the latest status (do a date check first) becaue a rezoning can be denied, then approved again
  mergedData.status = mergeSimpleField(oldEntry.status, newEntry.status, newerEntry) as ZoningStatus

  const datesArray: (keyof IFullRezoningDetail['dates'])[] = ['appliedDate', 'publicHearingDate', 'approvalDate', 'denialDate', 'withdrawnDate']
  datesArray.forEach((fieldName) => {
    mergedData.dates[fieldName] = mergeSimpleField(oldEntry.dates[fieldName], newEntry.dates[fieldName], preferred)
  })
  mergedData.reportUrls = [...new Map(
    [...oldEntry.reportUrls, ...newEntry.reportUrls]
    .map(obj => [`${obj.url}_${obj.date}_${obj.status}`, obj]))
    .values()
  ]
  mergedData.minutesUrls = [...new Map(
    [...oldEntry.minutesUrls, ...newEntry.minutesUrls]
    .map(obj => [`${obj.url}_${obj.date}}_${obj.status}`, obj]))
    .values()
  ]
  mergedData.createDate = moment(oldEntry.createDate).isBefore(moment(newEntry.createDate)) ? oldEntry.createDate : newEntry.createDate
  mergedData.updateDate = moment().format('YYYY-MM-DD')

  return mergedData

}

// Type-check the json object property types match with the IRezoningDetail property types
export function checkGPTRezoningJSON(json: any): boolean {
  if (typeof json !== 'object' || json === null) {
    return false
  }

  const checkStringOrNull = (value: any) => typeof value === 'string' || value === null
  const checkNumberOrNull = (value: any) => typeof value === 'number' || value === null

  // Check for main properties
  if (!checkStringOrNull(json.applicationId)) return false
  if (!checkStringOrNull(json.address)) return false
  if (!checkStringOrNull(json.applicant)) return false
  if (!checkStringOrNull(json.behalf)) return false
  if (!checkStringOrNull(json.description)) return false
  if (!(json.buildingType === null || typeof json.buildingType === 'string')) return false

  // Check stats object
  if (typeof json.stats !== 'object' || json.stats === null) return false
  if (!checkNumberOrNull(json.stats.buildings)) return false
  if (!checkNumberOrNull(json.stats.stratas)) return false
  if (!checkNumberOrNull(json.stats.rentals)) return false
  if (!checkNumberOrNull(json.stats.hotels)) return false
  if (!checkNumberOrNull(json.stats.fsr)) return false
  if (!checkNumberOrNull(json.stats.storeys)) return false

  // Check zoning object
  if (typeof json.zoning !== 'object' || json.zoning === null) return false
  if (!checkStringOrNull(json.zoning.previousZoningCode)) return false
  if (!checkStringOrNull(json.zoning.previousZoningDescription)) return false
  if (!checkStringOrNull(json.zoning.newZoningCode)) return false
  if (!checkStringOrNull(json.zoning.newZoningDescription)) return false

  // Check status
  if (!checkStringOrNull(json.status)) return false

  return true
}
