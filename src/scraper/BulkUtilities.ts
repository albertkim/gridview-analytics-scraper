import moment from 'moment'

export async function runPromisesInBatches<T>(promiseFunctions: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(promiseFunctions.length)
  let executing: Promise<void>[] = []

  const processPromise = async (promiseFunction: () => Promise<T>, index: number) => {
    results[index] = await promiseFunction()
  }

  for (let i = 0; i < promiseFunctions.length; i++) {
    const promiseFunction = promiseFunctions[i]

    const p = processPromise(promiseFunction, i).then(() => {
      executing = executing.filter(v => v !== p)
    })

    executing.push(p)

    if (executing.length >= limit) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results
}

export function formatDateString(dateString: string) {
  const date = new Date(dateString)
  const momentDate = moment(date)
  return momentDate.utc().format('YYYY-MM-DD')
}

export function cleanString(content: string | null): string {
  if (!content) return ''
  const cleanedString = content
    .replace('\r\n', '\n') // Replace Windows newlines with Unix newlines
    .replace('\t', '') // Replace tabs with spaces
    .replace('\\t', ' ') // Replace escaped tabs with spaces
    .split('\n')
    .map(line => line.trim().replace(/\s+/g, ' ')) // Remove consecutive spaces
    .join('\n')
    .replace(/\n+/g, '\n') // Remove consecutive newlines
  return cleanedString
}
