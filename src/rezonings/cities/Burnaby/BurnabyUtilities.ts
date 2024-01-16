import { getGPTBaseRezoningQuery } from '../../AIUtilities'

export function getBurnabyBaseGPTQuery(content: string) {
  const baseRezoningIdQuery = 'ID in the format of "RZ 12-123456", usually in the brackets - correct the format if necessary - null if not found'
  return getGPTBaseRezoningQuery(content, {
    rezoningId: baseRezoningIdQuery
  })
}

export function cleanBurnabyRezoningId(rezoningId: string | null): string | null {
  // Only get letters/numbers/# symbol, and if there are 8 digits in total where the first 2 digits are REZ, return the formatted rezoning ID of REZ #12-12, otherwise return null
  if (!rezoningId) {
    return null
  }

  const cleanedId = rezoningId.trim().replace(/[^a-zA-Z0-9#]/g, '')

  if (cleanedId.length === 8 && cleanedId.startsWith('REZ')) {
    return `${cleanedId.substring(0, 3)} ${cleanedId.substring(3, 6)}-${cleanedId.substring(6, 8)}`
  } else {
    return null
  }
}