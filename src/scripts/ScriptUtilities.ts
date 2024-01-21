import chalk from 'chalk'

// Purpose: Given an array of entries with a date in YYYY-MM-DD format, from 2019 - current year, render a graph of number of entries for each of the 12 months as a [x] if an entry exists or a [ ] if an entry does not exist
// Like this:
// 2022: [x] [x] [x] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]
// 2023: [ ] [ ] [ ] [ ] [ ] [ ] [x] [x] [ ] [ ] [ ] [ ]
export function visualizeMonthlyEntries(title: string, entries: {date: string}[]) {
  // Initialize an object to store counts for each month of each year
  const counts: Record<string, number[]> = {}

  // Process each entry
  entries.forEach(entry => {
    // Extract the year and month from the date
    const year = entry.date.substring(0, 4)
    const month = parseInt(entry.date.substring(5, 7))

    // Initialize the year in the counts object if not already present
    if (!counts[year]) {
      counts[year] = new Array(12).fill(0)
    }

    // Increment the count for the month
    counts[year][month - 1]++
  })

  // Construct the visualization string
  let visualization = ''
  Object.keys(counts).forEach(year => {
    let total = 0
    visualization += `${year}: `
    counts[year].forEach(count => {
      total += count
      // Format the count as two digits
      const formattedCount = count.toString().padStart(2, '0')
      visualization += `[${count > 0 ? chalk.green(formattedCount) : chalk.red(formattedCount)}] `
    })
    visualization += `| Total: ${total}`
    visualization += '\n'
  })

  console.log()
  console.log(chalk.bgWhite.black(title))
  console.log()
  console.log('      Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec')
  console.log(visualization)
}
