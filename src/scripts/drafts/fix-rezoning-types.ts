import { RezoningsRepository, ZoningTypeValues } from '../../repositories/RezoningsRepository'

(async () => {

  const rezonings = RezoningsRepository.getRezonings()

  for (const rezoning of rezonings) {
    if (rezoning.type && !ZoningTypeValues.includes(rezoning.type)) {
      // Invalid type. Re-calculate with GPT
      // TODO
    }
  }

})()
