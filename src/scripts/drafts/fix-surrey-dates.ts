import { RecordsRepository } from '../../repositories/RecordsRepository'

(async () => {

  const rezonings = RecordsRepository.getRecords('rezoning', {city: 'Surrey'})

  for (const rezoning of rezonings) {

    // approved
    if (rezoning.status === 'approved' && rezoning.dates.approvalDate === null) {
      const matchingApprovedDate = rezoning.minutesUrls.find(url => url.status === 'approved')
      if (matchingApprovedDate) {
        rezoning.dates.approvalDate = matchingApprovedDate.date
      }
    }

    // same for public hearing
    if (rezoning.status === 'public hearing' && rezoning.dates.publicHearingDate === null) {
      const matchingPublicHearingDate = rezoning.minutesUrls.find(url => url.status === 'public hearing')
      if (matchingPublicHearingDate) {
        rezoning.dates.publicHearingDate = matchingPublicHearingDate.date
      }
    }

    // same for denied
    if (rezoning.status === 'denied' && rezoning.dates.denialDate === null) {
      const matchingDeniedDate = rezoning.minutesUrls.find(url => url.status === 'denied')
      if (matchingDeniedDate) {
        rezoning.dates.denialDate = matchingDeniedDate.date
      }
    }

    // same for withdrawn
    if (rezoning.status === 'withdrawn' && rezoning.dates.withdrawnDate === null) {
      const matchingWithdrawalDate = rezoning.minutesUrls.find(url => url.status === 'withdrawn')
      if (matchingWithdrawalDate) {
        rezoning.dates.withdrawnDate = matchingWithdrawalDate.date
      }
    }
  
  }

  RecordsRepository.dangerouslyReplaceRecords('rezoning', 'Surrey', rezonings)

})()
