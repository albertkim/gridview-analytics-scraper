import chalk from 'chalk'
import moment from 'moment'
import { RecordsRepository } from '../repositories/RecordsRepositoryV2'

// Purpose: To find rezonings that don't have the correct dates given their meeting minute URL types
(async () => {

  const recordsRepository = new RecordsRepository('final')

  // City
  const rezonings = recordsRepository.getRecords('rezoning', {city: 'Vancouver'})

  // Application checks
  const applicationRezonings = rezonings
    .filter((r) => r.minutesUrls.some((u) => u.status === 'applied'))
    .filter((r) => !r.dates.appliedDate)

  // Public hearing checks
  const publicHearingRezonings = rezonings
    .filter((r) => r.minutesUrls.some((u) => u.status === 'public hearing'))
    .filter((r) => !r.dates.publicHearingDate)

  // Bylaw checks
  const bylawRezonings = rezonings
    .filter((r) => r.minutesUrls.some((u) => u.status === 'approved'))
    .filter((r) => !r.dates.approvalDate)

  console.log()
  console.log(`Rezonings with no applied date: ${chalk.white(applicationRezonings.length)}`)
  console.log(`Rezonings with no public hearing date: ${chalk.white(publicHearingRezonings.length)}`)
  console.log(`Rezonings with no approval date: ${chalk.white(bylawRezonings.length)}`)

  // Fill in correct dates

  publicHearingRezonings.forEach((r) => {
    const publicHearingMinutes = r.minutesUrls.filter((u) => u.status === 'public hearing')
    if (publicHearingMinutes.length > 0) {
      const latestDate = publicHearingMinutes
        .map((u) => u.date)
        .sort((a, b) => moment(a).diff(b))[0]
      r.dates.publicHearingDate = latestDate
    }
  })

  bylawRezonings.forEach((r) => {
    const approvalMinutes = r.minutesUrls.filter((u) => u.status === 'approved')
    if (approvalMinutes.length > 0) {
      const latestDate = approvalMinutes
        .map((u) => u.date)
        .sort((a, b) => moment(a).diff(b))[0]
      r.dates.approvalDate = latestDate
    }
  })

  // Update rezonings database
  // RezoningsRepository.upsertRezonings([...publicHearingRezonings, ...bylawRezonings])

})()
