import chalk from 'chalk'
import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { checkIfApplication, parseApplication } from '../rezonings/cities/Vancouver/Applications'
import { checkIfBylaw } from '../rezonings/cities/Vancouver/Bylaws'
import { checkIfPublicHearing, parsePublicHearing } from '../rezonings/cities/Vancouver/PublicHearings'

// Purpose: For a given city, find how many of the rezoning-checked news items are not in the rezonings database
// Accomplish that by checking for existance of the minutes URL
// Change cities by updating the city variables below and the city imports above
// If you want to add them to the database, parse the respective news type, then call the RezoningsRepository.upsertRezonings() function
(async () => {

  // City
  const news = RawRepository.getNews({city: 'Vancouver'})
  const rezonings = RezoningsRepository.getRezonings({city: 'Vancouver'})

  // Application checks
  const applicationNews = news.filter((n) => checkIfApplication(n))
  const noApplicationNews = applicationNews.filter((n) => {
    return !rezonings.find((r) => r.minutesUrls.some((u) => u.url === n.minutesUrl))
  })

  // Public hearing checks
  const publicHearingNews = news.filter((n) => checkIfPublicHearing(n))
  const noPublicHearingNews = publicHearingNews.filter((n) => {
    return !rezonings.find((r) => r.minutesUrls.some((u) => u.url === n.minutesUrl))
  })

  // Bylaw checks
  const bylawNews = news.filter((n) => checkIfBylaw(n))
  const noBylawNews = bylawNews.filter((n) => {
    return !rezonings.find((r) => r.minutesUrls.some((u) => u.url === n.minutesUrl))
  })

  console.log()
  console.log(`Application news items with no rezonings: ${chalk.white(noApplicationNews.length)}`)
  noApplicationNews.forEach((n) => {
    console.log(chalk.yellow(n.date) + ' ' + chalk.yellow(n.title) + ' ' + chalk.white(n.minutesUrl))
  })
  console.log()
  console.log(`Public hearing news items with no rezonings: ${chalk.white(noPublicHearingNews.length)}`)
  noPublicHearingNews.forEach((n) => {
    console.log(chalk.yellow(n.date) + ' ' + chalk.yellow(n.title) + ' ' + chalk.white(n.minutesUrl))
  })
  console.log()
  console.log(`Bylaw news items with no rezonings: ${chalk.white(noBylawNews.length)}`)
  noBylawNews.forEach((n) => {
    console.log(chalk.yellow(n.date) + ' ' + chalk.white(n.minutesUrl))
  })
  console.log()

  // Update rezonings database
  for (const n of noPublicHearingNews) {
    const parsed = await parsePublicHearing(n)
    if (parsed) {
      await RezoningsRepository.upsertRezonings([parsed])
    }
  }

})()
