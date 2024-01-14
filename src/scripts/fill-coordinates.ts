import chalk from 'chalk'
import dotenv from 'dotenv'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { Client } from '@googlemaps/google-maps-services-js'
import moment from 'moment'

(async () => {

  dotenv.config()

  const client = new Client({})

  const rezonings = RezoningsRepository.getRezonings()

  for (const rezoning of rezonings) {
    console.log(chalk.bgWhite(`Progress: ${rezonings.indexOf(rezoning) + 1}/${rezonings.length}`))
    
    if (!rezoning.address) continue
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

})()
