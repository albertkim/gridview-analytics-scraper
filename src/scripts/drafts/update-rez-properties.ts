// Update rezoning properties to accommodate development permit data - and update other properties as well
  // Update field: type => buildingType
  // New field: type (can be one of "rezoning" or "development permit")
  // Update field: urls => reportUrls (more reflective of the contents)
  // Update field: reportUrls.type => reportUrls.status (want to not use "type" anymore if possible)
  // Update field: minutesUrls.type => minutesUrls.status
  // Update field: rezoningId => applicationId (more general purpose and supports rezonings and development permits)

import { RezoningsRepository } from '../../repositories/RezoningsRepository'

(async () => {

  const rezonings = RezoningsRepository.getRezonings() as any[]

  const updatedRezonings = rezonings.map((rezoning) => {
    const updatedRezoning = {
      ...rezoning,
      type: 'rezoning',
      buildingType: rezoning.type,
      reportUrls: rezoning.urls.map((reportUrl: any) => {
        return {
          title: reportUrl.title,
          url: reportUrl.url,
          date: reportUrl.date,
          status: reportUrl.type
        }
      }),
      minutesUrls: rezoning.minutesUrls.map((minutesUrl: any) => {
        return {
          url: minutesUrl.url,
          date: minutesUrl.date,
          status: minutesUrl.type
        }
      })
    }
    return updatedRezoning
  })

  RezoningsRepository.dangerouslyUpdateAllRezonings(updatedRezonings)

})()
