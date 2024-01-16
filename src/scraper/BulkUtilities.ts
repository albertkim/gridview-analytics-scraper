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
