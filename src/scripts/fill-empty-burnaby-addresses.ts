import fs from 'fs'
import path from 'path'
import { RawRepository } from '../repositories/RawRepository'
import { IFullRezoningDetail, RezoningsRepository } from '../repositories/RezoningsRepository'
import { checkIfApplication, parseApplication } from '../rezonings/cities/Burnaby/Applications'
import { checkIfPublicHearing } from '../rezonings/cities/Burnaby/PublicHearings'
import { checkIfBylaw, parseBylaw } from '../rezonings/cities/Burnaby/Bylaws'
import { parsePublicHearing } from '../rezonings/cities/Burnaby/PublicHearings'

// STRATEGY: Get all meeting minute URLs for null address Burnaby rezonings, then fully re-analyze their rezonings
// After, take count, upsert, then remove all previous null addresses
(async () => {

  // const rezonings = await RezoningsRepository.getRezonings({city: 'Burnaby'})

  // const minuteUrlsWithNullAddressRezonings = rezonings.filter((item) => {
  //   const nullAddress = item.address === null
  //   return nullAddress
  // }).map((item) => item.minutesUrls).flat()
  // .map((item) => item.url)

  // // Get unique meeting minute URLS
  // const meetingMinuteUrls = [...new Set(minuteUrlsWithNullAddressRezonings)]

  // // Get all news with these minute URLs
  // const burnabyNews = RawRepository.getNews({city: 'Burnaby'})
  // const minutesToReAnalyze = burnabyNews.filter((item) => {
  //   return item.minutesUrl && meetingMinuteUrls.includes(item.minutesUrl)
  // })

  // // Start analyzing
  // const newRezonings: IFullRezoningDetail[] = []

  // for (const news of minutesToReAnalyze) {

  //   if (checkIfApplication(news)) {
  //     const applicationDetails = await parseApplication(news)
  //     if (applicationDetails) newRezonings.push(applicationDetails)
  //   }

  //   if (checkIfPublicHearing(news)) {
  //     const publicHearingDetails = await parsePublicHearing(news)
  //     if (publicHearingDetails) newRezonings.push(publicHearingDetails)
  //   }

  //   if (checkIfBylaw(news)) {
  //     const bylawDetails = await parseBylaw(news)
  //     if (bylawDetails) newRezonings.push(bylawDetails)
  //   }

  // }

  // console.log(newRezonings)
  // console.log(`New rezonings: ${newRezonings.length}`)

  // fs.writeFileSync(
  //   path.join(__dirname, './fill-empty-burnaby-addresses.json'),
  //   JSON.stringify(newRezonings, null, 2),
  //   'utf8'
  // )

  // Upsert all new rezonings
  // const newRezonings: IFullRezoningDetail[] = require('./fill-empty-burnaby-addresses.json')
  // RezoningsRepository.upsertRezonings(newRezonings)

  // Remove all null laddresses in Burnaby
  const allRezonings = RezoningsRepository.getRezonings({city: 'Burnaby'})
  const rezoningsWithAddresses = allRezonings.filter((item) => {
    return item.address !== null
  })
  RezoningsRepository.dangerouslyUpdateRezonings('Burnaby', rezoningsWithAddresses)

})()
