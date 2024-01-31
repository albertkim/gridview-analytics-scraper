import chalk from 'chalk'
import { RezoningsRepository } from '../../repositories/RezoningsRepository'
import { cleanRichmondRezoningId } from '../../rezonings/cities/Richmond/RichmondUtilities'

(async () => {

  const rezonings = RezoningsRepository.getRezonings()

  for (const rezoning of rezonings) {

    if (rezoning.city !== 'Richmond') continue
    if (!rezoning.applicationId) continue

    const oldRezoningId = rezoning.applicationId
    const newRezoningId = cleanRichmondRezoningId(rezoning.applicationId)
    if (oldRezoningId !== newRezoningId) {
      console.log(chalk.bgGreen(`${oldRezoningId} -> ${newRezoningId}`))
      rezoning.applicationId = newRezoningId
    }

  }

  // Bulk update
  RezoningsRepository.dangerouslyUpdateAllRezonings(rezonings)

})()
