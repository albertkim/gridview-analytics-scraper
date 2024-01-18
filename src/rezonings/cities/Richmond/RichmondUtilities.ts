import { getGPTBaseRezoningQuery } from '../../AIUtilities'

export function getRichmondBaseGPTQuery(content: string) {
  const baseRezoningIdQuery = 'usually in the format "RZ XX-XXXXX" where the Xs are numbers - reformat if necessary - null if not found'
  return getGPTBaseRezoningQuery(content, {
    rezoningId: baseRezoningIdQuery
  })
}

export function cleanRichmondRezoningId(rezoningId: string | null): string | null {
  // Only get letters/numbers, and if there are 10 digits in total where the first 2 digits are RZ, return the formatted rezoning ID of RZ 12-123456, otherwise return null
  if (!rezoningId) {
    return null
  }

  const cleanedId = rezoningId.trim().replace(/[^a-zA-Z0-9]/g, '')

  if (cleanedId.length === 10 && cleanedId.startsWith('RZ')) {
    return `${cleanedId.substring(0, 2)} ${cleanedId.substring(2, 4)}-${cleanedId.substring(4)}`
  } else {
    return null
  }
}
