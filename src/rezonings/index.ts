import { analyze as analyzeVancouver } from './cities/Vancouver'
import { analyze as analyzeRichmond } from './cities/Richmond'
import { analyze as analyzeBurnaby } from './cities/Burnaby'
import { analyze as analyzeSurrey } from './cities/Surrey'
import { getArgs } from '../utilities/CommandLineUtilities'

// yarn run rezone

const availableCities: string[] = [
  'Vancouver',
  'Richmond',
  'Burnaby',
  'Surrey'
]

const args = getArgs(availableCities)

async function main() {

  if (args.cities.includes('Vancouver')) {
    await analyzeVancouver(args.startDate, args.endDate)
  }

  if (args.cities.includes('Richmond')) {
    await analyzeRichmond(args.startDate, args.endDate)
  }

  if (args.cities.includes('Burnaby')) {
    await analyzeBurnaby(args.startDate, args.endDate)
  }

  if (args.cities.includes('Surrey')) {
    await analyzeSurrey(args.startDate, args.endDate)
  }

  // BulkUtilities.bulkAddCoordinates()
  // getStatistics()

}

main()
