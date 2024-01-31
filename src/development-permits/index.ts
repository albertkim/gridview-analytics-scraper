import { analyze as analyzeVancouver } from './cities/Vancouver'
import { analyze as analyzeRichmond } from './cities/Richmond'
import { analyze as analyzeBurnaby } from './cities/Burnaby'
import { analyze as analyzeSurrey } from './cities/Surrey'

// yarn run development-permit
const startDate = '2019-01-01'
const endDate = '2023-01-01'
const citiesToAnalyze: string[] = [
  // 'Vancouver',
  // 'Richmond',
  'Burnaby'
  // 'Surrey'
]

async function main() {

  if (citiesToAnalyze.includes('Vancouver')) {
    await analyzeVancouver({startDate: startDate, endDate: endDate})
  }

  if (citiesToAnalyze.includes('Richmond')) {
    await analyzeRichmond({startDate: startDate, endDate: endDate})
  }

  if (citiesToAnalyze.includes('Burnaby')) {
    await analyzeBurnaby({startDate: startDate, endDate: endDate})
  }

  if (citiesToAnalyze.includes('Surrey')) {
    await analyzeSurrey({startDate: startDate, endDate: endDate})
  }

}

main()
