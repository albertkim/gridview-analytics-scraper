import { RecordsRepository } from '../repositories/RecordsRepositoryV2'
import { visualizeMonthlyEntries } from './ScriptUtilities'

const recordsRepository = new RecordsRepository('final')

function printNonSingleFamilyHomeRezoningApproval(city: string) {
  const entries = recordsRepository.getRecords('rezoning', {city: city})
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
