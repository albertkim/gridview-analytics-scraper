import { getGPTBaseRezoningQuery } from '../../AIUtilities'

export function getSurreyBaseGPTQuery(content: string) {
  const baseRezoningIdQuery = 'in the format of XXXX-XXXX-XX where Xs are numbers'
  return getGPTBaseRezoningQuery(content, {
    rezoningId: baseRezoningIdQuery
  })
}
