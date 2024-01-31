import { RecordsRepository } from '../repositories/RecordsRepository'
import { visualizeMonthlyEntries } from './ScriptUtilities'

function printNonSingleFamilyHomeRezoningApproval(city: string) {
  const entries = RecordsRepository.getRecords('rezoning', {city: city})
    .filter((m) => m.buildingType !== 'single-family residential' && m.buildingType !== 'other')
    .map((r) => r.minutesUrls).flat()
    .filter((m) => ['applied'].includes(m.status))
  visualizeMonthlyEntries(`${city} rezoning bylaw approvals (not including single-family)`, entries.map((b) => {
    return {date: b.date}
  }))
}

(async () => {

  printNonSingleFamilyHomeRezoningApproval('Vancouver')
  printNonSingleFamilyHomeRezoningApproval('Burnaby')
  printNonSingleFamilyHomeRezoningApproval('Richmond')
  printNonSingleFamilyHomeRezoningApproval('Surrey')

})()
