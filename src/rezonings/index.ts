import moment from 'moment'
import { analyze as analyzeVancouver } from './cities/Vancouver'
import { analyze as analyzeRichmond } from './cities/Richmond'
import { getStatistics } from './StatisticsUtilities'
import {  } from './BulkUtilities'

const startDate = null
const endDate = null
const citiesToAnalyze: string[] = [
  // 'Vancouver',
  // 'Richmond'
]

async function main() {

  if (citiesToAnalyze.includes('Vancouver')) {
    await analyzeVancouver(startDate, endDate)
  }

  if (citiesToAnalyze.includes('Richmond')) {
    await analyzeRichmond(startDate, endDate)
  }

  getStatistics()

}

main()
