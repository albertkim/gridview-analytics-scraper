import chalk from 'chalk'
import { IRezoningDetail, RezoningsRepository } from '../repositories/RezoningsRepository'

// Get a birds-eye view of the rezoning data
export async function getStatistics() {

  const rezonings = RezoningsRepository.getRezonings()

  console.log()

  printStatistic('Total rezonings', getCountPerCity(rezonings))
  printStatistic('Rezoning date errors', getDateErrorsPerCity(rezonings))
  printStatistic('Rezoning URL date errors', getURLDateErrosPerCity(rezonings))

}

function printStatistic(title: string, data: any[]) {
  console.log(chalk.bgWhite(title))
  data.forEach((item) => {
    console.log(item)
  })
  console.log()
}

function getCountPerCity(rezonings: IRezoningDetail[]) {

  const countPerCity = rezonings.reduce<Record<string, number>>((acc, obj) => {
    acc[obj.city] = (acc[obj.city] || 0) + 1
    return acc
  }, {})
  
  const result: {city: string, count: number}[] = Object.keys(countPerCity).map(city => ({
    city,
    count: countPerCity[city]
  }))

  return result

}

interface ICityDateUrlErrors {
  city: string
  emptyDates: number
}

function getURLDateErrosPerCity(rezonings: IRezoningDetail[]) {

  const results: ICityDateUrlErrors[] = []

  // For each city, count the number of rezonings where the a url entry does not have a date
  const cities = [...new Set(rezonings.map(rezoning => rezoning.city))]

  for (const city of cities) {
    const rezoningsInCity = rezonings.filter(rezoning => rezoning.city === city)
    const emptyDates = rezoningsInCity.filter(rezoning => rezoning.urls.some(url => !url.date)).length
    results.push({
      city,
      emptyDates
    })
  }

  return results

}

interface ICityErrors {
  city: string
  appliedDateErrors: number
  pendingDateErrors: number
  publicHearingDateErrors: number
  approvedDateErrors: number
  deniedDateErrors: number
  withdrawnDateErrors: number
}

function getDateErrorsPerCity(rezonings: IRezoningDetail[]) {

  const results: ICityErrors[] = []

  // For each city, count the number of rezonings where the status does not have a matching date (ex. IRezoningDetail.status applied should have a valid YYYY-MM-DD date in IRezoningDetail.dates.appliedDate)
  const cities = [...new Set(rezonings.map(rezoning => rezoning.city))]

  for (const city of cities) {

    const rezoningsInCity = rezonings.filter(rezoning => rezoning.city === city)

    const appliedDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'applied' && !rezoning.dates.appliedDate).length
    const pendingDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'pending' && !rezoning.dates.appliedDate).length
    const publicHearingDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'public hearing' && !rezoning.dates.publicHearingDate).length
    const approvedDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'approved' && !rezoning.dates.approvalDate).length
    const deniedDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'denied' && !rezoning.dates.denialDate).length
    const withdrawnDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'withdrawn' && !rezoning.dates.withdrawnDate).length

    results.push({
      city,
      appliedDateErrors,
      pendingDateErrors,
      publicHearingDateErrors,
      approvedDateErrors,
      deniedDateErrors,
      withdrawnDateErrors
    })

  }

  return results

}
