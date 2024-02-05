import { findApplicationIDsFromTemplate } from '../../utilities/RegexUtilities'

(() => {

  const template = "DP XX-XXXXXX"
  const content = `
    this IS A TEST with DP
    12-123456 with more info following up
  `

  const result = findApplicationIDsFromTemplate(template, content)
  console.log(result)

})()
