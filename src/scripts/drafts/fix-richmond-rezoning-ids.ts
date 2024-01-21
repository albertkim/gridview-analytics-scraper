import chalk from 'chalk'
import { RezoningsRepository } from '../../repositories/RezoningsRepository'
import { cleanRichmondRezoningId } from '../../rezonings/cities/Richmond/RichmondUtilities'

(async () => {

  const rezonings = RezoningsRepository.getRezonings()

  for (const rezoning of rezonings) {

    if (rezoning.city !== 'Richmond') continue
    if (!rezoning.rezoningId) continue

    const oldRezoningId = rezoning.rezoningId
    const newRezoningId = cleanRichmondRezoningId(rezoning.rezoningId)
    if (oldRezoningId !== newRezoningId) {
      console.log(chalk.bgGreen(`${oldRezoningId} -> ${newRezoningId}`))
      rezoning.rezoningId = newRezoningId
    }

  }

  // Bulk update
  RezoningsRepository.dangerouslyUpdateAllRezonings(rezonings)

})()
