import fs from 'fs'
import path from 'path'
import moment from 'moment'
import '../database/raw.json'

export interface IMeetingDetail {
  city: string
  metroCity: string | null
  url: string
  date: string // YYYY-MM-DD
  meetingType: string
  title: string
  resolutionId: string | null
  contents: string
  minutesUrl: string | null
  reportUrls: Array<{
    title: string
    url: string
  }>
}

function reorderItems(items: IMeetingDetail[]) {
  return items.sort((a, b) => {
    const dateA = moment(a.date, 'YYYY-MM-DD')
    const dateB = moment(b.date, 'YYYY-MM-DD')
    
    if (dateA.isBefore(dateB)) {
      return -1
    }
    if (dateA.isAfter(dateB)) {
      return 1
    }
    return 0
  })
}

export const RawRepository = {

  getNews(filter?: {city?: string}) {
    const rawData = require('../database/raw.json') as IMeetingDetail[]
    if (filter?.city) {
      return rawData.filter((item) => item.city === filter.city)
    } else {
      return rawData
    }
  },

  getLatestDate(city: string) {
    const news = this.getNews({city: city})
    if (news.length > 0) {
      return news[0].date
    } else {
      return null
    }
  },

  updateNews(city: string, news: IMeetingDetail[]) {
    const previousEntries = this.getNews()
    const filteredData = previousEntries.filter((item) => item.city !== city)
    const newData = reorderItems([...filteredData, ...news])
    fs.writeFileSync(
      path.join(__dirname, '../database/raw.json'),
      JSON.stringify(newData, null, 2),
      'utf8'
    )
    return this.getNews({city: city})
  },

  dangerouslyUpdateAllNews(news: IMeetingDetail[]) {
    const orderedMeetingDetails = reorderItems(news)
    fs.writeFileSync(
      path.join(__dirname, '../database/raw.json'),
      JSON.stringify(orderedMeetingDetails, null, 2),
      'utf8'
    )
    return this.getNews()
  }

}
