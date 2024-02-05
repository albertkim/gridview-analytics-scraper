import moment from 'moment'
import { generateID } from './GenerateID'

export type BuildingType =
  'single-family residential' |
  'townhouse' |
  'mixed use' |
  'multi-family residential' |
  'industrial' |
  'commercial' |
  'other'

export type ZoningStatus =
  'applied' |
  'public hearing' |
  'approved' |
  'denied' |
  'withdrawn'

export interface IFullRecordParams {

  id?: string | null
  city: string
  metroCity: string
  type: 'rezoning' | 'development permit'
  applicationId?: string | null
  address: string
  applicant?: string | null
  behalf?: string | null
  description?: string | null
  buildingType?: BuildingType | null
  status: ZoningStatus
  dates?: {
    appliedDate: string | null
    publicHearingDate: string | null
    approvalDate: string | null
    denialDate: string | null
    withdrawnDate: string | null
  }
  stats?: {
    buildings: number | null
    stratas: number | null
    rentals: number | null
    hotels: number | null
    fsr: number | null
    storeys: number | null
  }
  zoning?: {
    previousZoningCode: string | null
    previousZoningDescription: string | null
    newZoningCode: string | null
    newZoningDescription: string | null
  }
  reportUrls?: {
    title: string
    url: string
    date: string
    status: ZoningStatus
  }[]
  minutesUrls?: {
    url: string
    date: string
    status: ZoningStatus
  }[]
  location?: {
    latitude: number | null
    longitude: number | null
  }
  createDate?: string
  updateDate?: string
}

export class FullRecord {

  id: string
  city: string
  metroCity: string
  type: 'rezoning' | 'development permit'
  applicationId: string | null
  address: string
  applicant: string | null
  behalf: string | null
  description: string
  buildingType: BuildingType | null
  status: ZoningStatus
  dates: {
    appliedDate: string | null
    publicHearingDate: string | null
    approvalDate: string | null
    denialDate: string | null
    withdrawnDate: string | null
  }
  stats: {
    buildings: number | null
    stratas: number | null
    rentals: number | null
    hotels: number | null
    fsr: number | null
    storeys: number | null
  }
  zoning: {
    previousZoningCode: string | null
    previousZoningDescription: string | null
    newZoningCode: string | null
    newZoningDescription: string | null
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

  constructor(params: IFullRecordParams) {

    let id: string
    if (params.id) id = params.id
    else if (params.type === 'rezoning') id = generateID('rez')
    else id = generateID('dev')
    this.id = id

    this.city = params.city
    this.metroCity = params.metroCity
    this.type = params.type
    this.applicationId = params.applicationId || null
    this.address = params.address
    this.applicant = params.applicant || null
    this.behalf = params.behalf || null
    this.description = params.description || ''
    this.buildingType = params.buildingType || null
    this.status = params.status
    this.dates = params.dates || {
      appliedDate: null,
      publicHearingDate: null,
      approvalDate: null,
      denialDate: null,
      withdrawnDate: null
    }
    this.stats = params.stats || {
      buildings: null,
      stratas: null,
      rentals: null,
      hotels: null,
      fsr: null,
      storeys: null
    }
    this.zoning = params.zoning || {
      previousZoningCode: null,
      previousZoningDescription: null,
      newZoningCode: null,
      newZoningDescription: null
    }
    this.reportUrls = params.reportUrls || []
    this.minutesUrls = params.minutesUrls || []
    this.location = params.location || {
      latitude: null,
      longitude: null
    }
    this.createDate = params.createDate || new Date().toISOString()
    this.updateDate = params.updateDate || new Date().toISOString()

  }

  getLatestDate() {
    const reportUrlDates = this.reportUrls.map((report) => report.date)
    const minutesUrlDates = this.minutesUrls.map((minutes) => minutes.date)
    const combinedDates = [...reportUrlDates, ...minutesUrlDates]
    const latestDate = combinedDates.length > 0 ? combinedDates.reduce((latest, current) => {
      if (!latest) return current
      if (moment(current).isAfter(moment(latest))) return current
      return latest
    }) : '2000-01-01' // If no dates for some reason, set to a very old date
    return latestDate
  }

  // Combine with another record
  // STRATEGY: If the record is a development permit (we only store approved DPs), then just use the new incoming data
  // If the record is a rezoning, prefer the prefer fields conditionally based on the status (ex. application data is more reliable than public hearing data, which is more reliable than bylaw data)
  merge(incomingRecord: FullRecord) {

    let preferred: 'this' | 'incoming'

    if (this.type === 'development permit') {
      preferred = 'incoming'
    } else {
      if (this.status === 'applied' && incomingRecord.status === 'applied') {
        // For some reason there are multiple applications - possibly a resubmission
        preferred = 'incoming'
      } else if (this.status === 'applied') {
        preferred = 'this'
      } else if (incomingRecord.status === 'applied') {
        preferred = 'incoming'
      } else if (this.status === 'public hearing') {
        preferred = 'this'
      } else if (incomingRecord.status === 'public hearing') {
        preferred = 'incoming'
      } else {
        preferred = 'this'
      }
    }

    // Base fields
    this.applicationId = mergeSimpleField(this.applicationId, incomingRecord.applicationId, preferred)
    this.applicant = mergeSimpleField(this.applicant, incomingRecord.applicant, preferred)
    this.behalf = mergeSimpleField(this.behalf, incomingRecord.behalf, preferred)
    this.description = mergeSimpleField(this.description, incomingRecord.description, preferred) || ''
    this.buildingType = mergeSimpleField(this.buildingType, incomingRecord.buildingType, preferred)

    // Status - update based on which has the latest date
    const thisLatestDate = this.getLatestDate()
    const incomingLatestDate = incomingRecord.getLatestDate()
    if (moment(incomingLatestDate).isAfter(moment(thisLatestDate))) {
      this.status = incomingRecord.status
    } else if (moment(thisLatestDate).isAfter(moment(incomingLatestDate))) {
      this.status = this.status
    } else {
      this.status = this.status
    }

    // Stats fields
    this.stats.buildings = mergeSimpleField(this.stats.buildings, incomingRecord.stats.buildings, preferred)
    this.stats.stratas = mergeSimpleField(this.stats.stratas, incomingRecord.stats.stratas, preferred)
    this.stats.rentals = mergeSimpleField(this.stats.rentals, incomingRecord.stats.rentals, preferred)
    this.stats.hotels = mergeSimpleField(this.stats.hotels, incomingRecord.stats.hotels, preferred)
    this.stats.fsr = mergeSimpleField(this.stats.fsr, incomingRecord.stats.fsr, preferred)
    this.stats.storeys = mergeSimpleField(this.stats.storeys, incomingRecord.stats.storeys, preferred)

    // Zoning fields
    this.zoning.previousZoningCode = mergeSimpleField(this.zoning.previousZoningCode, incomingRecord.zoning.previousZoningCode, preferred)
    this.zoning.previousZoningDescription = mergeSimpleField(this.zoning.previousZoningDescription, incomingRecord.zoning.previousZoningDescription, preferred)
    this.zoning.newZoningCode = mergeSimpleField(this.zoning.newZoningCode, incomingRecord.zoning.newZoningCode, preferred)
    this.zoning.newZoningDescription = mergeSimpleField(this.zoning.newZoningDescription, incomingRecord.zoning.newZoningDescription, preferred)

    // Dates fields
    this.dates.appliedDate = mergeSimpleField(this.dates.appliedDate, incomingRecord.dates.appliedDate, preferred)
    this.dates.publicHearingDate = mergeSimpleField(this.dates.publicHearingDate, incomingRecord.dates.publicHearingDate, preferred)
    this.dates.approvalDate = mergeSimpleField(this.dates.approvalDate, incomingRecord.dates.approvalDate, preferred)
    this.dates.denialDate = mergeSimpleField(this.dates.denialDate, incomingRecord.dates.denialDate, preferred)
    this.dates.withdrawnDate = mergeSimpleField(this.dates.withdrawnDate, incomingRecord.dates.withdrawnDate, preferred)

    // Report URLs - merge unique and sort by date desc
    this.reportUrls = [...new Map(
      [...this.reportUrls, ...incomingRecord.reportUrls]
      .map(obj => [`${obj.url}_${obj.date}_${obj.status}`, obj]))
      .values()
    ].sort((a, b) => moment(b.date).diff(moment(a.date)))

    // Minute URLs - merge unique and sort by date desc
    this.minutesUrls = [...new Map(
      [...this.minutesUrls, ...incomingRecord.minutesUrls]
      .map(obj => [`${obj.url}_${obj.date}_${obj.status}`, obj]))
      .values()
    ].sort((a, b) => moment(b.date).diff(moment(a.date)))

    // Location fields
    this.location.latitude = mergeSimpleField(this.location.latitude, incomingRecord.location.latitude, preferred)
    this.location.longitude = mergeSimpleField(this.location.longitude, incomingRecord.location.longitude, preferred)

    // System date fields
    this.createDate = this.createDate
    this.updateDate = new Date().toISOString()

    return preferred

  }

}

// Return one of the 2 strongs provided.
// If one string is null/empty, return the non-null strong. Otherwise, return based on priority.
function mergeSimpleField<T extends string | number | null>(thisString: T, incomingString: T, priority: 'this' | 'incoming') {
  if (thisString === null || thisString === undefined) {
    return incomingString
  }
  if (!incomingString === null || incomingString === undefined) {
    return thisString
  }
  if (priority === 'this') {
    return thisString
  }
  if (priority === 'incoming') {
    return incomingString
  }
  return null
}
