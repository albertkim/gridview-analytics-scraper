import { downloadPDF, parsePDF } from '../../../utilities/PDFUtilities'

export interface ISurreyMeetingItems {
  section: string
  resolutionId: string | null
  status: string | null
  title: string
  content: string
  url: string
}

// Council Public Hearing sample meeting sections
  // A. ADOPTION OF MINUTES 
  // B. DELEGATION -PRESENTATION 
  // C. COMMITTEE REPORTS
  // D. BOARD/COMMISSION REPORTS
  // E. MAYOR’S REPORT
  // F. COUNCILLORS' REPORTS
  // G. CORPORATE REPORTS
  // H. BYLAWS AND PERMITS
  // I. CLERK’S REPORT
  // J. NOTICE OF MOTION
  // K. OTHER BUSINESS
  // L. ADJOURNMENT

// Council Land Use sample meeting sections
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

const sectionWordsToIgnore = ['adoption', 'correspondence', 'clerk', 'other business', 'adjournment']

// Call this on a big Surrey public hearing PDF and get partially organized data that you can parse with LLMs
export async function parseSurreyMeetingMinutes(pdfUrl: string): Promise<ISurreyMeetingItems[]> {

  let pdfData: Buffer
  let parsed: string

  try {
    pdfData = await downloadPDF(pdfUrl)
    parsed = await parsePDF(pdfData)
  } catch (error) {
    console.error(error)
    return []
  }

  // Find all instances of RES.RXX-XXXX and read the lines

  // Clean the PDF text

  // Remove consecutive spaces
  parsed = parsed.replace(/  +/g, ' ')

  // Split the text by sections where the section titles are in the format of "X. TITLE" where X is a single capital letter, there may be multiple spaces after the period, and TITLE may be multiple words that are all capitalized
  const results: ISurreyMeetingItems[] = []

  // Split everything by new line, and find the sections
  const lines = parsed.split('\n').map((line) => line.trim())

  // Find the line indexes that match the format of "X. TITLE" where X is a single capital letter, there may be multiple spaces after the period, and TITLE may be multiple words that are all capitalized and dashes
  const sectionIndexes: number[] = []
  lines.forEach((line, index) => {
    if (line.match(/^[A-Z]\. +[A-Z -]+$/)) {
      sectionIndexes.push(index)
    }
  })

  const sections: {sectionTitle: string, sectionContents: string}[] = []

  for (let i = 0; i < sectionIndexes.length; i++) {

    const sectionIndex = sectionIndexes[i]
    const nextSectionIndex = sectionIndexes[i + 1]
    const sectionTitle = lines[sectionIndex]
    const sectionContent = lines.slice(sectionIndex + 1, nextSectionIndex).map((line) => line.trim()).join('\n').trim()

    if (sectionWordsToIgnore.some((word) => sectionTitle.toLowerCase().includes(word))) continue

    sections.push({
      sectionTitle: sectionTitle,
      sectionContents: sectionContent
    })

  }

  // NOTE: There are 2 types of sections. One type is split up into resolutions (RES.RXX-XXXX), and the other is split by numbered list items (1. Title, 2. Title, etc.)

  for (const section of sections) {
    const resolutionItems = splitResolutions(pdfUrl, section.sectionTitle, section.sectionContents)
    if (resolutionItems.length > 0) {
      results.push(...resolutionItems)
    } else {
      const numberedItems = splitNumberedList(pdfUrl, section.sectionTitle, section.sectionContents)
      results.push(...numberedItems)
    }
  }

  return results

}

// Split by "RES.RXX-XXXX"
function splitResolutions(pdfUrl: string, sectionTitle: string, sectionContent: string): ISurreyMeetingItems[] {

  const results: ISurreyMeetingItems[] = []

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
  // Get the content up to each resIndex from resLines
  resIndexes.forEach((resIndex, index) => {
    const start = index === 0 ? 0 : resIndexes[index - 1] + 1
    const resContent = resLines.slice(start, resIndex)
    const matches = resLines[resIndex].match(resolutionIdRegex)
    if (matches) {
      const resolutionId = matches[1]
      const status = matches[2]
      results.push({
        section: sectionTitle,
        resolutionId: resolutionId,
        status: status,
        title: `${sectionTitle}: ${resolutionId} - Status: ${status}`,
        content: resContent.join('\n').trim(),
        url: pdfUrl
      })
    }
  })

  return results

}

// Split by 1. Title, 2. Title, 3. Title etc.
function splitNumberedList(pdfUrl: string, sectionTitle: string, sectionContent: string): ISurreyMeetingItems[] {

  const results: ISurreyMeetingItems[] = []

  // Split by "RES.RXX-XXXX" where X is a number and make sure it's the only entry on the line
  const resLines = sectionContent.split('\n').map((line) => line.trim())
  const resIndexes: number[] = []

  let currentNumberedItem = 1

  for (let i = 0; i < resLines.length; i++) {
    const line = resLines[i]
    // Regex that checks that the line starts with currentNumberedItem then a period and a space
    const matches = line.match(new RegExp(`^\\b${currentNumberedItem}\\.\ `))
    if (matches) {
      resIndexes.push(i)
      currentNumberedItem++
    }
  }

  // Get the content from each resIndex from resLines
  resIndexes.forEach((resIndex, index) => {
    const start = resIndex
    const end = index === resIndexes.length - 1 ? undefined : resIndexes[index + 1]
    const resContent = resLines.slice(start, end)
    if (resContent) {
      results.push({
        section: sectionTitle,
        resolutionId: null,
        status: null,
        title: `${sectionTitle}: ${resContent[0]}`,
        content: resContent.join('\n').trim(),
        url: pdfUrl
      })
    }
  })

  return results

}
