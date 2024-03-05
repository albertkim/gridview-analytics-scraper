import chalk from 'chalk'
import { analyze as analyzeVancouver } from './cities/Vancouver'
import { analyze as analyzeRichmond } from './cities/Richmond'
import { analyze as analyzeBurnaby } from './cities/Burnaby'
import { analyze as analyzeSurrey } from './cities/Surrey'
import { getArgs } from '../utilities/CommandLineUtilities'

// yarn run development-permit

const availableCities: string[] = [
  'Vancouver',
  'Richmond',
  'Burnaby',
  'Surrey'
]

const args = getArgs(availableCities)

async function main() {

  if (args.cities.includes('Vancouver')) {
    console.log(chalk.bgWhite(`Analyzing development permits for Vancouver`))
    await analyzeVancouver({startDate: args.startDate, endDate: args.endDate})
  }

  if (args.cities.includes('Richmond')) {
    console.log(chalk.bgWhite(`Analyzing development permits for Richmond`))
    await analyzeRichmond({startDate: args.startDate, endDate: args.endDate})
  }

  if (args.cities.includes('Burnaby')) {
    console.log(chalk.bgWhite(`Analyzing development permits for Burnaby`))
    await analyzeBurnaby({startDate: args.startDate, endDate: args.endDate})
  }

  if (args.cities.includes('Surrey')) {
    console.log(chalk.bgWhite(`Analyzing development permits for Surrey`))
    await analyzeSurrey({startDate: args.startDate, endDate: args.endDate})
  }

  // Check in drafts with the command
  // But first make sure to check in the current code to GitHub so that you can see the changes and make debugging easier
  // yarn run check-in

  process.exit(0)

}

main()
