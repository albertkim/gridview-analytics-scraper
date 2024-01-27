import { RezoningsRepository } from '../../repositories/RezoningsRepository'

(async () => {

  const rezonings = RezoningsRepository.getRezonings({city: 'Surrey'})

  for (const rezoning of rezonings) {

    // approved
    if (rezoning.status === 'approved' && rezoning.dates.approvalDate === null) {
      const matchingApprovedDate = rezoning.minutesUrls.find(url => url.type === 'approved')
      if (matchingApprovedDate) {
        rezoning.dates.approvalDate = matchingApprovedDate.date
      }
    }

    // same for public hearing
    if (rezoning.status === 'public hearing' && rezoning.dates.publicHearingDate === null) {
      const matchingPublicHearingDate = rezoning.minutesUrls.find(url => url.type === 'public hearing')
      if (matchingPublicHearingDate) {
        rezoning.dates.publicHearingDate = matchingPublicHearingDate.date
      }
    }

    // same for denied
    if (rezoning.status === 'denied' && rezoning.dates.denialDate === null) {
      const matchingDeniedDate = rezoning.minutesUrls.find(url => url.type === 'denied')
      if (matchingDeniedDate) {
        rezoning.dates.denialDate = matchingDeniedDate.date
      }
    }

    // same for withdrawn
    if (rezoning.status === 'withdrawn' && rezoning.dates.withdrawnDate === null) {
      const matchingWithdrawalDate = rezoning.minutesUrls.find(url => url.type === 'withdrawn')
      if (matchingWithdrawalDate) {
        rezoning.dates.withdrawnDate = matchingWithdrawalDate.date
      }
    }
  
  }

  RezoningsRepository.dangerouslyUpdateRezonings('Surrey', rezonings)

})()
