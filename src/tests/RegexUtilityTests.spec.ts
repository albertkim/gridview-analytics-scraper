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

test('Find Richmond permit number from real content', () => {

  const realContent = `"City of Richmond Development Permit Panel Report\nDate: November 22, 2023\nFile: DP 23-025993\nRe: Application by Anthony Boni for a Development Permit at 4831 Steveston Highway\n\nStaff Recommendation:\n1. Issue a Development Permit for the construction of a three-storey 25-unit affordable rental housing building at 4831 Steveston Highway.\n2. Allow 37% of the required vehicle parking spaces to be small car spaces.\n\nBackground:\n- Anthony Boni has applied to develop a three-storey 25-unit affordable rental housing building at 4831 Steveston Highway.\n- The site is currently vacant and owned by the City of Richmond.\n- The proposed project has funding support from the Canada Mortgage and Housing Corporation (CMHC) and BC Housing in partnership with Turning Point Housing Society.\n- The site is being rezoned from \"Single Detached (RS 1/E)\" to \"Low Rise Rental Apartments (ZLR48) - Steveston Highway (Steveston)\" under Bylaw 10478 (RZ 23-018081).\n- A Servicing Agreement is required for the building permit issuance.\n\nDevelopment Information:\n- Please refer to the attached Development Application Data Sheet for a comparison of the proposed development data with the relevant Bylaw requirements.\n\nRezoning and Public Hearing Results:\n- Design issues identified during the rezoning process include compliance with Development Permit Guidelines, enhancing residential streetscape, refining the site plan for aboveground private utility infrastructure improvements, landscaping and tree management, common amenity space programming and design, accessibility, pedestrian circulation, sustainability, crime prevention through environmental design, parking, loading, waste management, and off-site frontage elements.\n- Concerns expressed during the Public Hearing include direct connection to the Railway Greenway and providing more bicycle parking opportunities for residents.\n- Staff have worked with the applicant to ensure the proposed architectural form and character align with design guidelines and interface well with adjacent properties.\n"`

  const template = 'DP XX-XXXXXX'

  const result = findApplicationIDsFromTemplate(template, realContent)

  expect(result).toHaveLength(1)
  expect(result[0]).toBe('DP 23-025993')

})
