import moment from 'moment'
import { analyze as analyzeVancouver } from './cities/Vancouver'
import { analyze as analyzeRichmond } from './cities/Richmond'
import { analyze as analyzeBurnaby } from './cities/Burnaby'
import { getStatistics } from './StatisticsUtilities'

const startDate = null
const endDate = null
const citiesToAnalyze: string[] = [
  // 'Vancouver',
  // 'Richmond'
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
