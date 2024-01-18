import { analyze as analyzeVancouver } from './cities/Vancouver'
import { analyze as analyzeRichmond } from './cities/Richmond'
import { analyze as analyzeBurnaby } from './cities/Burnaby'
import { getStatistics } from './StatisticsUtilities'

// yarn run rezone
const startDate = '2023-01-01'
const endDate = '2024-01-18'
const citiesToAnalyze: string[] = [
  'Vancouver',
  // 'Richmond',
  // 'Burnaby'
]

async function main() {

  if (citiesToAnalyze.includes('Vancouver')) {
    await analyzeVancouver(startDate, endDate)
  }

  if (citiesToAnalyze.includes('Richmond')) {
    await analyzeRichmond(startDate, endDate)
  }

  if (citiesToAnalyze.includes('Burnaby')) {
    await analyzeBurnaby(startDate, endDate)
  }

  getStatistics()

}

main()
