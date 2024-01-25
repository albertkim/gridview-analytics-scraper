import chalk from 'chalk'
import { IMeetingDetail, RawRepository } from '../../../repositories/RawRepository'
import { ISurreyMeetingItems, parseSurreyMeetingMinutes } from '../../../scraper/cities/Surrey/SurreyUtilities'
import { checkIfApplication, parseApplication } from './Applications'
import moment from 'moment'

export async function analyze(startDate: string | null, endDate: string | null) {

  const news = RawRepository.getNews({city: 'Surrey'})

  // // Get an land use meeting minutes and get the rezoning items
  // const landUseMinutes = news.filter((item) => {
  //   return item.title.toLowerCase().includes('planning report') && item.meetingType.toLowerCase() === 'regular council land use'
  // })

  // // Get unique meeting minute urls in order of appearance
  // const parsedLandUseMinutes: {url: string, landUseItems: ISurreyLandUseMinutesItems[]}[] = []
  // for (const item of landUseMinutes) {
  //   if (item.minutesUrl && !parsedLandUseMinutes.find((i) => i.url === item.minutesUrl)) {
  //     parsedLandUseMinutes.push({
  //       url: item.minutesUrl,
  //       landUseItems: await getSurreyLandUseMinutes(item.minutesUrl)
  //     })
  //   }
  // }

  // // Check that all planning IDs are included in their respective minutes
  // landUseMinutes.forEach((item) => {
  //   const permitNumber = item.title.replace('Planning Report', '').trim()
  //   const matchingLandUseMinute = parsedLandUseMinutes.find((i) => i.url === item.minutesUrl)
  //   if (matchingLandUseMinute) {
  //     matchingLandUseMinute.landUseItems.find((i) => i.content.includes(permitNumber))
  //     console.log(chalk.green(`Match for ${permitNumber}`))
  //   } else {
  //     console.log(chalk.red(`No match for ${permitNumber}`))
  //   }
  // })

  const validLists: IMeetingDetail[] = []

  for (const n of news) {
    const isRezoningType = await checkIfApplication(n)
    let isInDateRange = true
    if (startDate && moment(n.date).isBefore(startDate)) {
      isInDateRange = false
    }
    if (endDate && moment(n.date).isSameOrAfter(endDate)) {
      isInDateRange = false
    }
    if (isRezoningType && isInDateRange) {
      validLists.push(n)
    }
  }

  for (let i = 0; i < validLists.length; i++) {

    console.log(chalk.bgWhite(`Analyzing ${i + 1}/${validLists.length} - Surrey`))

    const news = validLists[i]

    if (await checkIfApplication(news)) {
      const applicationDetails = await parseApplication(news)
      if (applicationDetails) {
        console.log(applicationDetails)
      }
    }

  }

  // Applications

  // Public hearings

  // Bylaws

}

analyze('2023-12-01', '2024-01-24')
