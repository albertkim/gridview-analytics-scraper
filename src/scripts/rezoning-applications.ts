import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { visualizeMonthlyEntries } from './ScriptUtilities'

function printNonSingleFamilyHomeRezoningApproval(city: string) {
  const entries = RezoningsRepository.getRezonings({city: city})
    .filter((m) => m.type !== 'single-family residential' && m.type !== 'other')
    .map((r) => r.minutesUrls).flat()
    .filter((m) => ['applied'].includes(m.type))
  visualizeMonthlyEntries(`${city} rezoning bylaw approvals (not including single-family)`, entries.map((b) => {
    return {date: b.date}
  }))
}

(async () => {

  printNonSingleFamilyHomeRezoningApproval('Vancouver')
  printNonSingleFamilyHomeRezoningApproval('Burnaby')
  printNonSingleFamilyHomeRezoningApproval('Richmond')

})()
