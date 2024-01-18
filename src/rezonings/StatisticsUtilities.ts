import chalk from 'chalk'
import similarity from 'similarity'
import { IFullRezoningDetail, RezoningsRepository } from '../repositories/RezoningsRepository'
import { IMeetingDetail, RawRepository } from '../repositories/RawRepository'
import moment from 'moment'

// Get a birds-eye view of the rezoning data
export async function getStatistics() {

  const news = RawRepository.getNews()
  const rezonings = RezoningsRepository.getRezonings()

  console.log()

  printStatistic('Total news', getNewsCountPerCity(news))
  printStatistic('Total rezonings', getRezoningCountPerCity(rezonings))
  printStatistic('Similar addresses', getSimilarAddresses(rezonings, 0.7))
  printStatistic('Addresses without coordinates', getCoordinateErrorsPerCity(rezonings))
  printStatistic('Rezoning date errors', getDateErrorsPerCity(rezonings))
  printStatistic('Rezoning URL date errors', getURLDateErrorsPerCity(rezonings))

}

function printStatistic(title: string, data: any[]) {
  console.log(chalk.bgWhite(title))
  data.forEach((item) => {
    console.log(item)
  })
  console.log()
}

function getNewsCountPerCity(news: IMeetingDetail[]) {

  const countPerCity = news.reduce<Record<string, number>>((acc, obj) => {
    acc[obj.city] = (acc[obj.city] || 0) + 1
    return acc
  }, {})

  const dateRanges = news.reduce<Record<string, {earliest: string, latest: string}>>((acc, obj) => {
    if (!acc[obj.city]) {
      acc[obj.city] = {
        earliest: obj.date,
        latest: obj.date
      }
    } else {
      // Use moment instead of Date for comparisons
      if (moment(obj.date).isBefore(acc[obj.city].earliest)) {
        acc[obj.city].earliest = obj.date
      } else if (moment(obj.date).isAfter(acc[obj.city].latest)) {
        acc[obj.city].latest = obj.date
      }
    }
    return acc
  }, {})
  
  const result: {city: string, count: number}[] = Object.keys(countPerCity).map(city => ({
    city,
    count: countPerCity[city],
    earliestDate: dateRanges[city].earliest,
    latestDate: dateRanges[city].latest
  }))

  return result

}

function getRezoningCountPerCity(rezonings: IFullRezoningDetail[]) {

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

function getURLDateErrorsPerCity(rezonings: IFullRezoningDetail[]) {

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

// For every address, use the similarity library to find addresses that are similar, then return matching addresses with minimum score
function getSimilarAddresses(rezonings: IFullRezoningDetail[], similarityScore: number) {

  const results: {city: string, address: string, similarAddresses: {address: string, similarity: number}[]}[] = []

  rezonings.forEach((rezoning, index) => {

    const numbersInAddress = (rezoning.address || '').match(/\d+/g)

    if (!numbersInAddress) {
      return
    }

    const otherRezonings = [...rezonings.slice(0, index), ...rezonings.slice(index + 1)]
    const otherRezoningsInCity = otherRezonings.filter(otherRezoning => otherRezoning.city === rezoning.city)

    const rezoningsWithMatchingNumbers = otherRezoningsInCity
      .filter(otherRezoning => {
        const otherNumbersInAddress = (otherRezoning.address || '').match(/\d+/g)
        if (!otherNumbersInAddress) {
          return false
        }
        return otherNumbersInAddress.every(otherNumber => numbersInAddress!.includes(otherNumber))
      })
      .map(otherRezoning => {
        return {
          address: otherRezoning.address,
          similarity: similarity(rezoning.address, otherRezoning.address)
        }
      })
      .filter(otherRezoning => otherRezoning.similarity > similarityScore)

    if (rezoningsWithMatchingNumbers.length > 0) {
      results.push({
        city: rezoning.city,
        address: rezoning.address,
        similarAddresses: rezoningsWithMatchingNumbers
      })
    }

  })

  return results

}

function getCoordinateErrorsPerCity(rezonings: IFullRezoningDetail[]) {
  const results: {city: string, count: number}[] = []

  const cities = [...new Set(rezonings.map(rezoning => rezoning.city))]

  for (const city of cities) {
    const rezoningsInCity = rezonings.filter(rezoning => rezoning.city === city)
    const count = rezoningsInCity.filter(rezoning => !rezoning.location.latitude || !rezoning.location.longitude).length
    results.push({
      city,
      count
    })
  }

  return results
}

interface ICityErrors {
  city: string
  appliedDateErrors: number
  publicHearingDateErrors: number
  approvedDateErrors: number
  deniedDateErrors: number
  withdrawnDateErrors: number
}

function getDateErrorsPerCity(rezonings: IFullRezoningDetail[]) {

  const results: ICityErrors[] = []

  // For each city, count the number of rezonings where the status does not have a matching date (ex. IRezoningDetail.status applied should have a valid YYYY-MM-DD date in IRezoningDetail.dates.appliedDate)
  const cities = [...new Set(rezonings.map(rezoning => rezoning.city))]

  for (const city of cities) {

    const rezoningsInCity = rezonings.filter(rezoning => rezoning.city === city)

    const appliedDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'applied' && !rezoning.dates.appliedDate).length
    const publicHearingDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'public hearing' && !rezoning.dates.publicHearingDate).length
    const approvedDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'approved' && !rezoning.dates.approvalDate).length
    const deniedDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'denied' && !rezoning.dates.denialDate).length
    const withdrawnDateErrors = rezoningsInCity.filter(rezoning => rezoning.status === 'withdrawn' && !rezoning.dates.withdrawnDate).length

    results.push({
      city,
      appliedDateErrors,
      publicHearingDateErrors,
      approvedDateErrors,
      deniedDateErrors,
      withdrawnDateErrors
    })

  }

  return results

}
