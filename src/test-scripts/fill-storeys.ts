import chalk from 'chalk'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { chatGPTTextQuery } from '../rezonings/AIUtilities'

(async () => {

  const rezonings = RezoningsRepository.getRezonings()

  for (let i = 0; i < rezonings.length; i++) {
    console.log(chalk.bgWhite(`Progress: ${i + 1}/${rezonings.length}`))
    const rezoning = rezonings[i]
    if (rezoning.description.toLowerCase().includes('storey')) {
      const gptResponse = await chatGPTTextQuery(`
        Given the following description, do your best to figure out how many storeys are being proposed. If there are multiple, return the biggest one. If not specified, return a null value. Give data in the following JSON format:
        {
          storeys: number | null
        }
        ${rezoning.description}
      `)
      if (gptResponse && !gptResponse.error && gptResponse.storeys) {
        console.log(chalk.bgGreen(`Adding ${gptResponse.storeys} storeys to ${rezoning.address}`))
        rezoning.stats.storeys = gptResponse.storeys
      }
    }
  }

  RezoningsRepository.dangerouslyUpdateAllRezonings(rezonings)

})()
