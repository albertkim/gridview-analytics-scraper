import { getGPTBaseRezoningQuery } from '../../../utilities/AIUtilities'

export function getSurreyBaseGPTQuery(content: string) {
  const baseRezoningIdQuery = 'in the format of XXXX-XXXX-XX where Xs are numbers'
  return getGPTBaseRezoningQuery(content, {
    applicationId: baseRezoningIdQuery
  })
}

export function getSurreyBylawGPTQuery(content: string) {
  const introduction = 'Read the provided document, identify if the decision appears to be final (ex. amended, adopted, etc.), and if so and give me the following in a JSON format - otherwise return a {error: message, reason: string}. Conditional decisions (ex. 1st, 2nd, 3rd reading) should return an error. These decisions are usually final but not always.'
  const baseRezoningIdQuery = 'in the format of XXXX-XXXX-XX where Xs are numbers'
  const status = 'one of approved, denied, or withdrawn'
  return getGPTBaseRezoningQuery(content, {
    introduction: introduction,
    applicationId: baseRezoningIdQuery,
    status: status
  })
}

// Returns the first instance of a development ID in the form of XXXX-XXXX-XX where Xs are numbers
export function getSurreyDevelopmentID(content: string) {
  const developmentIDRegex = /\d{4}-\d{4}-\d{2}/
  const developmentID = content.match(developmentIDRegex)
  if (developmentID) {
    return developmentID[0]
  } else {
    return null
  }
}
