export function getGPTBaseRezoningQuery(document: string) {

  return `
    Read this document and give me the following in a JSON format:
    {
      address: address in question - if multiple addresses, comma separate
      applicant: who the rezoning applicant is - if behalf exists, do not mention behalf
      behalf: if the applicant is applying on behalf of someone else, who is it
      description: a description of the rezoning and what the applicant wants to build - be specific, include numerical metrics
      type: one of single-family residential, townhouse, mixed use, multi-family residential, industrial, commercial, or other
      stats: {
        buildings: your best guess as to the number of new buildings being proposed or null if unclear
        stratas: your best guess as to the total number of non-rental residential units/townhouses or null if unclear - default to assuming non-rental units
        rentals: total number of rental units or null if unclear - do not default to rental if not specified
        hotels: total number of hotel units or null if unclear - do not default to hotel if not specified
        fsr: total floor space ratio or null if unclear
        height: height in meters or null if unclear
      }
      zoning: {
        previousZoningCode: city zoning code before rezoning or null if unclear
        previousZoningDescription: best description of previous zoning code (ex. low density residential)
        newZoningCode: city zoning code after rezoning or null if unclear
        newZoningDescription: best description of new zoning code (ex. high density residential)
      }
      status: either applied, pending, public hearing, approved, denied, withdrawn
      dates: {
        appliedDate: if this is an application, the date of this document in YYYY-MM-DD or null if unclear
        publicHearingDate: if this is for a public hearing, the date of this public hearing in YYYY-MM-DD or null if unclear
        approvalDate: if this is an approval, the date of this approval in YYYY-MM-DD or null if unclear
        denialDate: if this is a denial, the date of this denial in YYYY-MM-DD or null if unclear
        withdrawnDate: if this is a withdrawal, the date of this withdrawal in YYYY-MM-DD or null if unclear
      }
    }
    If this document is not a rezoning related document, please reply with "not rezoning". Document here: ${document}
  `

}

export function getGPTBaseRezoningStatsQuery(description: string) {

  return `
    Given the following description, give me the following in a JSON format:
    {
      buildings: your best guess as to the number of new buildings being proposed or null if unclear - if it's a townhouse, default to 1 unless it's clear that there are multiple separated structures
      stratas: your best guess as to the total number of non-rental residential units/townhouses or null if unclear - default to assuming non-rental units
      rentals: total number of rental units or null if unclear - do not default to rental if not specified
      hotels: total number of hotel units or null if unclear - do not default to hotel if not specified
      fsr: total floor space ratio or null if unclear
      height: height in meters or null if unclear
    }
    Description here: ${description}
  `

}
