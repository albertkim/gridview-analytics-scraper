import { getGPTBaseRezoningQuery } from '../../AIUtilities'

// Vancouver unfortunately has no unique identifiers for rezonings,
export function getVancouverBaseGPTQuery(content: string) {
  const baseRezoningIdQuery = 'null'
  return getGPTBaseRezoningQuery(content, {
    rezoningId: baseRezoningIdQuery
  })
}
