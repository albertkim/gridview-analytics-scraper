import fs from 'fs'
import path from 'path'
import moment from 'moment'
import chalk from 'chalk'

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

export interface IRezoningDetail {
  city: string
  metroCity: string | null
  address: string
  applicant: string | null
  behalf: string | null
  description: string
  type: ZoningType | null
  stats: {
    buildings: number | null
    stratas: number | null
    rentals: number | null
    hotels: number | null
    fsr: number | null
    height: number | null
  }
  zoning: {
    previousZoningCode: string | null
    previousZoningDescription: string | null
    newZoningCode: string | null
    newZoningDescription: string | null
  }
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
  }[]
  minutesUrls: {
    url: string
    date: string
  }[]
  createDate: string
  updateDate: string
}

function reorderItems(items: IRezoningDetail[]) {
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
    const rawData = require('../database/rezonings.json') as IRezoningDetail[]
    if (filter?.city) {
      return rawData.filter((item) => item.city === filter.city)
    } else {
      return rawData
    }
  },

  updateRezonings(city: string, rezonings: IRezoningDetail[]) {

    const previousEntries = this.getRezonings()
    const filteredData = previousEntries.filter((item) => item.city !== city)
    const newData = reorderItems([...filteredData, ...rezonings])
    fs.writeFileSync(
      path.join(__dirname, '../database/rezonings.json'),
      JSON.stringify(newData, null, 2),
      'utf8'
    )

    return this.getRezonings({city})
    
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

export function mergeEntries(oldEntry: IRezoningDetail, newEntry: IRezoningDetail) {

  // city, metroCity, address, and createDate should be consistent
  const mergedData = {...oldEntry}

  mergedData.applicant = mergeSimpleField(oldEntry.applicant, newEntry.applicant, 'old')
  mergedData.behalf = mergeSimpleField(oldEntry.behalf, newEntry.behalf, 'old')
  mergedData.description = mergeSimpleField(oldEntry.description, newEntry.description, 'longer') || ''
  if (oldEntry.type !== newEntry.type) {
    console.warn(chalk.bgYellow(`Warning: Field 'type' has different values in old and new data (${oldEntry.type} vs ${newEntry.type}). Preferring the old value.`))
    mergedData.type = mergeSimpleField(oldEntry.type, newEntry.type, 'old')
  }
  const statsArray: (keyof IRezoningDetail['stats'])[] = ['buildings', 'stratas', 'rentals', 'hotels', 'fsr', 'height']
  statsArray.forEach((fieldName) => {
    mergedData.stats[fieldName] = mergeSimpleField(oldEntry.stats[fieldName], newEntry.stats[fieldName], 'old')
  })
  mergedData.zoning.previousZoningCode = mergeSimpleField(oldEntry.zoning.previousZoningCode, newEntry.zoning.previousZoningCode, 'old')
  mergedData.zoning.newZoningCode = mergeSimpleField(oldEntry.zoning.newZoningCode, newEntry.zoning.newZoningCode, 'old')
  mergedData.zoning.previousZoningDescription = mergeSimpleField(oldEntry.zoning.previousZoningDescription, newEntry.zoning.previousZoningDescription, 'longer')
  mergedData.zoning.newZoningDescription = mergeSimpleField(oldEntry.zoning.newZoningDescription, newEntry.zoning.newZoningDescription, 'longer')
  mergedData.status = mergeStatus(oldEntry.status, newEntry.status)
  const datesArray: (keyof IRezoningDetail['dates'])[] = ['appliedDate', 'publicHearingDate', 'approvalDate', 'denialDate', 'withdrawnDate']
  datesArray.forEach((fieldName) => {
    mergedData.dates[fieldName] = mergeSimpleField(oldEntry.dates[fieldName], newEntry.dates[fieldName], 'old')
  })
  mergedData.urls = [...new Map([...oldEntry.urls, ...newEntry.urls].map(obj => [obj.url, obj])).values()]
  mergedData.minutesUrls = [...new Map([...oldEntry.minutesUrls, ...newEntry.minutesUrls].map(obj => [obj.url, obj])).values()]
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
  if (!checkNumberOrNull(json.stats.height)) return false

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

