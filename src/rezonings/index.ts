import moment from 'moment'
import { analyze as analyzeVancouver } from './Vancouver'
import { analyze as analyzeRichmond } from './Richmond'

const startDate = null
const endDate = null
const citiesToAnalyze = [
  // 'Vancouver',
  'Richmond'
]

async function main() {

  if (citiesToAnalyze.includes('Vancouver')) {
    await analyzeVancouver(startDate, endDate)
  }

  if (citiesToAnalyze.includes('Richmond')) {
    await analyzeRichmond(startDate, endDate)
  }

}

main()
