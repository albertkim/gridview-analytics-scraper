import chalk from 'chalk'
import moment from 'moment'

interface ArgValues {
  startDate: string    // Inclusive (reads from this date, including this date): YYYY-MM-DD
  endDate: string      // Exclusive (reads up to just before date): YYYY-MM-DD
  headless: boolean
  cities: string[]
}

// Ex: yarn run rezone 2024-03-01 2020-04-01 --headless=false
export function getArgs(availableCities: string[]): ArgValues {

  const args = process.argv.slice(2)

  // First argument should be start date in YYYY-MM-DD format
  const startDate: string | undefined = args[0]
  if (!startDate) {
    console.error('Invalid start date - please provide a start date in the format YYYY-MM-DD as the first parameter')
    process.exit(1)
  }

  console.log(chalk.yellow(`Start date: ${startDate}`))

  // Second argument should be end date in YYYY-MM-DD format or the word "now"
  let endDate: string | undefined = args[1]
  if (!endDate || endDate !== 'now') {
    console.error('Invalid end date - please provide an end date in the format YYYY-MM-DD or the word "now" as the second parameter')
    process.exit(1)
  }

  if (endDate === 'now') {
    endDate = moment().format('YYYY-MM-DD')
  }

  console.log(chalk.yellow(`End date: ${endDate}`))

  // Third argument is optional and can be --headless=true or --headless=false
  let headless: boolean = true
  if (args[2]) {
    const headlessArg = args[2].split('=')
    if (headlessArg[0] === '--headless' && (headlessArg[1] === 'true' || headlessArg[1] === 'false')) {
      headless = headlessArg[1] === 'true'
    }
  }

  console.log(chalk.yellow(`Headless: ${headless}`))

  // All values after the optional 3rd value is a list of cities to analyze (ex. "Los Angeles", "Vancouver")
  let citiesStartIndex = 2
  if (args[2].startsWith('--headless')) {
    citiesStartIndex = 3 // Cities start at the 4th argument if headless is specified
  }

  let cities: string[] = args.slice(citiesStartIndex).map(city => city.replace('"', '').trim())

  if (cities.length === 0) {
    console.error('Invalid cities argument - please provide a list of cities to analyze or "all" as the fourth parameter')
    process.exit(1)
  } else if (cities.includes('all')) {
    cities = availableCities
  } else {
    // Check that all cities are valid
    cities.forEach(city => {
      if (!availableCities.includes(city)) {
        console.error(`Invalid city: ${city} - cities must be one of: ${availableCities.join(', ')} or "all"`)
        process.exit(1)
      }
    })
  }

  console.log(chalk.yellow(`Cities: ${cities.join(', ')}`))

  return {
    startDate: startDate,
    endDate: endDate,
    headless: headless,
    cities: cities
  }

}
