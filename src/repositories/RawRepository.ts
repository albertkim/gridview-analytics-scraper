import fs from 'fs'
import path from 'path'
import moment from 'moment'

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
      return 1
    }
    if (dateA.isAfter(dateB)) {
      return -1
    }
    return 0
  })
}

export const RawRepository = {

  getNews(filter?: {city?: string}) {
    
    const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../database/raw.json'), 'utf8')) as IMeetingDetail[]
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

  // Replaces all news with the same city
  dangerouslyUpdateNews(city: string, news: IMeetingDetail[], dateOptions?: {startDate: string, endDate: string}) {
    const previousEntries = this.getNews()
    // Remove all entries with the same city and are in the date range if specified
    const filteredData = previousEntries.filter((item) => {
      const isCityMatching = item.city === city
      let isInDateRange = true
      if (dateOptions) {
        isInDateRange = moment(item.date).isBetween(moment(dateOptions.startDate), moment(dateOptions.endDate))
      }
      return !(isCityMatching && isInDateRange)
    })
    const orderedData = reorderItems([...filteredData, ...news])
    fs.writeFileSync(
      path.join(__dirname, '../database/raw.json'),
      JSON.stringify(orderedData, null, 2),
      'utf8'
    )
  },

  // Add news to the database but ignore ones with the same city/date/meeting type
  upsertNews(news: IMeetingDetail[]) {
    const previousEntries = this.getNews()
    const onlyNewEntries = news.filter((item) => {
      const matchingPreviousEntry = previousEntries.find((entry) => {
        const sameCity = entry.city === item.city
        const sameDate = entry.date === item.date
        const sameMeetingType = entry.meetingType === item.meetingType
        return sameCity && sameDate && sameMeetingType
      })
      return matchingPreviousEntry ? false : true
    })
    const orderedData = reorderItems([...previousEntries, ...onlyNewEntries])
    fs.writeFileSync(
      path.join(__dirname, '../database/raw.json'),
      JSON.stringify(orderedData, null, 2),
      'utf8'
    )
  },

  // Replaces all news
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
