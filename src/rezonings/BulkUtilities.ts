import chalk from 'chalk'
import moment from 'moment'
import { Client } from '@googlemaps/google-maps-services-js'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { cleanRichmondRezoningId } from './cities/Richmond/RichmondUtilities'
import { chatGPTTextQuery, getGPTBaseRezoningStatsQuery } from './AIUtilities'

export const BulkUtilities = {

  async bulkUpdateStats() {

    const rezonings = RezoningsRepository.getRezonings()

    for (const rezoning of rezonings) {
      const GPTStats = await chatGPTTextQuery(getGPTBaseRezoningStatsQuery(rezoning.description), '4')
      if (GPTStats) {
        rezoning.stats = GPTStats
        rezoning.updateDate = moment().format('YYYY-MM-DD')
      }
    }

    RezoningsRepository.dangerouslyUpdateAllRezonings(rezonings)

  },

  async bulkAddCoordinates() {

    const client = new Client({})

    const rezonings = RezoningsRepository.getRezonings()
  
    for (const rezoning of rezonings) {
      console.log(chalk.bgWhite(`Progress: ${rezonings.indexOf(rezoning) + 1}/${rezonings.length}`))
      
      if (!rezoning.address) continue
      // Correct any potential issues with undefined locations
      if (!rezoning.location) {
        console.log(chalk.yellow(`Undefined coordinates corrected ${rezoning.address}, ${rezoning.city} `))
        rezoning.location = {
          latitude: null,
          longitude: null
        }
      }
      if (rezoning.location.latitude && rezoning.location.longitude) continue
  
      // Use Google Maps API to get coordinates
      const response = await client.geocode({
        params: {
          address: `${rezoning.address}, ${rezoning.city}`,
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      })
  
      if (response.data.results.length === 0) {
        console.log(`No coordinates found for ${rezoning.address}, ${rezoning.city} `)
        continue
      }
  
      const coordinates = response.data.results[0].geometry.location
      rezoning.location.latitude = coordinates.lat
      rezoning.location.longitude = coordinates.lng
      rezoning.updateDate = moment().format('YYYY-MM-DD')
  
      const message = `${rezoning.id} coordinates: ${rezoning.location.latitude}, ${rezoning.location.longitude}`
      if (!rezoning.location.latitude || !rezoning.location.longitude) {
        console.log(chalk.bgGreen(message))
      } else {
        console.log(chalk.bgWhite(message))
      }
  
      RezoningsRepository.dangerouslyUpdateAllRezonings(rezonings)
    }

  },

  bulkCleanDates() {

    const rezonings = RezoningsRepository.getRezonings()
  
    rezonings.forEach((rezoning) => {
  
      // Fill in any missing date fields
      if (rezoning.dates.appliedDate === undefined) {
        console.log(chalk.bgWhite(`Filled in missing applied date`))
        rezoning.dates.appliedDate = null
      }
      if (rezoning.dates.publicHearingDate === undefined) {
        console.log(chalk.bgWhite(`Filled in missing public hearing date`))
        rezoning.dates.publicHearingDate = null
      }
      if (rezoning.dates.approvalDate === undefined) {
        console.log(chalk.bgWhite(`Filled in missing approval date`))
        rezoning.dates.approvalDate = null
      }
      if (rezoning.dates.denialDate === undefined) {
        console.log(chalk.bgWhite(`Filled in missing denial date`))
        rezoning.dates.denialDate = null
      }
      if (rezoning.dates.withdrawnDate === undefined) {
        console.log(chalk.bgWhite(`Filled in missing withdrawn date`))
        rezoning.dates.withdrawnDate = null
      }
  
      // Clean and format dates in the url field
      rezoning.urls.forEach((url) => {
        if (url.date && !moment(url.date, 'YYYY-MM-DD', true).isValid()) {
          const formattedDate = moment(new Date(url.date)).format('YYYY-MM-DD')
          console.log(chalk.bgWhite(`Reformatted url date: ${url.date} => ${formattedDate}`))
          url.date = formattedDate
        }
      })
  
      // Clean and format dates in the minutes url field
      rezoning.minutesUrls.forEach((url) => {
        if (url.date && !moment(url.date, 'YYYY-MM-DD', true).isValid()) {
          const formattedDate = moment(new Date(url.date)).format('YYYY-MM-DD')
          console.log(chalk.bgWhite(`Reformatted minutes url date: ${url.date} => ${formattedDate}`))
          url.date = formattedDate
        }
      })
  
      if (rezoning.status === 'applied') {
        if (!rezoning.dates.appliedDate) {
          // Go through the rezoning url list and get the earliest available date
          let earliestDate: string | null = null
          if (rezoning.urls) {
            rezoning.urls.forEach((url) => {
              if (url.date) {
                if (!earliestDate || moment(url.date).isBefore(earliestDate)) {
                  earliestDate = url.date
                }
              }
            })
          }
          if (earliestDate) {
            console.log(chalk.bgGreen(`Updated applied date: ${earliestDate}`))
          }
          rezoning.dates.appliedDate = earliestDate
        }
      }
  
      if (rezoning.status === 'approved') {
        if (!rezoning.dates.approvalDate) {
          // Go through the rezoning url list and get the latest available date
          let latestDate: string | null = null
          if (rezoning.urls) {
            rezoning.urls.forEach((url) => {
              if (url.date) {
                if (!latestDate || moment(url.date).isBefore(latestDate)) {
                  latestDate = url.date
                }
              }
            })
          }
          if (latestDate) {
            console.log(chalk.bgGreen(`Updated approval date: ${latestDate}`))
          }
          rezoning.dates.approvalDate = latestDate
        }
      }
  
    })
  
    RezoningsRepository.dangerouslyUpdateAllRezonings(rezonings)
  
  },

  bulkCleanRichmondRezoningIDs() {

    // Always format Richmond rezoning IDs as RZ 12-123456
    function checkRezoningId(rezoningId: string): boolean {
      return /^RZ\s+\d{2}-\d{6}$/.test(rezoningId)
    }
  
    const rezonings = RezoningsRepository.getRezonings({city: 'Richmond'})
  
    rezonings.forEach((rezoning) => {
  
      if (rezoning.rezoningId) {
        const correct = checkRezoningId(rezoning.rezoningId)
        if (!correct) {
          const formattedRezoningId = cleanRichmondRezoningId(rezoning.rezoningId)
          if (formattedRezoningId) {
            console.log(chalk.bgGreen(`Reformatted rezoning ID: ${rezoning.rezoningId} => ${formattedRezoningId}`))
            rezoning.rezoningId = formattedRezoningId
          } else {
            console.log(chalk.bgRed(`Invalid rezoning ID: ${rezoning.rezoningId}, clearing...`))
            rezoning.rezoningId = null
          }
          rezoning.updateDate = moment().format('YYYY-MM-DD')
        }
      }
  
    })
  
    // Save the rezonings back to the database
    RezoningsRepository.dangerouslyUpdateRezonings('Richmond', rezonings)
  
  }

}
