import { findApplicationIDsFromTemplate } from '../utilities/RegexUtilities'

test('Check that regex utility function works with newline splits', () => {

  const template = "DP XX-XXXXXX"
  const content = `
    this IS A TEST with DP
    12-123456 with more info following up
  `

  const result = findApplicationIDsFromTemplate(template, content)

  expect(result).toHaveLength(1)
  expect(result[0]).toBe('DP 12-123456')

})

test('Check that regex utility function works with no spaces', () => {

  const template = "DP XX-XXXXXX"
  const content = `
    this IS A TEST with DP12-123456 with more info following up
  `

  const result = findApplicationIDsFromTemplate(template, content)

  expect(result).toHaveLength(1)
  expect(result[0]).toBe('DP 12-123456')

})

test('Check that regex utility works with multiple entries and # characters', () => {

  const template = 'RES #XX-XXXXXX'
  const content = `
    this is a TEST with RES
    #12-123456 and more info on RES #12
    -999999
  `

  const result = findApplicationIDsFromTemplate(template, content)

  expect(result).toHaveLength(2)
  expect(result[0]).toBe('RES #12-123456')
  expect(result[1]).toBe('RES #12-999999')

})

test('Check that only unique instances are returned', () => {

  const template = 'RES #XX-XXXXXX'
  const content = `
    this is a TEST with RES
    #12-123456 and more info on RES #12
    -123456
  `

  const result = findApplicationIDsFromTemplate(template, content)

  expect(result).toHaveLength(1)
  expect(result[0]).toBe('RES #12-123456')

})
