import chalk from 'chalk'
import { RawRepository } from '../repositories/RawRepository'
import moment from 'moment'

export const BulkUtilities = {

  bulkCleanDate() {

    const news = RawRepository.getNews()

    news.forEach((n) => {

      // Clean and format dates in the url field
      if (n.date && !moment(n.date, 'YYYY-MM-DD', true).isValid()) {
        const formattedDate = moment(new Date(n.date)).format('YYYY-MM-DD')
        console.log(chalk.bgWhite(`Reformatted url date: ${n.date} => ${formattedDate}`))
        n.date = formattedDate
      }

    })

    RawRepository.dangerouslyUpdateAllNews(news)

  }

}
