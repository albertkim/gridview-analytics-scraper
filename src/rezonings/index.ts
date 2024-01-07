import { analyze as analyzeVancouver } from './Vancouver'
import { analyze as analyzeRichmond } from './Richmond'

const citiesToAnalyze = [
  'Vancouver',
  // 'Richmond',
]

async function main() {

  if (citiesToAnalyze.includes('Vancouver')) {
    await analyzeVancouver()
  }

  if (citiesToAnalyze.includes('Richmond')) {
    await analyzeRichmond()
  }

}

main()
