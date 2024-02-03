import chalk from 'chalk'
import moment from 'moment'
import { Client } from '@googlemaps/google-maps-services-js'
import { RecordsRepository } from '../repositories/RecordsRepository'
import { cleanRichmondRezoningId } from './cities/Richmond/RichmondUtilities'
import { chatGPTJSONQuery, getGPTBaseRezoningStatsQuery } from './AIUtilities'

export const BulkUtilities = {

  async bulkUpdateStats() {

    const rezonings = RecordsRepository.getRecords('rezoning')

    for (const rezoning of rezonings) {
      const GPTStats = await chatGPTJSONQuery(getGPTBaseRezoningStatsQuery(rezoning.description), '4')
      if (GPTStats) {
        rezoning.stats = GPTStats
        rezoning.updateDate = moment().format('YYYY-MM-DD')
      }
    }

    RecordsRepository.dangerouslyUpdateAllRecords('rezoning', rezonings)

  },

  async bulkAddCoordinates() {

    const client = new Client({})

    const records = RecordsRepository.getRecords('all')
  
    for (const record of records) {
      
      if (!record.address) continue
      // Correct any potential issues with undefined locations
      if (!record.location) {
        console.log(chalk.yellow(`Undefined coordinates corrected ${record.address}, ${record.city} `))
        record.location = {
          latitude: null,
          longitude: null
        }
      }
      if (record.location.latitude && record.location.longitude) continue
  
      // Use Google Maps API to get coordinates
      const response = await client.geocode({
        params: {
          address: `${record.address}, ${record.city}`,
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      })
  
      if (response.data.results.length === 0) {
        console.log(`No coordinates found for ${record.address}, ${record.city} `)
        continue
      }
  
      const coordinates = response.data.results[0].geometry.location
      record.location.latitude = coordinates.lat
      record.location.longitude = coordinates.lng
      record.updateDate = moment().format('YYYY-MM-DD')
  
      const message = `${record.id} coordinates: ${record.location.latitude}, ${record.location.longitude}`
      if (!record.location.latitude || !record.location.longitude) {
        console.log(chalk.bgGreen(message))
      } else {
        console.log(chalk.bgWhite(message))
      }
  
      RecordsRepository.dangerouslyUpdateAllRecords('all', records)
    }

  }

}
