import chalk from 'chalk'
import { analyze as analyzeVancouver } from './cities/Vancouver'
import { analyze as analyzeRichmond } from './cities/Richmond'
import { analyze as analyzeBurnaby } from './cities/Burnaby'
import { analyze as analyzeSurrey } from './cities/Surrey'

// yarn run development-permit
const startDate = '2024-01-01'
const endDate = '2024-02-01'
const citiesToAnalyze: string[] = [
  // 'Vancouver',
  // 'Richmond',
  'Burnaby',
  // 'Surrey'
]

async function main() {

  if (citiesToAnalyze.includes('Vancouver')) {
    console.log(chalk.bgWhite(`Analyzing development permits for Vancouver`))
    await analyzeVancouver({startDate: startDate, endDate: endDate})
  }

  if (citiesToAnalyze.includes('Richmond')) {
    console.log(chalk.bgWhite(`Analyzing development permits for Richmond`))
    await analyzeRichmond({startDate: startDate, endDate: endDate})
  }

  if (citiesToAnalyze.includes('Burnaby')) {
    console.log(chalk.bgWhite(`Analyzing development permits for Burnaby`))
    await analyzeBurnaby({startDate: startDate, endDate: endDate})
  }

  if (citiesToAnalyze.includes('Surrey')) {
    console.log(chalk.bgWhite(`Analyzing development permits for Surrey`))
    await analyzeSurrey({startDate: startDate, endDate: endDate})
  }

  // Check in drafts with the command
  // But first make sure to check in the current code to GitHub so that you can see the changes and make debugging easier
  // yarn run check-in

  process.exit(0)

}

main()
