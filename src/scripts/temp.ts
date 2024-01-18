import moment from 'moment'
import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { parseApplication } from '../rezonings/cities/Vancouver/Applications'

(async () => {

  const rezonings = RezoningsRepository.getRezonings()
  const noVanccouverRezonings = rezonings.filter((rezoning) => rezoning.city !== 'Vancouver')
  RezoningsRepository.dangerouslyUpdateAllRezonings(noVanccouverRezonings)

})()
