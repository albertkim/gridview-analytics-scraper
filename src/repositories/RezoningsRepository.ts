import fs from 'fs'
import path from 'path'
import moment from 'moment'
import chalk from 'chalk'
import similarity from 'similarity'
import '../database/rezonings.json'

export type ZoningType =
  'single-family residential' |
  'townhouse' |
  'mixed-use' |
  'multi-family residential' |
  'industrial' |
  'commercial'

export type ZoningStatus =
  'applied' |
  'pending' |
  'public hearing' |
  'approved' |
  'denied' |
  'withdrawn'

export interface IRezoningStats {
  buildings: number | null
  stratas: number | null
  rentals: number | null
  hotels: number | null
  fsr: number | null
}

// This interface is what is processed by GPT. Other fields in the full detail object are added ia code.
export interface IPartialRezoningDetail {
  rezoningId: string | null
  address: string
  applicant: string | null
  behalf: string | null
  description: string
  type: ZoningType | null
  stats: IRezoningStats
  zoning: {
    previousZoningCode: string | null
    previousZoningDescription: string | null
    newZoningCode: string | null
    newZoningDescription: string | null
  }
}

export interface IFullRezoningDetail extends IPartialRezoningDetail {
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
    type: 'application' | 'public hearing' | 'bylaw'
  }[]
  minutesUrls: {
    url: string
    date: string
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
    const rawData = require('../database/rezonings.json') as IFullRezoningDetail[]
    if (filter?.city) {
      return rawData.filter((item) => item.city === filter.city)
    } else {
      return rawData
    }
  },

  getRezoningsWithSimilarAddresses(rezoning: IFullRezoningDetail): {index: number, rezoning: IFullRezoningDetail, similarity: number}[] {

    const minimumSimilarity = 0.8

    if (!rezoning.address) {
      return []
    }

    const numbersInAddress = (rezoning.address || '').match(/\d+/g)

    const allRezonings = require('../database/rezonings.json') as IFullRezoningDetail[]
    const rezoningIndex = allRezonings.findIndex((item) => item === rezoning) // Can be -1 if not found

    const rezoningsWithMatchingNumbers: {
      index: number
      rezoning: IFullRezoningDetail
      similarity: number
    }[] = []

    for (let i = 0; i < allRezonings.length; i++) {
      if (i === rezoningIndex) {
        continue
      }
      const otherRezoning = allRezonings[i]
      if (otherRezoning.city !== rezoning.city) {
        continue
      }
      const otherNumbersInAddress = (otherRezoning.address || '').match(/\d+/g)
      if (!otherNumbersInAddress) {
        continue
      }
      const numbersMatch = otherNumbersInAddress.every(otherNumber => numbersInAddress!.includes(otherNumber))
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

  updateRezoningsForCity(city: string, rezonings: IFullRezoningDetail[]) {

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

  dangerouslyUpdateAllRezonings(rezonings: IFullRezoningDetail[]) {

    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify(rezonings, null, 2),
      'utf8'
    )

    return this.getRezonings()

  }

}

// Return one of the 2 strongs provided.
// If one string is null/empty, return the non-null strong. Otherwise, return based on priority.
function mergeSimpleField<T extends string | number | null>(string1: T, string2: T, priority: 'old' | 'new' | 'longer') {
  if (!string1) {
    return string2
  }
  if (!string2) {
    return string1
  }
  if (priority === 'old') {
    return string1
  }
  if (priority === 'new') {
    return string2
  }
  if (typeof string1 === 'string' && typeof string2 === 'string' && priority === 'longer') {
    return string1.length > string2.length ? string1 : string2
  }
  return null
}

function mergeStatus(oldStatus: ZoningStatus, newStatus: ZoningStatus) {
  const statusOrder = ['applied', 'pending', 'public hearing', 'approved', 'denied', 'withdrawn']
  return statusOrder.indexOf(newStatus) > statusOrder.indexOf(oldStatus) ? newStatus : oldStatus
}

export function mergeEntries(oldEntry: IFullRezoningDetail, newEntry: IFullRezoningDetail) {

  // city, metroCity, address, and createDate should be consistent
  const mergedData = {...oldEntry}

  mergedData.rezoningId = mergeSimpleField(oldEntry.rezoningId, newEntry.rezoningId, 'old')
  mergedData.applicant = mergeSimpleField(oldEntry.applicant, newEntry.applicant, 'old')
  mergedData.behalf = mergeSimpleField(oldEntry.behalf, newEntry.behalf, 'old')
  mergedData.description = mergeSimpleField(oldEntry.description, newEntry.description, 'longer') || ''
  if (oldEntry.type !== newEntry.type) {
    console.warn(chalk.bgYellow(`Warning: Field 'type' has different values in old and new data (${oldEntry.type} vs ${newEntry.type}). Preferring the old value.`))
    mergedData.type = mergeSimpleField(oldEntry.type, newEntry.type, 'old')
  }
  const statsArray: (keyof IFullRezoningDetail['stats'])[] = ['buildings', 'stratas', 'rentals', 'hotels', 'fsr']
  statsArray.forEach((fieldName) => {
    mergedData.stats[fieldName] = mergeSimpleField(oldEntry.stats[fieldName], newEntry.stats[fieldName], 'old')
  })
  mergedData.zoning.previousZoningCode = mergeSimpleField(oldEntry.zoning.previousZoningCode, newEntry.zoning.previousZoningCode, 'old')
  mergedData.zoning.newZoningCode = mergeSimpleField(oldEntry.zoning.newZoningCode, newEntry.zoning.newZoningCode, 'old')
  mergedData.zoning.previousZoningDescription = mergeSimpleField(oldEntry.zoning.previousZoningDescription, newEntry.zoning.previousZoningDescription, 'longer')
  mergedData.zoning.newZoningDescription = mergeSimpleField(oldEntry.zoning.newZoningDescription, newEntry.zoning.newZoningDescription, 'longer')
  mergedData.status = mergeStatus(oldEntry.status, newEntry.status)
  const datesArray: (keyof IFullRezoningDetail['dates'])[] = ['appliedDate', 'publicHearingDate', 'approvalDate', 'denialDate', 'withdrawnDate']
  datesArray.forEach((fieldName) => {
    mergedData.dates[fieldName] = mergeSimpleField(oldEntry.dates[fieldName], newEntry.dates[fieldName], 'old')
  })
  mergedData.urls = [...new Map(
    [...oldEntry.urls, ...newEntry.urls]
    .map(obj => [`${obj.url}_${obj.date}`, obj]))
    .values()
  ]
  mergedData.minutesUrls = [...new Map(
    [...oldEntry.minutesUrls, ...newEntry.minutesUrls]
    .map(obj => [`${obj.url}_${obj.date}`, obj]))
    .values()
  ]
  mergedData.createDate = moment(oldEntry.createDate).isBefore(moment(newEntry.createDate)) ? oldEntry.createDate : newEntry.createDate
  mergedData.updateDate = moment().format('YYYY-MM-DD')

  return mergedData

}

// Type-check the json object property types match with the IRezoningDetail property types
export function checkGPTJSON(json: any): boolean {
  if (typeof json !== 'object' || json === null) {
      return false
  }

  const checkStringOrNull = (value: any) => typeof value === 'string' || value === null
  const checkNumberOrNull = (value: any) => typeof value === 'number' || value === null

  // Check for main properties (city and metroCity checks not needed)
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

  // Check zoning object
  if (typeof json.zoning !== 'object' || json.zoning === null) return false
  if (!checkStringOrNull(json.zoning.previousZoningCode)) return false
  if (!checkStringOrNull(json.zoning.previousZoningDescription)) return false
  if (!checkStringOrNull(json.zoning.newZoningCode)) return false
  if (!checkStringOrNull(json.zoning.newZoningDescription)) return false

  // Check status
  if (typeof json.status !== 'string') return false

  // Check dates object
  if (typeof json.dates !== 'object' || json.dates === null) return false
  if (!checkStringOrNull(json.dates.appliedDate)) return false
  if (!checkStringOrNull(json.dates.publicHearingDate)) return false
  if (!checkStringOrNull(json.dates.approvalDate)) return false
  if (!checkStringOrNull(json.dates.denialDate)) return false
  if (!checkStringOrNull(json.dates.withdrawnDate)) return false

  return true
}

