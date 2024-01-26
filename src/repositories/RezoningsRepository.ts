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
  rezoningId: string | null
  address: string
  applicant: string | null
  behalf: string | null
  description: string
  type: ZoningType | null
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
  status: ZoningStatus
  dates: {
    appliedDate: string | null
    publicHearingDate: string | null
    approvalDate: string | null
    denialDate: string | null
    withdrawnDate: string | null
  }
  urls: {
    title: string
    url: string
    date: string
    type: ZoningStatus
  }[]
  minutesUrls: {
    url: string
    date: string
    type: ZoningStatus
  }[]
  location: {
    latitude: number | null
    longitude: number | null
  }
  createDate: string
  updateDate: string
}

function reorderItems(items: IFullRezoningDetail[]) {
  return items.sort((a, b) => {
    const dateA = moment(a.updateDate, 'YYYY-MM-DD')
    const dateB = moment(b.updateDate, 'YYYY-MM-DD')
    
    if (dateA.isBefore(dateB)) {
      return -1
    }
    if (dateA.isAfter(dateB)) {
      return 1
    }
    return 0
  })
}

export const RezoningsRepository = {

  getRezonings(filter?: {city?: string}) {
    const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../database/rezonings.json'), 'utf8')) as IFullRezoningDetail[]
    if (filter?.city) {
      return rawData.filter((item) => item.city === filter.city)
    } else {
      return rawData
    }
  },

  getRezoningsWithSimilarAddresses(rezoning: IFullRezoningDetail): {index: number, rezoning: IFullRezoningDetail, similarity: number}[] {

    const minimumSimilarity = 0.7

    if (!rezoning.address) return []

    const numbersInAddress = (rezoning.address || '').match(/\d+/g)

    if (!numbersInAddress) return []

    const allRezonings = this.getRezonings()
    const rezoningIndex = allRezonings.findIndex((item) => item === rezoning) // Can be -1 if not found

    const rezoningsWithMatchingNumbers: {
      index: number
      rezoning: IFullRezoningDetail
      similarity: number
    }[] = []

    for (let i = 0; i < allRezonings.length; i++) {
      const otherRezoning = allRezonings[i]
      if (otherRezoning.id === rezoning.id) {
        continue
      }
      if (otherRezoning.city !== rezoning.city) {
        continue
      }
      if (!otherRezoning.address) {
        continue
      }
      const otherNumbersInAddress = (otherRezoning.address || '').match(/\d+/g)
      if (!otherNumbersInAddress) {
        continue
      }
      const numbersMatch = otherNumbersInAddress.every(otherNumber => numbersInAddress.includes(otherNumber))
      if (numbersMatch) {
        const similarityScore = similarity(rezoning.address, otherRezoning.address)
        if (similarityScore > minimumSimilarity) {
          rezoningsWithMatchingNumbers.push({
            index: i,
            rezoning: otherRezoning,
            similarity: similarityScore
          })
        }
      }
    }

    return rezoningsWithMatchingNumbers

  },

  // Replaces all rezonings with the same city
  dangerouslyUpdateRezonings(city: string, rezonings: IFullRezoningDetail[]) {

    const previousEntries = this.getRezonings()
    const filteredData = previousEntries.filter((item) => item.city !== city)
    const newData = reorderItems([...filteredData, ...rezonings])
    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify(newData, null, 2),
      'utf8'
    )

    return this.getRezonings({city})
    
  },

  // Update a rezoning completely, does not merge with previous entry
  // Most use cases will require the upsertRezonings() function, defined below
  updateRezoning(id: string, rezoning: IFullRezoningDetail) {
    rezoning.id = id
    const previousEntries = this.getRezonings()
    const matchingRezoningIndex = previousEntries.findIndex((item) => item.id === id)
    if (matchingRezoningIndex === -1) throw new Error(`Could not find rezoning with id ${id}`)
    previousEntries[matchingRezoningIndex] = rezoning
    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify(previousEntries, null, 2),
      'utf8'
    )
  },

  // Add news to the database - merge if there is a rezoning with the same address
  upsertRezonings(rezonings: IFullRezoningDetail[]) {

    const previousEntries = this.getRezonings()

    for (const rezoning of rezonings) {

      // Check for any entries with the same ID (not rezoning ID)
      const rezoningWithMatchingID = previousEntries.find((item) => item.id === rezoning.id)
      if (rezoningWithMatchingID) {
        const mergedRezoning = mergeEntries(rezoningWithMatchingID, rezoning)
        this.updateRezoning(rezoningWithMatchingID.id, mergedRezoning)
        continue
      }

      // Check for any entries with the same rezoning ID - take precedent over matching addresses
      const rezoningWithMatchingRezoningID = rezoning.rezoningId ?
        previousEntries.find((item) => item.rezoningId === rezoning.rezoningId)
        : null
      if (rezoningWithMatchingRezoningID) {
        const mergedRezoning = mergeEntries(rezoningWithMatchingRezoningID, rezoning)
        mergedRezoning.id = rezoningWithMatchingRezoningID.id
        this.updateRezoning(rezoningWithMatchingRezoningID.id, mergedRezoning)
        continue
      }

      // Check for any entries with the same/similar addresses
      const similarAddresses = this.getRezoningsWithSimilarAddresses(rezoning)
      if (similarAddresses.length > 0) {
        const similarRezoning = similarAddresses[0].rezoning
        const mergedRezoning = mergeEntries(similarRezoning, rezoning)
        mergedRezoning.id = similarRezoning.id
        this.updateRezoning(similarRezoning.id, mergedRezoning)
        continue
      }

      // Otherwise, just add the entry to the database
      fs.writeFileSync(
        path.join(__dirname, '../database/rezonings.json'),
        JSON.stringify([...previousEntries, rezoning], null, 2),
        'utf8'
      )

    }

  },

  // Replaces all rezonings
  dangerouslyUpdateAllRezonings(rezonings: IFullRezoningDetail[]) {
    const orderedRezonings = reorderItems(rezonings)
    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify(orderedRezonings, null, 2),
      'utf8'
    )
    return this.getRezonings()
  }

}

// Return one of the 2 strongs provided.
// If one string is null/empty, return the non-null strong. Otherwise, return based on priority.
function mergeSimpleField<T extends string | number | null>(string1: T, string2: T, priority: 'old' | 'new' | 'longer') {
  if (string1 === null || string1 === undefined) {
    return string2
  }
  if (!string2 === null || string1 === undefined) {
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
function getLatestMinuteDate(rezoning: IFullRezoningDetail): {url: string, date: string, type: ZoningStatus} | null {
  const latestDate = rezoning.minutesUrls.reduce((latest, current) => {
    if (!latest) {
      return current
    }
    if (moment(current.date, 'YYYY-MM-DD').isAfter(moment(latest.date, 'YYYY-MM-DD'))) {
      return current
    }
    return latest
  }, null as null | {url: string, date: string, type: ZoningStatus})
  return latestDate
}

export function mergeEntries(oldEntry: IFullRezoningDetail, newEntry: IFullRezoningDetail) {

  // city, metroCity, address, and createDate should be consistent
  const mergedData = {...oldEntry}

  // Always prefer application type rezoning data over other types of rezoning data
  // But prefer public hearings data over bylaw data, which usually has the least useful information
  let preferred: 'old' | 'new' = 'old'
  const oldMinuteDate = getLatestMinuteDate(oldEntry)
  const newMinuteDate = getLatestMinuteDate(newEntry)
  if (oldMinuteDate && oldMinuteDate.type === 'applied') {
    preferred = 'old'
  } else if (newMinuteDate && newMinuteDate.type === 'applied') {
    preferred = 'new'
  } else if (oldMinuteDate && oldMinuteDate.type === 'public hearing') {
    preferred = 'old'
  } else if (newMinuteDate && newMinuteDate.type === 'public hearing') {
    preferred = 'new'
  }

  // Identify whether the old or new entry has the latest minute date
  // and set a variable called "newerEntry" that is either 'new' or 'old'
  // This is used to set the status to be the latest status
  const newerEntry = oldMinuteDate && newMinuteDate && moment(newMinuteDate.date).isAfter(moment(oldMinuteDate.date)) ? 'new' : 'old'

  mergedData.rezoningId = mergeSimpleField(oldEntry.rezoningId, newEntry.rezoningId, preferred)
  mergedData.applicant = mergeSimpleField(oldEntry.applicant, newEntry.applicant, preferred)
  mergedData.behalf = mergeSimpleField(oldEntry.behalf, newEntry.behalf, preferred)
  mergedData.description = mergeSimpleField(oldEntry.description, newEntry.description, preferred) || ''
  if (oldEntry.type !== newEntry.type) {
    mergedData.type = mergeSimpleField(oldEntry.type, newEntry.type, preferred)
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
  mergedData.urls = [...new Map(
    [...oldEntry.urls, ...newEntry.urls]
    .map(obj => [`${obj.url}_${obj.date}_${obj.type}`, obj]))
    .values()
  ]
  mergedData.minutesUrls = [...new Map(
    [...oldEntry.minutesUrls, ...newEntry.minutesUrls]
    .map(obj => [`${obj.url}_${obj.date}}`, obj]))
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
  if (!checkStringOrNull(json.rezoningId)) return false
  if (!checkStringOrNull(json.address)) return false
  if (!checkStringOrNull(json.applicant)) return false
  if (!checkStringOrNull(json.behalf)) return false
  if (!checkStringOrNull(json.description)) return false
  if (!(json.type === null || typeof json.type === 'string')) return false

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
