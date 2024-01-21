import { RawRepository } from '../../repositories/RawRepository'
import { RezoningsRepository } from '../../repositories/RezoningsRepository'
import { parseBylaw } from '../../rezonings/cities/Vancouver/Bylaws'

(async () => {

  // Clear all Vancouver news and re-scrape
  RawRepository.dangerouslyUpdateNews('Vancouver', [])

})()
