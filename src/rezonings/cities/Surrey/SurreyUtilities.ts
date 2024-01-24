import { downloadPDF, parsePDF } from '../../PDFUtilities'

export interface ISurreyLandUseMinutesItems {
  section: string
  resolutionId: string
  status: string
  content: string
  url: string
}

// Potential sections (main items led with a X. where X is a letter)
  // ADOPTION OF THE AGENDA
  // LAND USE APPLICATIONS
  // ADDITIONAL PLANNING COMMENTS
  // ITEMS REFERRED BACK
  // CORPORATE REPORTS
  // CORRESPONDENCE
  // NOTICE OF MOTION
  // BYLAWS AND PERMITS
    // BYLAWS WITH PERMITS
    // PERMITS - APPROVALS
    // BYLAWS WITH PERMITS (Continued)
  // CLERKS REPORT
  // OTHER BUSINESS
  // ADJOURNMENT

// Call this on a big Surrey and get partially organized data that you can parse with LLMs
export async function getSurreyLandUseMinutes(pdfUrl: string): Promise<ISurreyLandUseMinutesItems[]> {

  const pdfData = await downloadPDF(pdfUrl)
  let parsed = await parsePDF(pdfData)

  // Find all instances of RES.RXX-XXXX and read the lines

  // Clean the PDF text

  // Remove consecutive spaces
  parsed = parsed.replace(/  +/g, ' ')

  // Split the text by sections where the section titles are in the format of "X. TITLE" where X is a single capital letter, there may be multiple spaces after the period, and TITLE may be multiple words that are all capitalized
  const results: ISurreyLandUseMinutesItems[] = []

  // Split everything by new line, and find the sections
  const lines = parsed.split('\n').map((line) => line.trim())

  // Find the line indexes that match the format of "X. TITLE" where X is a single capital letter, there may be multiple spaces after the period, and TITLE may be multiple words that are all capitalized
  const sectionIndexes: number[] = []
  lines.forEach((line, index) => {
    if (line.match(/^[A-Z]\. +[A-Z ]+$/)) {
      sectionIndexes.push(index)
    }
  })

  // Add section section and the content for each section to the sections array
  for (let i = 0; i < sectionIndexes.length; i++) {

    const sectionIndex = sectionIndexes[i]
    const nextSectionIndex = sectionIndexes[i + 1]
    const sectionTitle = lines[sectionIndex]
    const sectionContent = lines.slice(sectionIndex + 1, nextSectionIndex).map((line) => line.trim()).join('\n')

    const resolutionIdRegex = /(RES\.R[\d-]+)\s+(\w+)/

    // Split by "RES.RXX-XXXX" where X is a number and make sure it's the only entry on the line
    const resLines = sectionContent.split('\n').map((line) => line.trim())
    const resIndexes: number[] = []
    resLines.forEach((line, index) => {
      const matches = line.match(resolutionIdRegex)
      if (matches) {
        resIndexes.push(index)
      }
    })
    // Get the content up to each resIndex from resLines and put into section.parsed
    resIndexes.forEach((resIndex, index) => {
      const start = index === 0 ? 0 : resIndexes[index - 1] + 1
      const resContent = resLines.slice(start, resIndex)
      const matches = resLines[resIndex].match(resolutionIdRegex)
      if (matches) {
        results.push({
          section: sectionTitle,
          resolutionId: matches[1],
          status: matches[2],
          content: resContent.join('\n'),
          url: pdfUrl
        })
      }
    })

  }

  return results

}
