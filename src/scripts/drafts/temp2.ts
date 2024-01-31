import { RawRepository } from '../../repositories/RawRepository'
import { RecordsRepository } from '../../repositories/RecordsRepository'
import { parseBylaw } from '../../rezonings/cities/Vancouver/Bylaws'

(async () => {

  // Clear all Vancouver news and re-scrape
  RawRepository.dangerouslyUpdateNews('Vancouver', [])

})()
