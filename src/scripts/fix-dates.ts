import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository } from '../repositories/RezoningsRepository'

(async () => {

  const news = RawRepository.getNews()
  const rezonings = RezoningsRepository.getRezonings()

  for (const rezoning of rezonings) {



  }

})()
