import chalk from 'chalk'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { cleanRichmondRezoningId } from './cities/RichmondUtilities'

export async function bulkCleanDates() {

  const rezonings = RezoningsRepository.getRezonings()

  rezonings.forEach((rezoning) => {

  })

}

// Bulk operation
export async function bulkCleanRichmondRezoningIDs() {

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
      }
    }

  })

  // Save the rezonings back to the database
  RezoningsRepository.updateRezonings('Richmond', rezonings)

}
