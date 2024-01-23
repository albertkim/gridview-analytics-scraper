import fs from 'fs'
import path from 'path'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'

(async () => {

  const pdfUrl = 'https://www.surrey.ca/sites/default/files/minutes/MIN_RCLU_2023_12_18.pdf'

  const pdfData = await downloadPDF(pdfUrl)
  let parsed = await parsePDF(pdfData)

  // Find all instances of RES.RXX-XXXX and read the lines

  fs.writeFileSync(path.join(__dirname, 'parse-pdf.txt'), parsed)

  // Clean the PDF text

  // Remove consecutive spaces
  parsed = parsed.replace(/  +/g, ' ')

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

  // Split the text by sections where the section titles are in the format of "X. TITLE" where X is a single capital letter, there may be multiple spaces after the period, and TITLE may be multiple words that are all capitalized
  const sections: {section: string, content: string}[] = []

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
    const sectionContent = lines.slice(sectionIndex + 1, nextSectionIndex)
    sections.push({
      section: sectionTitle,
      content: sectionContent.join('\n')
    })
  }

  // For each section remove leading/trailing newlines
  sections.forEach((section) => {
    section.content = section.content.trim()
  })

  fs.writeFileSync(path.join(__dirname, 'parse-pdf.json'), JSON.stringify(sections, null, 2))

})()
