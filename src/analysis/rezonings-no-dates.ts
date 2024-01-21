import chalk from 'chalk'
import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { checkIfApplication, parseApplication } from '../rezonings/cities/Vancouver/Applications'
import { checkIfBylaw } from '../rezonings/cities/Vancouver/Bylaws'
import { checkIfPublicHearing } from '../rezonings/cities/Vancouver/PublicHearings'
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

})()
