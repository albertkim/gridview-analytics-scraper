import chalk from 'chalk'
import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { checkIfApplication, parseApplication } from '../rezonings/cities/Vancouver/Applications'
import { checkIfBylaw } from '../rezonings/cities/Vancouver/Bylaws'
import { checkIfPublicHearing } from '../rezonings/cities/Vancouver/PublicHearings'
import moment from 'moment'

// Purpose: To find rezonings that don't have the correct dates given their meeting minute URL types
(async () => {

  // City
  const rezonings = RezoningsRepository.getRezonings({city: 'Vancouver'})

  // Application checks
  const applicationRezonings = rezonings
    .filter((r) => r.minutesUrls.some((u) => u.type === 'applied'))
    .filter((r) => !r.dates.appliedDate)

  // Public hearing checks
  const publicHearingRezonings = rezonings
    .filter((r) => r.minutesUrls.some((u) => u.type === 'public hearing'))
    .filter((r) => !r.dates.publicHearingDate)

  // Bylaw checks
  const bylawRezonings = rezonings
    .filter((r) => r.minutesUrls.some((u) => u.type === 'approved'))
    .filter((r) => !r.dates.approvalDate)

  console.log()
  console.log(`Rezonings with no applied date: ${chalk.white(applicationRezonings.length)}`)
  console.log(`Rezonings with no public hearing date: ${chalk.white(publicHearingRezonings.length)}`)
  console.log(`Rezonings with no approval date: ${chalk.white(bylawRezonings.length)}`)

  // Fill in correct dates

  publicHearingRezonings.forEach((r) => {
    const publicHearingMinutes = r.minutesUrls.filter((u) => u.type === 'public hearing')
    if (publicHearingMinutes.length > 0) {
      const latestDate = publicHearingMinutes
        .map((u) => u.date)
        .sort((a, b) => moment(a).diff(b))[0]
      r.dates.publicHearingDate = latestDate
    }
  })

  bylawRezonings.forEach((r) => {
    const approvalMinutes = r.minutesUrls.filter((u) => u.type === 'approved')
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
