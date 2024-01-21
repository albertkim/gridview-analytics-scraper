import moment from 'moment'
import { RawRepository } from '../../repositories/RawRepository'
import { RezoningsRepository } from '../../repositories/RezoningsRepository'
import { checkIfApplication } from '../../rezonings/cities/Vancouver/Applications'
import { checkIfBylaw } from '../../rezonings/cities/Vancouver/Bylaws'
import chalk from 'chalk'

/**
 * Jan 14, 2023
 * This script was made to fill in missing applied dates mainly for Richmond rezonings. We do that by comparing the rezoning urls with the news urls to see which ones are applications/bylaw approvals, then updating the dates.
 * The issue originally happened from buggy rezoning analysis code.
 * There is also a Richmond version of this script.
 */

(async () => {

  const news = RawRepository.getNews()
  const rezonings = RezoningsRepository.getRezonings()

  for (const rezoning of rezonings) {

    if (rezoning.city !== 'Vancouver') continue
      
    let appliedDate: string | null = null
    let approvalDate: string | null = null

    for (const urlObject of rezoning.urls) {

      // Get news where the reportURL includes the rezoning URL
      const matchingRawNews = news.filter(newsEntry => newsEntry.reportUrls.map((r) => r.url).includes(urlObject.url))

      for (const newsEntry of matchingRawNews) {
        if (checkIfApplication(newsEntry)) {
          appliedDate = moment(newsEntry.date).format('YYYY-MM-DD')
        } else if (checkIfBylaw(newsEntry)) {
          approvalDate = moment(newsEntry.date).format('YYYY-MM-DD')
        }
      }

    }

    if (rezoning.dates.appliedDate !== appliedDate) {
      const message = `${rezoning.id} applied date: ${rezoning.dates.appliedDate} -> ${appliedDate}`
      if (!rezoning.dates.appliedDate) {
        console.log(chalk.bgGreen(message))
        rezoning.dates.appliedDate = appliedDate
        rezoning.updateDate = moment().format('YYYY-MM-DD')
      }
    }

    if (rezoning.dates.approvalDate !== approvalDate) {
      const message = `${rezoning.id} approval date: ${rezoning.dates.approvalDate} -> ${approvalDate}`
      if (!rezoning.dates.approvalDate) {
        console.log(chalk.bgGreen(message))
        rezoning.dates.approvalDate = approvalDate
        rezoning.updateDate = moment().format('YYYY-MM-DD')
      }
    }

  }

  // Bulk update
  RezoningsRepository.dangerouslyUpdateAllRezonings(rezonings)

})()
