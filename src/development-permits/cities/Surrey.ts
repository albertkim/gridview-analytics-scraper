import moment from 'moment'
import { RawRepository } from '../../repositories/RawRepository'

interface IOptions {
  startDate: string | null
  endDate: string | null
  headless?: boolean | 'new'
}

// Development permits are mentioned in scraped city council meetings
async function scrape(options: IOptions) {

  const news = await RawRepository.getNews({city: 'Surrey'})

  // Filter by date and development permits
  const filteredNews = news
    .filter((n) => {
      // Check contents and make sure it includes "development permit", case-insensitive
      const regex = /development\s*permit/i
      return regex.test(n.contents)
    })
    .filter((n) => {
      if (options.startDate) {
        if (moment(n.date).isBefore(options.startDate!)) {
          return false
        }
      }
      if (options.endDate) {
        if (moment(n.date).isSameOrAfter(options.endDate!)) {
          return false
        }
      }
      return true
    })

  return filteredNews

}

export async function analyze(options: IOptions) {

  const developmentPermits = await scrape(options)

  // TODO: For each development permit item, check to see if the development permit is for a new building. If so, add to database.
  // Have to wait for the RezoningsRepository to be refactored first.

}
