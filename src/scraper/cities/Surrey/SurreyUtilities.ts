import { parsePDFAsRawArray } from '../../../utilities/PDFUtilitiesV2'
import { findApplicationIDsFromTemplate } from '../../../utilities/RegexUtilities'
import { cleanString } from '../../BulkUtilities'

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

  const parsed = cleanString((await parsePDFAsRawArray(pdfUrl)).join('\n'))

  const results: ISurreyMeetingItems[] = []

  // Split everything by new line, and find the sections
  const lines = parsed.split('\n').map((line) => line.trim())

  // Find the line indexes that match for format of X. TITLE where X is a single capital letter. The TITLE may be on the next line, but always fully capitalized, may contain dashes and symbols. Add the index of the next and not the letter prefix.
  const sectionIndexes: number[] = []

  lines.forEach((line, index) => {
    const matches = line.match(/^[A-Z\s\-$]+$/)
    if (matches) {
      // Now make sure that the previous line is a single capital letter with a dot
      const previousLine = lines[index - 1]
      if (previousLine) {
        const prefixRegex = /^\s*[A-Z]\.\s*$/
        const prefixMatch = previousLine.match(prefixRegex)
        if (prefixMatch) {
          sectionIndexes.push(index)
        }
      }
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

// Split by "RES.RXX-XX"
function splitResolutions(pdfUrl: string, sectionTitle: string, sectionContent: string): ISurreyMeetingItems[] {

  const results: ISurreyMeetingItems[] = []

  // Split by "RES.RXX-XX" where X is a number and make sure it's the only entry on the line
  const resLines = sectionContent.split('\n').map((line) => line.trim())
  const resIndexes: number[] = []
  resLines.forEach((line, index) => {
    const resolutionIds = findApplicationIDsFromTemplate('RES.RXX-XX', line)
    if (resolutionIds.length > 0) {
      resIndexes.push(index)
    }
  })

  // Get the content up to each resIndex from resLines
  resIndexes.forEach((resIndex, index) => {
    const start = index === 0 ? 0 : resIndexes[index - 1] + 1
    const resContent = resLines.slice(start, resIndex)
    const resolutionIds = findApplicationIDsFromTemplate('RES.RXX-XX', resLines[resIndex])
    if (resolutionIds.length > 0) {
      const resolutionId = resolutionIds[0]
      // The resolution status is on the next line
      const status = resLines[resIndex + 1]
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
