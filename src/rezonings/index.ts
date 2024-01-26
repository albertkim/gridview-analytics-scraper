import { analyze as analyzeVancouver } from './cities/Vancouver'
import { analyze as analyzeRichmond } from './cities/Richmond'
import { analyze as analyzeBurnaby } from './cities/Burnaby'
import { analyze as analyzeSurrey } from './cities/Surrey'
import { getStatistics } from './StatisticsUtilities'
import { BulkUtilities } from './BulkUtilities'

// yarn run rezone
const startDate = '2024-01-24'
const endDate = '2023-01-21'
const citiesToAnalyze: string[] = [
  // 'Vancouver',
  // 'Richmond',
  // 'Burnaby'
  'Surrey'
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

  if (citiesToAnalyze.includes('Surrey')) {
    await analyzeSurrey(startDate, endDate)
  }

  BulkUtilities.bulkAddCoordinates()
  getStatistics()

}

main()
