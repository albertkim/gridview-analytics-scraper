import { RezoningsRepository } from '../repositories/RezoningsRepository'

(async () => {

  const rezonings = RezoningsRepository.getRezonings({city: 'Richmond'})
  rezonings.forEach((rezoning) => {
    rezoning.urls = rezoning.urls.filter((url) => url.type !== 'approved')
  })
  RezoningsRepository.dangerouslyUpdateRezonings('Richmond', rezonings)

})()
